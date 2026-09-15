#!/usr/bin/env node
/* Constrói o sítio inteiro para `publico/`.
 *
 *     node _fonte/build.mjs
 *
 * Variáveis de ambiente:
 *   BASE  prefixo dos endereços quando não há domínio próprio (ex.: /IthosCathelier)
 *   SITE  origem absoluta, para os canónicos e o sitemap
 *
 * Nenhuma das duas se escreve à mão em produção: saem do CNAME. Enquanto o
 * domínio não estiver registado, o sítio serve em
 * renatovalente5.github.io/IthosCathelier — e um BASE errado deixa o site sem
 * estilos, sem um único erro visível. */

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { carregar, personalizacao } from './lib/dados.mjs';
import { pagina } from './lib/esqueleto.mjs';
import { esc, md, paras, figura } from './lib/util.mjs';
import { aplicar } from './lib/legal.mjs';
import * as S from './lib/schema.mjs';
import * as M from './lib/paginas-marca.mjs';
import * as L from './lib/paginas-loja.mjs';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const SAIDA = join(RAIZ, 'publico');

// O CNAME é a fonte da verdade do endereço. Se existir, o sítio está num domínio
// próprio e não há prefixo; se não existir, está debaixo do nome do repositório.
const cname = existsSync(join(RAIZ, 'CNAME'))
  ? readFileSync(join(RAIZ, 'CNAME'), 'utf8').trim()
  : '';
const BASE = process.env.BASE ?? (cname ? '' : '/IthosCathelier');
const SITE = process.env.SITE ?? (cname ? `https://${cname}` : 'https://renatovalente5.github.io');

/* Pré-visualização: deixa construir sem os dados que ainda faltam à cliente,
   em troca de o site sair fora do índice, com tarja em todas as páginas e sem
   forma de comprar. É a única maneira honesta de ver o site antes de a loja
   poder abrir a sério. */
const PREVIA = process.env.PREVISUALIZACAO === 'sim';
const d = carregar(RAIZ, { permitirIncompleto: PREVIA || process.env.PERMITIR_INCOMPLETO === 'sim' });
const l = (p) => `${BASE}${p}`;
const ctx = { l, raiz: RAIZ, base: BASE, site: SITE };

const escrito = [];
function escrever(caminho, html) {
  const alvo = caminho.endsWith('/') ? join(SAIDA, caminho, 'index.html') : join(SAIDA, caminho);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, html);
  escrito.push(caminho);
}

function montar(o) {
  return pagina({
    ...o,
    site: SITE, base: BASE,
    identidade: d.identidade, marcas: d.marcas,
    previa: PREVIA,
    naoIndexar: o.naoIndexar || PREVIA,
  });
}

const org = S.organizacao({ identidade: d.identidade, site: SITE, base: BASE });
const mig = (itens) => S.migalhas(itens, { site: SITE, base: BASE });

/* ------------------------------------------------------------- limpeza ---- */
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

/* ------------------------------------------------------------- estáticos -- */
cpSync(join(RAIZ, 'media'), join(SAIDA, 'media'), { recursive: true });
mkdirSync(join(SAIDA, 'assets', 'css'), { recursive: true });
mkdirSync(join(SAIDA, 'assets', 'js'), { recursive: true });
cpSync(join(RAIZ, 'assets', 'img'), join(SAIDA, 'assets', 'img'), { recursive: true });
cpSync(join(RAIZ, '_fonte', 'tipos'), join(SAIDA, 'assets', 'tipos'), { recursive: true });

// Uma só folha de estilo: base + as duas marcas. São ~20 KB juntas, e um pedido
// a menos vale mais do que os poucos bytes que se poupavam a separá-las.
const css = [
  join(RAIZ, '_fonte', 'estilos', 'base.css'),
  join(RAIZ, '_fonte', 'estilos', 'marcas', 'ithos.css'),
  join(RAIZ, '_fonte', 'estilos', 'marcas', 'cathelier.css'),
  join(RAIZ, '_fonte', 'estilos', 'pecas.css'),
].filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n');
writeFileSync(join(SAIDA, 'assets', 'css', 'estilo.css'), css);

for (const f of readdirSync(join(RAIZ, '_fonte', 'js'))) {
  let js = readFileSync(join(RAIZ, '_fonte', 'js', f), 'utf8');
  js = js.replaceAll('__BASE__', BASE).replaceAll('__API__', process.env.API ?? 'https://api.ithos-cathelier.pt');
  writeFileSync(join(SAIDA, 'assets', 'js', f), js);
}

