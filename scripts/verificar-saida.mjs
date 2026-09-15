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

// O BASE é LIDO do que a construção registou, não adivinhado. Uma guarda que
// deriva a sua própria versão da verdade envelhece sozinha: a primeira versão
// disto declarou 113 problemas inexistentes, e a segunda acusou as 26 capas do
// catálogo só porque a construção tinha corrido com outro prefixo.
const ficheiroBase = join(SAIDA, 'dados', 'base.txt');
if (!existsSync(ficheiroBase)) {
  console.error('não há publico/dados/base.txt — esta saída foi construída por uma versão antiga do gerador');
  process.exit(1);
}
const BASE = readFileSync(ficheiroBase, 'utf8').trim();

// Em pré-visualização, um «por preencher» numa página legal é esperado — é o
// que estamos à espera que a cliente dê. Continua a ser contado e mostrado, mas
// não impede de ver o site. Tudo o resto continua a matar.
const PREVIA = process.env.PREVISUALIZACAO === 'sim';

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
    // Os ficheiros que começam por `_` são instrumentos de teste copiados para
    // cá à mão depois da construção (a bateria de browser). Não são páginas do
    // site e não vão para o ar — o `upload-pages-artifact` só leva o que a
    // construção escreveu.
    if (nome.startsWith('_')) continue;
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) saida.push(...todos(caminho, ext));
    else if (nome.endsWith(ext)) saida.push(caminho);
  }
  return saida;
}

/* As mesmas que o sitemap deixa de fora: são páginas do processo de compra,
   não páginas para encontrar na Google. */
const FORA_DO_INDICE = ['carrinho/', 'encomenda/', 'obrigado/', 'encomenda-cancelada/', '404.html'];

const titulosVistos = {};
const descricoesVistas = {};

const paginas = todos(SAIDA, '.html');
if (paginas.length < 30) erros.push(`só ${paginas.length} páginas — esperava bastantes mais`);

/** Um endereço interno resolve para alguma coisa que vai ser servida?
 *  PERCENT-DECODE antes de procurar: um ficheiro com espaço ou acento no nome
 *  sai codificado no HTML e no disco chama-se outra coisa. Sem descodificar, a
 *  guarda acusa ficheiros que existem — e como tudo depende dela, nada vai ao ar. */
