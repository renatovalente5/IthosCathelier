#!/usr/bin/env node
/* As guardas que correm DEPOIS da construção, sobre o que vai mesmo para o ar.
 *
 * As de antes olham para os dados; estas olham para o HTML. São coisas
 * diferentes, e já houve defeitos que só a segunda apanharia: quarenta e três
 * ligações internas mortas noutro projeto, deixadas por páginas removidas, que
 * nenhuma verificação viu porque nenhuma olhava para `href`.
 *
 *     node scripts/verificar-saida.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const SAIDA = join(RAIZ, 'publico');

// O BASE deriva DA MESMA FONTE que o gerador usa — o CNAME — e não de uma
// variável própria. Uma guarda que lê uma segunda versão da verdade envelhece
// sozinha e passa a acusar ficheiros que existem: aconteceu na primeira versão
// deste ficheiro, que declarou 113 problemas inexistentes porque o BASE que ela
// tinha não era o BASE com que o site tinha sido construído.
const cname = existsSync(join(RAIZ, 'CNAME'))
  ? readFileSync(join(RAIZ, 'CNAME'), 'utf8').trim()
  : '';
const BASE = process.env.BASE ?? (cname ? '' : '/IthosCathelier');

const erros = [];
const avisos = [];

if (!existsSync(SAIDA)) {
  console.error('não há publico/ — corre a construção primeiro');
  process.exit(1);
}

/* --- inventário ----------------------------------------------------------- */

function todos(pasta, ext) {
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) saida.push(...todos(caminho, ext));
    else if (nome.endsWith(ext)) saida.push(caminho);
  }
  return saida;
}

const paginas = todos(SAIDA, '.html');
if (paginas.length < 30) erros.push(`só ${paginas.length} páginas — esperava bastantes mais`);

/** Um endereço interno resolve para alguma coisa que vai ser servida?
 *  PERCENT-DECODE antes de procurar: um ficheiro com espaço ou acento no nome
 *  sai codificado no HTML e no disco chama-se outra coisa. Sem descodificar, a
 *  guarda acusa ficheiros que existem — e como tudo depende dela, nada vai ao ar. */