/* ------------------------------------------------------- catálogo público --
   A fonte única de preços. O Worker lê ESTE ficheiro antes de cobrar seja o que
   for: se o browser mandasse preços, mandava os que quisesse. O nome leva o
   resumo criptográfico do conteúdo, para poder ser servido para sempre; um
   ponteiro de texto diz qual é o atual. */
const catalogo = {
  gerado: null,                      // preenchido abaixo, sem relógio: vem do git
  fiscal: { regime: d.fiscal.regime, mencao: d.fiscal.mencao_fatura },
  portes: { ativos: d.portes.ativos, zonas: d.portes.zonas, campanha: d.portes.campanha },
  prazos: d.loja.prazos,
  previa: PREVIA,
  produtos: Object.fromEntries(
    d.ithos.filter((p) => p.publicado).map((p) => [p.slug, {
      nome: p.nome, marca: 'ithos', preco: p.preco, estado: p.estado,
      caminho: `${BASE}${p.caminho}`,
      capa: `${BASE}/media/${p.dir}/${p.fotos[0]}-400.webp`,
      personalizacao: personalizacao(p),
      opcoes: (p.opcoes ?? []).map((o) => ({
        id: o.id, nome: o.nome, tipo: o.tipo, obrigatoria: !!o.obrigatoria,
        personaliza: !!o.personaliza, max: o.max ?? null, suplemento: o.suplemento ?? 0,
        valores: (o.valores ?? []).map((v) => ({
          id: v.id ?? v, nome: v.nome ?? v, suplemento: v.suplemento ?? 0,
        })),
      })),
    }]),
  ),
};
catalogo.gerado = ultimaAlteracao('conteudo') ?? '1970-01-01';
const catalogoTexto = JSON.stringify(catalogo);
const hash = createHash('sha256').update(catalogoTexto).digest('hex').slice(0, 12);
mkdirSync(join(SAIDA, 'dados'), { recursive: true });
writeFileSync(join(SAIDA, 'dados', `catalogo.${hash}.json`), catalogoTexto);
writeFileSync(join(SAIDA, 'dados', 'catalogo-atual.txt'), hash);

/* ------------------------------------------------------------- páginas ---- */

// portal
escrever('/', montar({
  marca: 'casa', caminho: '/',
  titulo: 'ithos · cathelier — candeeiros e peças personalizadas, feitos à mão em Portugal',
  descricao: 'Duas marcas, um ateliê. Candeeiros de presença em madeira para quartos de crianças, e peças personalizadas para casamentos, batizados e ocasiões.',
  conteudo: M.portal(d, ctx),
  schema: [org],
  imagem: '/media/ithos/raposa/og.jpg',
}));

// ithos
escrever('/ithos/', montar({
  marca: 'ithos', caminho: '/ithos/',
  titulo: 'ithos — candeeiros de presença em madeira, feitos à mão | ithos · cathelier',
  descricao: d.marcas.ithos.hero_texto,
  conteudo: M.casaIthos(d, ctx),
  schema: [mig([{ nome: 'Início', caminho: '/' }, { nome: 'ithos', caminho: '/ithos/' }])],
  imagem: '/media/ithos/foguetao/og.jpg',
}));

escrever('/ithos/candeeiros/', montar({
  marca: 'ithos', caminho: '/ithos/candeeiros/',
  titulo: 'Candeeiros de presença em madeira — catálogo | ithos',
  descricao: `${d.ithos.filter((p) => p.publicado).length} modelos de candeeiro de presença em madeira de pinho, feitos à mão em Portugal. Podem levar nome gravado.`,
  conteudo: M.catalogoIthos(d, ctx),
  migalhas: [{ nome: 'Início', caminho: '/' }, { nome: 'ithos', caminho: '/ithos/' }, { nome: 'Candeeiros', caminho: '/ithos/candeeiros/' }],
  schema: [mig([{ nome: 'Início', caminho: '/' }, { nome: 'ithos', caminho: '/ithos/' }, { nome: 'Candeeiros', caminho: '/ithos/candeeiros/' }])],
}));