function existeNoSite(endereco) {
  const u0 = decodeURIComponent(endereco.split('#')[0].split('?')[0]);
  if (!u0.startsWith('/')) return true;                // relativo: não se usa aqui

  // O PREFIXO É OBRIGATÓRIO quando existe. Esta guarda começou por o ignorar —
  // tirava-o se lá estivesse e seguia se não estivesse — e por isso deixou
  // passar TODAS as fotografias do site: eram escritas sem prefixo, existiam no
  // disco, e só davam 404 depois de publicadas. Um endereço absoluto sem o
  // prefixo não é um endereço deste site.
  if (BASE) {
    if (!u0.startsWith(`${BASE}/`) && u0 !== BASE) return false;
  }
  const rel = (BASE ? u0.slice(BASE.length) : u0).replace(/^\//, '');
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

  /* Título e descrição: únicos, e do tamanho que cabe no resultado.
   *
   * Duas páginas com o mesmo título são duas páginas a competir uma com a
   * outra pela mesma pesquisa, e a Google escolhe uma e deita a outra fora.
   * Isto acontece em silêncio — e acontece sempre por acidente, quando um
   * modelo passa a servir mais páginas do que servia quando foi escrito. */
  const titulo = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const descricao = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  /* Quais são as páginas que contam.
   *
   * NÃO se pergunta ao `noindex` do HTML: em pré-visualização o site inteiro
   * sai com `noindex`, e uma guarda que se lê a si própria assim não corria em
   * nenhuma das construções que realmente se fazem — ficava a imprimir um ✓ até
   * ao dia em que deixasse de haver pré-visualização. Pergunta-se ao ENDEREÇO,
   * que é a mesma lista que decide o sitemap. */
  const indexavel = !FORA_DO_INDICE.some((x) => onde === x || onde.startsWith(x));
  if (!titulo) erros.push(`${onde}: sem título`);
  if (!descricao) erros.push(`${onde}: sem descrição`);
  if (indexavel) {
    (titulosVistos[titulo] ??= []).push(onde);
    (descricoesVistas[descricao] ??= []).push(onde);
    // 65 caracteres é onde a Google corta. Cortar não é fatal — perder a marca
    // no corte é, e a marca vai sempre no fim.
    if (titulo.length > 65) avisos.push(`${onde}: título com ${titulo.length} caracteres — a Google corta aos 65`);
    if (descricao.length < 70) avisos.push(`${onde}: descrição com ${descricao.length} caracteres — curta de mais para dizer alguma coisa`);
    if (descricao.length > 165) avisos.push(`${onde}: descrição com ${descricao.length} caracteres — a Google corta aos 165`);
  }

  // Marcadores por resolver seriam publicados em texto literal.
  const marcador = /\{\{[A-Z_]+\}\}/.exec(html);
  if (marcador) erros.push(`${onde}: marcador por resolver ${marcador[0]}`);
  if (html.includes('⟨por preencher⟩')) {
    (PREVIA ? avisos : erros).push(
      `${onde}: ficou um «⟨por preencher⟩» numa página legal — falta um dado da cliente`);
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
  // A menção é obrigatória JUNTO A CADA número (DL 59/2021), e tem de ser igual
  // em todo o lado — por isso verifica-se o texto exacto, maiúscula incluída.
  if (!html.includes('(Chamada para a rede móvel nacional)')) {
    erros.push(`${onde}: falta «(Chamada para a rede móvel nacional)» junto ao número (DL 59/2021)`);
  }
  const telefones = (html.match(/href="tel:[^"]+"/g) ?? []).length;
  const mencoes = (html.match(/\(Chamada para a rede móvel nacional\)/g) ?? []).length;
  if (telefones > mencoes) {
    erros.push(`${onde}: ${telefones} números de telefone e só ${mencoes} menção(ões) do custo da chamada`);
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

for (const [t, onde] of Object.entries(titulosVistos)) {
  if (onde.length > 1) erros.push(`título repetido em ${onde.length} páginas («${t.slice(0, 50)}…»): ${onde.slice(0, 3).join(', ')}`);
}
for (const [d, onde] of Object.entries(descricoesVistas)) {
  if (onde.length > 1) erros.push(`descrição repetida em ${onde.length} páginas: ${onde.slice(0, 3).join(', ')}`);
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
  const alvo = join(SAIDA, 'candeeiros', slug, 'index.html');
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

/* --- cada peça da cathelier publicada tem a SUA ficha --------------------- */

const dirPecas = join(RAIZ, 'conteudo', 'cathelier', 'pecas');
let pecasOk = 0;
if (existsSync(dirPecas)) {
  for (const f of readdirSync(dirPecas).filter((x) => x.endsWith('.json'))) {
    const slug = f.slice(0, -5);
    const p = JSON.parse(readFileSync(join(dirPecas, f), 'utf8'));
    const alvo = join(SAIDA, 'cathelier', p.categoria, slug, 'index.html');
    if (!p.publicado) {
      if (existsSync(alvo)) erros.push(`cathelier/${slug}: despublicada mas a página foi gerada`);
      continue;
    }
    pecasOk++;
    if (!existsSync(alvo)) { erros.push(`cathelier/${slug}: publicada mas sem página`); continue; }
    const html = readFileSync(alvo, 'utf8');
    if (!html.includes('data-preco-mostrado')) erros.push(`cathelier/${slug}: a ficha não mostra preço`);
    // A peça sem fotografia tem de mostrar o desenho — nunca um buraco.
    if (!(p.fotos ?? []).length && !html.includes('class="corte"')) {
      erros.push(`cathelier/${slug}: sem fotografia e sem desenho — a ficha fica com um buraco`);
    }
    // O identificador do carrinho tem de ser a chave do catálogo.
    if (!html.includes(`data-produto="c-${slug}"`)) {
      erros.push(`cathelier/${slug}: o identificador do carrinho não bate com o do catálogo`);
    }
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
  // O catálogo tem as DUAS marcas. Contar só os candeeiros dava sempre errado
  // desde que a cathelier passou a vender.
  const pecasPublicadas = readdirSync(join(RAIZ, 'conteudo', 'cathelier', 'pecas'))
    .filter((f) => f.endsWith('.json'))
    .filter((f) => JSON.parse(readFileSync(join(RAIZ, 'conteudo', 'cathelier', 'pecas', f), 'utf8')).publicado)
    .length;
  const esperados = publicados + pecasPublicadas;
  const quantos = Object.keys(cat.produtos).length;
  if (quantos !== esperados) {
    erros.push(`o catálogo tem ${quantos} produtos e estão publicados ${esperados} `
      + `(${publicados} ithos + ${pecasPublicadas} cathelier)`);
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

console.log(`saída: ${paginas.length} páginas, ${publicados} candeeiros, ${pecasOk} peças, `
  + `${locs.length} endereços no sitemap — tudo resolve`);
// Diz-se quantas foram MESMO julgadas. Uma guarda que se desliga sozinha
// imprime um ✓ igual ao de uma guarda que passou.
console.log(`  ${Object.values(titulosVistos).flat().length} páginas indexáveis, `
  + `${Object.keys(titulosVistos).length} títulos e ${Object.keys(descricoesVistas).length} descrições distintos`);