function existeNoSite(endereco) {
  let u = decodeURIComponent(endereco.split('#')[0].split('?')[0]);
  if (!u.startsWith('/')) return true;                 // relativo: não se usa aqui
  if (BASE && u.startsWith(BASE)) u = u.slice(BASE.length);
  const rel = u.replace(/^\//, '');
  if (rel === '' || rel.endsWith('/')) return existsSync(join(SAIDA, rel, 'index.html'));
  return existsSync(join(SAIDA, rel)) || existsSync(join(SAIDA, rel, 'index.html'));
}

/* --- ligações, imagens, cartões de partilha ------------------------------- */

const mortas = new Map();
for (const f of paginas) {
  const onde = relative(SAIDA, f);
  const html = readFileSync(f, 'utf8');

  for (const u of html.match(/href="[^"]+"/g)?.map((x) => x.slice(6, -1)) ?? []) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(u)) continue;
    if (!existeNoSite(u)) {
      if (!mortas.has(u)) mortas.set(u, []);
      mortas.get(u).push(onde);
    }
  }

  for (const attr of html.match(/(?:src|srcset)="[^"]+"/g) ?? []) {
    const valor = attr.slice(attr.indexOf('"') + 1, -1);
    for (const parte of valor.split(',')) {
      const u = parte.trim().split(/\s+/)[0];
      if (!u.startsWith('/') || !/\.(webp|avif|jpe?g|png|svg|woff2)$/.test(u)) continue;
      if (!existeNoSite(u)) erros.push(`${onde}: imagem inexistente ${u}`);
    }
  }

  // O og:image é a imagem que o WhatsApp mostra, e é por WhatsApp que uma loja
  // destas é partilhada. Não é apanhado pela verificação de `src`: vive num
  // `<meta content=>`.
  const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
  if (!og) erros.push(`${onde}: sem og:image`);
  else if (!existeNoSite(og.replace(/^https?:\/\/[^/]+/, ''))) {
    erros.push(`${onde}: og:image aponta para um ficheiro que não existe (${og})`);
  }

  if (!/rel="canonical" href="https?:\/\/[^"]+"/.test(html)) erros.push(`${onde}: sem canónico`);

  // Marcadores por resolver seriam publicados em texto literal.
  const marcador = /\{\{[A-Z_]+\}\}/.exec(html);
  if (marcador) erros.push(`${onde}: marcador por resolver ${marcador[0]}`);
  if (html.includes('⟨por preencher⟩')) {
    erros.push(`${onde}: ficou um «⟨por preencher⟩» — a construção correu com PERMITIR_INCOMPLETO`);
  }

  // Migalhas de pão: o `item` é obrigatório em todos os degraus menos o último.
  for (const bloco of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []) {
    const cru = bloco.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    let dados;
    try { dados = JSON.parse(cru); } catch (e) {
      erros.push(`${onde}: JSON-LD inválido (${e.message})`);
      continue;
    }
    for (const d of (Array.isArray(dados) ? dados : [dados])) {
      if (d?.['@type'] !== 'BreadcrumbList') continue;
      const itens = d.itemListElement ?? [];
      for (const i of itens.slice(0, -1)) {
        if (!i.item) erros.push(`${onde}: migalha «${i.name}» sem «item»`);
      }
    }
  }

  // Identificação do vendedor em TODAS as páginas — art. 10.º do DL 7/2004 diz
  // «permanentemente acessível», e é o rodapé que o cumpre.
  if (!html.includes('NIF ')) erros.push(`${onde}: o rodapé não mostra o NIF`);
  if (!html.includes('livroreclamacoes.pt')) erros.push(`${onde}: sem o Livro de Reclamações`);
  if (!/\(chamada para a rede móvel nacional\)/.test(html)) {
    erros.push(`${onde}: o número de telefone aparece sem o custo da chamada (DL 59/2021)`);
  }
  if (/ec\.europa\.eu\/consumers\/odr/.test(html)) {
    erros.push(`${onde}: menciona a plataforma ODR, desligada em 20/07/2025`);
  }
}

if (mortas.size) {
  erros.push(`${mortas.size} endereço(s) interno(s) morto(s):`);
  for (const [u, onde] of [...mortas].slice(0, 15)) {
    erros.push(`    ${u}  ← ${onde.length} página(s), ex.: ${onde[0]}`);
  }
}

/* --- cada produto publicado tem a SUA ficha -------------------------------
   Contar páginas não prova nada: um reencaminhamento também é um index.html, e
   noutro projeto a contagem deu certo com quarenta páginas a menos. Verifica-se
   o caminho exacto, e que lá está uma ficha e não um reencaminhamento. */

const produtos = readdirSync(join(RAIZ, 'conteudo', 'ithos')).filter((f) => f.endsWith('.json'));
let publicados = 0;
for (const f of produtos) {
  const slug = f.slice(0, -5);
  const p = JSON.parse(readFileSync(join(RAIZ, 'conteudo', 'ithos', f), 'utf8'));
  const alvo = join(SAIDA, 'ithos', 'candeeiros', slug, 'index.html');
  if (!p.publicado) {
    if (existsSync(alvo)) erros.push(`ithos/${slug}: está despublicado mas a página foi gerada`);
    continue;
  }
  publicados++;
  if (!existsSync(alvo)) { erros.push(`ithos/${slug}: publicado mas sem página`); continue; }
  const html = readFileSync(alvo, 'utf8');
  if (html.includes('http-equiv="refresh"')) erros.push(`ithos/${slug}: onde devia estar a ficha está um reencaminhamento`);
  // O preço e o estado TÊM de aparecer: se o modelo mudar e deixar de os
  // escrever, o site continua a construir-se e ninguém dá por isso.
  if (!html.includes('data-preco-mostrado')) erros.push(`ithos/${slug}: a ficha não mostra preço`);
  if (!/data-estado="(em_stock|por_encomenda|esgotado)"/.test(html)) {
    erros.push(`ithos/${slug}: a ficha não mostra a disponibilidade`);
  }
  // Cada ficha tem de trazer o bloco de segurança: art. 19.º do Reg. 2023/988.
  if (!html.includes('Segurança, materiais e conformidade')) {
    erros.push(`ithos/${slug}: a ficha não traz o bloco de segurança e conformidade`);
  }
  // O cartão de partilha é DA PEÇA. Já aconteceu, noutro projeto, mostrar a peça
  // anterior — e isso só se vê partilhando.
  const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? '';
  if (!og.includes(`/media/ithos/${slug}/`)) {
    erros.push(`ithos/${slug}: o cartão de partilha não é desta peça (${og})`);
  }
}

/* --- sitemap -------------------------------------------------------------- */

const sitemap = readFileSync(join(SAIDA, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of locs) {
  const caminho = loc.replace(/^https?:\/\/[^/]+/, '');
  if (!existeNoSite(caminho)) erros.push(`sitemap: anuncia ${loc}, que não existe`);
}
for (const privada of ['/carrinho/', '/encomenda/', '/obrigado/']) {
  if (locs.some((l) => l.endsWith(privada))) erros.push(`sitemap: não devia anunciar ${privada}`);
}
if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) erros.push('sitemap: sem datas de alteração');

/* --- páginas legais ------------------------------------------------------- */

const LEGAIS = ['identificacao', 'termos', 'privacidade', 'envios-e-devolucoes',
  'livre-resolucao', 'garantia', 'reclamacoes'];
for (const n of LEGAIS) {
  const alvo = join(SAIDA, 'legal', n, 'index.html');
  if (!existsSync(alvo)) { erros.push(`falta a página /legal/${n}/`); continue; }
  const html = readFileSync(alvo, 'utf8');
  const corpo = /<div class="prosa">([\s\S]*?)<\/article>/.exec(html)?.[1] ?? '';
  if (corpo.replace(/<[^>]+>/g, '').trim().length < 300) {
    erros.push(`/legal/${n}/: a página está praticamente vazia`);
  }
}
if (!existsSync(join(SAIDA, 'legal', 'livre-resolucao', 'formulario', 'index.html'))) {
  erros.push('falta o formulário do anexo B do DL 24/2014');
}

/* --- páginas privadas fora do índice -------------------------------------- */

for (const p of ['carrinho', 'encomenda', 'obrigado', 'encomenda-cancelada']) {
  const alvo = join(SAIDA, p, 'index.html');
  if (!existsSync(alvo)) { erros.push(`falta /${p}/`); continue; }
  if (!readFileSync(alvo, 'utf8').includes('name="robots" content="noindex')) {
    erros.push(`/${p}/: devia estar fora do índice da Google`);
  }
}

// O botão que conclui a encomenda TEM de ter a menção dentro dele: acórdão do
// TJUE de 07/04/2022 (C-249/21). Texto ao lado não vale, e a sanção é o
// contrato não vincular o consumidor.
const encomenda = readFileSync(join(SAIDA, 'encomenda', 'index.html'), 'utf8');
if (!/<button[^>]*data-pagar[^>]*>\s*Encomendar com obrigação de pagar\s*<\/button>/.test(encomenda)) {
  erros.push('/encomenda/: o botão de pagamento não diz «Encomendar com obrigação de pagar» dentro do próprio botão');
}

/* --- catálogo ------------------------------------------------------------- */

const ponteiro = readFileSync(join(SAIDA, 'dados', 'catalogo-atual.txt'), 'utf8').trim();
if (!existsSync(join(SAIDA, 'dados', `catalogo.${ponteiro}.json`))) {
  erros.push('o ponteiro do catálogo aponta para um ficheiro que não existe');
} else {
  const cat = JSON.parse(readFileSync(join(SAIDA, 'dados', `catalogo.${ponteiro}.json`), 'utf8'));
  const quantos = Object.keys(cat.produtos).length;
  if (quantos !== publicados) {
    erros.push(`o catálogo tem ${quantos} produtos e há ${publicados} publicados`);
  }
  for (const [slug, p] of Object.entries(cat.produtos)) {
    if (!(p.preco > 0)) erros.push(`catálogo: ${slug} sem preço`);
    if (!existeNoSite(p.capa)) erros.push(`catálogo: a capa de ${slug} não existe (${p.capa})`);
  }
}

/* --- resultado ------------------------------------------------------------ */

for (const a of avisos) console.log('aviso:', a);

if (erros.length) {
  console.error(`\nO QUE IA PARA O AR TEM ${erros.length} PROBLEMA(S):\n`);
  for (const e of erros) console.error(e.startsWith('    ') ? e : `  · ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`saída: ${paginas.length} páginas, ${publicados} fichas de produto, `
  + `${locs.length} endereços no sitemap — tudo resolve`);