for (const p of d.ithos.filter((x) => x.publicado)) {
  const migalhas = [
    { nome: 'Início', caminho: '/' },
    { nome: 'ithos', caminho: '/ithos/' },
    { nome: 'Candeeiros', caminho: '/ithos/candeeiros/' },
    { nome: p.nome, caminho: p.caminho },
  ];
  escrever(p.caminho, montar({
    marca: 'ithos', caminho: p.caminho,
    titulo: p.seo?.titulo || `Candeeiro ${p.nome} — luz de presença em madeira | ithos`,
    descricao: p.seo?.descricao || `${p.resumo} Candeeiro de presença em madeira de pinho, feito à mão em Portugal. Pode levar nome gravado.`,
    conteudo: M.fichaIthos(p, d, ctx),
    migalhas,
    imagem: `/media/${p.dir}/og.jpg`,
    schema: [
      S.produto(p, {
        site: SITE, base: BASE, identidade: d.identidade, portes: d.portes, loja: d.loja,
        imagens: p.fotos.slice(0, 3).map((f) => `/media/${p.dir}/${f}-1200.webp`),
        personalizacao: personalizacao(p),
      }),
      mig(migalhas),
    ],
  }));
}

// cathelier
escrever('/cathelier/', montar({
  marca: 'cathelier', caminho: '/cathelier/',
  titulo: 'cathelier — lembranças e peças personalizadas | ithos · cathelier',
  descricao: d.marcas.cathelier.hero_texto,
  conteudo: M.casaCathelier(d, ctx),
  schema: [mig([{ nome: 'Início', caminho: '/' }, { nome: 'cathelier', caminho: '/cathelier/' }])],
}));

for (const c of d.categorias.filter((x) => x.publicado)) {
  const migalhas = [
    { nome: 'Início', caminho: '/' },
    { nome: 'cathelier', caminho: '/cathelier/' },
    { nome: c.nome, caminho: c.caminho },
  ];
  escrever(c.caminho, montar({
    marca: 'cathelier', caminho: c.caminho,
    titulo: `${c.nome} — lembranças e peças personalizadas | cathelier`,
    descricao: `${c.resumo} Peças cortadas e gravadas a laser, feitas por encomenda em Portugal.`,
    conteudo: M.categoriaCathelier(c, d, ctx),
    migalhas,
    schema: [mig(migalhas)],
  }));
}

escrever('/cathelier/orcamento/', montar({
  marca: 'cathelier', caminho: '/cathelier/orcamento/',
  titulo: 'Pedir orçamento | cathelier',
  descricao: 'Conte-nos a ocasião, a quantidade e a data. Respondemos em dois dias úteis com uma proposta e uma maqueta.',
  conteudo: L.orcamento(d, ctx),
  migalhas: [{ nome: 'Início', caminho: '/' }, { nome: 'cathelier', caminho: '/cathelier/' }, { nome: 'Orçamento', caminho: '/cathelier/orcamento/' }],
}));

/* ------------------------------------------------ páginas de texto -------- */

const textoPagina = (chave) => aplicar(d.paginas[chave] ?? '', d, `conteudo/paginas/${chave}.md`);

const paginasTexto = [
  ['/sobre/', 'casa', 'sobre', 'O ateliê', 'Um ateliê pequeno onde nascem as duas marcas: candeeiros ithos e peças personalizadas cathelier.'],
  ['/contactos/', 'casa', 'contactos', 'Contactos', 'Fale connosco por email, telefone ou WhatsApp. Quem responde é quem faz as peças.'],
  ['/ithos/como-e-feito/', 'ithos', 'como-e-feito', 'Como é feito um ithos', 'Do desenho ao LED: as sete etapas de um candeeiro de presença feito à mão em madeira de pinho.'],
  ['/ithos/cuidados-e-seguranca/', 'ithos', 'cuidados-e-seguranca', 'Cuidados e segurança', 'Avisos de segurança, como colocar e retirar as pilhas, limpeza e onde colocar o candeeiro.'],
  ['/cathelier/como-trabalhamos/', 'cathelier', 'como-trabalhamos', 'Como trabalhamos', 'Do pedido à entrega: como nasce uma peça personalizada cathelier.'],
];

for (const [caminho, marca, chave, titulo, descricao] of paginasTexto) {
  const migalhas = [{ nome: 'Início', caminho: '/' }];
  if (marca !== 'casa') migalhas.push({ nome: marca, caminho: `/${marca}/` });
  migalhas.push({ nome: titulo, caminho });
  escrever(caminho, montar({
    marca, caminho, titulo: `${titulo} | ${marca === 'casa' ? 'ithos · cathelier' : marca}`,
    descricao,
    conteudo: `<article class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:44rem">
  <h1>${esc(titulo)}</h1>
  <div class="prosa">${md(textoPagina(chave))}</div>
</article>`,
    migalhas,
    schema: [mig(migalhas)],
  }));
}

// perguntas frequentes
const perguntas = JSON.parse(readFileSync(join(RAIZ, 'conteudo', 'paginas', 'perguntas.json'), 'utf8'));
escrever('/perguntas/', montar({
  marca: 'casa', caminho: '/perguntas/',
  titulo: 'Perguntas frequentes | ithos · cathelier',
  descricao: 'Prazos, portes, devoluções, personalização e segurança — as perguntas que nos fazem mais vezes.',
  conteudo: `<article class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:44rem">
  <h1>Perguntas frequentes</h1>
  <div class="prosa" style="margin-top:var(--e5)">
    ${perguntas.map((q) => `<details class="pergunta">
      <summary>${esc(q.pergunta)}</summary>
      <div>${paras(q.resposta)}</div>
    </details>`).join('\n    ')}
  </div>
  <p style="margin-top:var(--e5)" class="discreto">Não encontrou a resposta? <a class="ligacao" href="${l('/contactos/')}">Escreva-nos</a>.</p>
</article>`,
  migalhas: [{ nome: 'Início', caminho: '/' }, { nome: 'Perguntas frequentes', caminho: '/perguntas/' }],
  schema: [S.perguntas(perguntas), mig([{ nome: 'Início', caminho: '/' }, { nome: 'Perguntas frequentes', caminho: '/perguntas/' }])],
}));

/* ------------------------------------------------------------- legais ----- */

const LEGAIS = [
  ['identificacao', 'Identificação do vendedor'],
  ['termos', 'Termos e condições de venda'],
  ['privacidade', 'Política de privacidade'],
  ['envios-e-devolucoes', 'Envios e devoluções'],
  ['livre-resolucao', 'Direito de livre resolução'],
  ['livre-resolucao-formulario', 'Formulário de livre resolução'],
  ['garantia', 'Garantia'],
  ['reclamacoes', 'Reclamações e litígios'],
];

for (const [chave, titulo] of LEGAIS) {
  const caminho = chave === 'livre-resolucao-formulario'
    ? '/legal/livre-resolucao/formulario/'
    : `/legal/${chave}/`;
  const migalhas = [{ nome: 'Início', caminho: '/' }, { nome: titulo, caminho }];
  escrever(caminho, montar({
    marca: 'casa', caminho,
    titulo: `${titulo} | ithos · cathelier`,
    descricao: `${titulo} da loja ithos · cathelier.`,
    conteudo: `<article class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:42rem">
  <h1>${esc(titulo)}</h1>
  <div class="prosa">${md(aplicar(d.legais[chave] ?? '', d, `conteudo/legal/${chave}.md`))}</div>
  <p class="pequeno discreto" style="margin-top:var(--e6)">Última atualização: ${esc(ultimaAlteracao(`conteudo/legal/${chave}.md`) ?? catalogo.gerado)}.</p>
</article>`,
    migalhas,
    schema: [mig(migalhas)],
  }));
}

/* -------------------------------------------------------------- loja ------ */

escrever('/carrinho/', montar({
  marca: 'casa', caminho: '/carrinho/', naoIndexar: true,
  titulo: 'Carrinho | ithos · cathelier',
  descricao: 'O seu carrinho de compras.',
  conteudo: L.carrinho(d, ctx),
}));

escrever('/encomenda/', montar({
  marca: 'casa', caminho: '/encomenda/', naoIndexar: true,
  titulo: 'A sua encomenda | ithos · cathelier',
  descricao: 'Confirme a encomenda antes de pagar.',
  conteudo: L.encomenda(d, ctx),
}));

escrever('/obrigado/', montar({
  marca: 'casa', caminho: '/obrigado/', naoIndexar: true,
  titulo: 'Encomenda feita | ithos · cathelier',
  descricao: 'A sua encomenda foi registada.',
  conteudo: L.obrigado(d, ctx),
}));

escrever('/encomenda-cancelada/', montar({
  marca: 'casa', caminho: '/encomenda-cancelada/', naoIndexar: true,
  titulo: 'Pagamento não concluído | ithos · cathelier',
  descricao: 'O pagamento não foi concluído.',
  conteudo: L.cancelada(d, ctx),
}));

/* ------------------------------------------------------------- 404 -------- */

escrever('/404.html', montar({
  marca: 'casa', caminho: '/404.html', naoIndexar: true,
  titulo: 'Página não encontrada | ithos · cathelier',
  descricao: 'Esta página não existe.',
  conteudo: `<section class="envolvente centrado" style="padding-block:var(--e8);max-width:36rem">
  <h1>Esta página não existe</h1>
  <p class="discreto">Talvez o endereço esteja mal escrito, ou a página tenha mudado de sítio.</p>
  <p style="margin-top:var(--e4)">
    <a class="botao" href="${l('/ithos/candeeiros/')}">Ver os candeeiros</a>
    <a class="botao botao--vazio" href="${l('/cathelier/')}">Ver a cathelier</a>
  </p>
</section>`,
}));

/* ------------------------------------------------- sitemap e robots ------- */

const semSitemap = new Set(['/carrinho/', '/encomenda/', '/obrigado/', '/encomenda-cancelada/', '/404.html']);
const paginasSitemap = escrito.filter((p) => !semSitemap.has(p) && p.endsWith('/'));

const prioridade = (p) => (p === '/' ? '1.0' : /^\/(ithos|cathelier)\/$/.test(p) ? '0.9'
  : p.startsWith('/legal/') ? '0.2' : p.split('/').length > 4 ? '0.8' : '0.7');

writeFileSync(join(SAIDA, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginasSitemap.map((p) => `  <url><loc>${SITE}${BASE}${p}</loc><lastmod>${dataDaPagina(p)}</lastmod><priority>${prioridade(p)}</priority></url>`).join('\n')}
</urlset>
`);

writeFileSync(join(SAIDA, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /carrinho/
Disallow: /encomenda/
Disallow: /obrigado/
Disallow: /encomenda-cancelada/

Sitemap: ${SITE}${BASE}/sitemap.xml
`);

if (cname) writeFileSync(join(SAIDA, 'CNAME'), `${cname}\n`);
// Sem isto, o GitHub Pages passa o que sai daqui pelo Jekyll e deita fora tudo o
// que comece por underscore.
writeFileSync(join(SAIDA, '.nojekyll'), '');

/* -------------------------------------------------------------- fim ------- */

console.log(`\n${escrito.length} páginas em publico/`);
if (PREVIA) console.log('  MODO DE PRÉ-VISUALIZAÇÃO: fora do índice, com tarja, sem checkout');
console.log(`  BASE=${BASE || '(raiz)'}  SITE=${SITE}`);
console.log(`  catálogo: dados/catalogo.${hash}.json (${d.ithos.filter((p) => p.publicado).length} produtos)`);
if (d.erros.length) {
  console.log(`\n  ${d.erros.length} aviso(s) — a construção foi autorizada por PERMITIR_INCOMPLETO:`);
  for (const e of d.erros) console.log('   ·', e);
}

/* --------------------------------------------------------- utilidades ----- */

/** A data da última alteração vem do GIT, não do relógio.
 *
 *  Se viesse do relógio, cada publicação dizia ao Google que TODAS as páginas
 *  mudaram hoje — e um sitemap que mente sobre `lastmod` é ignorado. */
function ultimaAlteracao(caminhoRelativo) {
  try {
    const saida = execFileSync('git', ['log', '-1', '--format=%cs', '--', caminhoRelativo],
      { cwd: RAIZ, encoding: 'utf8' }).trim();
    return saida || null;
  } catch { return null; }
}

function dataDaPagina(caminho) {
  const m = /^\/ithos\/candeeiros\/([^/]+)\/$/.exec(caminho);
  if (m) return ultimaAlteracao(`conteudo/ithos/${m[1]}.json`) ?? catalogo.gerado;
  const c = /^\/cathelier\/([^/]+)\/$/.exec(caminho);
  if (c) return ultimaAlteracao('conteudo/cathelier/categorias.json') ?? catalogo.gerado;
  const g = /^\/legal\/([^/]+)\//.exec(caminho);
  if (g) return ultimaAlteracao(`conteudo/legal/${g[1]}.md`) ?? catalogo.gerado;
  return catalogo.gerado;
}
