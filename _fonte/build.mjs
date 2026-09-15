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

/* Quantos há de cada coisa. Vai para o menu do telemóvel: um número ao lado
   de «Candeeiros» diz mais sobre o que está do outro lado do que a palavra. */
const contagens = {
  candeeiros: d.ithos.filter((p) => p.publicado).length,
  pecas: d.pecas.filter((p) => p.publicado).length,
  ocasioes: d.categorias.filter((c) => c.publicado && c.pecas.length).length,
};

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
    identidade: d.identidade, marcas: d.marcas, contagens,
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
  produtos: Object.fromEntries([
    ...d.ithos.filter((p) => p.publicado).map((p) => [p.slug, {
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
    // As peças da cathelier vendem-se no mesmo carrinho. A capa pode não
    // existir ainda: o carrinho mostra um desenho quando vier vazia.
    ...d.pecas.filter((p) => p.publicado).map((p) => [`c-${p.slug}`, {
      nome: p.nome, marca: 'cathelier', preco: p.preco, estado: p.estado ?? 'por_encomenda',
      caminho: `${BASE}${p.caminho}`,
      capa: (p.fotos ?? []).length ? `${BASE}/media/${p.dir}/${p.fotos[0]}-400.webp` : '',
      forma: p.forma ?? 'placa',
      personalizacao: personalizacao(p),
      opcoes: (p.opcoes ?? []).map((o) => ({
        id: o.id, nome: o.nome, tipo: o.tipo, obrigatoria: !!o.obrigatoria,
        personaliza: !!o.personaliza, max: o.max ?? null, suplemento: o.suplemento ?? 0,
        valores: (o.valores ?? []).map((v) => ({
          id: v.id ?? v, nome: v.nome ?? v, suplemento: v.suplemento ?? 0,
        })),
      })),
    }]),
  ]),
};
catalogo.gerado = ultimaAlteracao('conteudo') ?? '1970-01-01';
const catalogoTexto = JSON.stringify(catalogo);
const hash = createHash('sha256').update(catalogoTexto).digest('hex').slice(0, 12);
mkdirSync(join(SAIDA, 'dados'), { recursive: true });
writeFileSync(join(SAIDA, 'dados', `catalogo.${hash}.json`), catalogoTexto);
writeFileSync(join(SAIDA, 'dados', 'catalogo-atual.txt'), hash);
// O prefixo com que este site foi construído, para quem o verificar não ter de
// o adivinhar.
writeFileSync(join(SAIDA, 'dados', 'base.txt'), BASE);

/* ------------------------------------------------------------- páginas ----
   O mapa de endereços do sítio inteiro, escrito num sítio só:

     /                               a loja ithos
     /candeeiros/                    catálogo
     /candeeiros/<modelo>/           ficha
     /sobre/                         o ateliê   (+ âncora #como-e-feito)
     /contactos/                     contactos e mapa   (+ âncora #perguntas)
     /cuidados-e-seguranca/          ENDEREÇO PERMANENTE — Reg. (UE) 2023/1542
     /cathelier/                     ocasiões
     /cathelier/pecas/               todas as peças
     /cathelier/<ocasiao>/           uma ocasião
     /cathelier/<ocasiao>/<peca>/    ficha
     /cathelier/orcamento/           pedido de orçamento
     /cathelier/atelier/             como se trabalha

   Regra: de qualquer página a qualquer peça em dois cliques, e nunca mais do
   que três níveis. O antigo portal de duas portas na raiz gastava a página mais
   visitada a fazer uma pergunta que ninguém queria responder; a raiz passou a
   ser a loja, e a cathelier ganhou uma porta desenhada dentro dela. */

const INICIO = { nome: 'Início', caminho: '/' };
const CATHELIER = { nome: 'cathelier', caminho: '/cathelier/' };

// a loja
escrever('/', montar({
  marca: 'ithos', caminho: '/',
  titulo: 'ithos — candeeiros de presença em madeira, feitos à mão',
  descricao: d.marcas.ithos.hero_texto,
  conteudo: M.paginaInicial(d, ctx),
  schema: [org, S.listaDeProdutos(d.ithos.filter((p) => p.publicado).slice(0, 12), { site: SITE, base: BASE, nome: 'Candeeiros ithos' })],
  imagem: '/media/ithos/raposa/og.jpg',
}));

escrever('/candeeiros/', montar({
  marca: 'ithos', caminho: '/candeeiros/',
  titulo: 'Candeeiros de presença em madeira — catálogo | ithos',
  descricao: `${contagens.candeeiros} modelos de candeeiro de presença em madeira de pinho, feitos à mão em Portugal. Podem levar nome gravado.`,
  conteudo: M.catalogoIthos(d, ctx),
  migalhas: [INICIO, { nome: 'Candeeiros', caminho: '/candeeiros/' }],
  schema: [
    mig([INICIO, { nome: 'Candeeiros', caminho: '/candeeiros/' }]),
    S.listaDeProdutos(d.ithos.filter((p) => p.publicado), { site: SITE, base: BASE, nome: 'Candeeiros ithos' }),
  ],
}));

for (const p of d.ithos.filter((x) => x.publicado)) {
  const migalhas = [INICIO, { nome: 'Candeeiros', caminho: '/candeeiros/' }, { nome: p.nome, caminho: p.caminho }];
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
  titulo: 'cathelier — lembranças personalizadas e peças com nome',
  descricao: d.marcas.cathelier.hero_texto,
  conteudo: M.casaCathelier(d, ctx),
  imagem: '/assets/img/partilha-cathelier.jpg',
  schema: [mig([INICIO, CATHELIER])],
}));

escrever('/cathelier/pecas/', montar({
  marca: 'cathelier', caminho: '/cathelier/pecas/',
  titulo: `Todas as peças personalizadas — ${contagens.pecas} modelos | cathelier`,
  descricao: `${contagens.pecas} peças personalizadas cortadas e gravadas a laser em Portugal: lembranças, troféus, nomes, réguas de crescimento e mais.`,
  conteudo: M.catalogoCathelier(d, ctx),
  migalhas: [INICIO, CATHELIER, { nome: 'Peças', caminho: '/cathelier/pecas/' }],
  schema: [
    mig([INICIO, CATHELIER, { nome: 'Peças', caminho: '/cathelier/pecas/' }]),
    S.listaDeProdutos(d.pecas.filter((p) => p.publicado), { site: SITE, base: BASE, nome: 'Peças cathelier' }),
  ],
}));

for (const c of d.categorias.filter((x) => x.publicado)) {
  const migalhas = [INICIO, CATHELIER, { nome: c.nome, caminho: c.caminho }];
  escrever(c.caminho, montar({
    marca: 'cathelier', caminho: c.caminho,
    titulo: `${c.nome} personalizado — peças com nome | cathelier`,
    descricao: `${c.resumo} Peças cortadas e gravadas a laser, feitas por encomenda em Portugal.`,
    conteudo: M.categoriaCathelier(c, d, ctx),
    migalhas,
    schema: [mig(migalhas), S.listaDeProdutos(c.pecas, { site: SITE, base: BASE, nome: c.nome })],
  }));
}

for (const p of d.pecas.filter((x) => x.publicado)) {
  const migalhas = [
    INICIO, CATHELIER,
    { nome: p.categoriaNome, caminho: `/cathelier/${p.categoria}/` },
    { nome: p.nome, caminho: p.caminho },
  ];
  const temFotografia = (p.fotos ?? []).length > 0;
  escrever(p.caminho, montar({
    marca: 'cathelier', caminho: p.caminho,
    titulo: p.seo?.titulo || `${p.nome} personalizado | cathelier`,
    descricao: p.seo?.descricao || `${p.resumo} Cortado e gravado a laser em Portugal, com os nomes e as datas que escolher.`,
    conteudo: M.fichaCathelier(p, d, ctx),
    migalhas,
    imagem: temFotografia ? `/media/${p.dir}/og.jpg` : undefined,
    schema: [
      S.produto(p, {
        site: SITE, base: BASE, identidade: d.identidade, portes: d.portes, loja: d.loja,
        imagens: temFotografia ? p.fotos.slice(0, 3).map((f) => `/media/${p.dir}/${f}-1200.webp`) : [],
        personalizacao: personalizacao(p),
      }),
      mig(migalhas),
    ],
  }));
}

escrever('/cathelier/orcamento/', montar({
  marca: 'cathelier', caminho: '/cathelier/orcamento/',
  titulo: 'Pedir orçamento | cathelier',
  descricao: 'Conte-nos a ocasião, a quantidade e a data. Respondemos em dois dias úteis com uma proposta e uma maqueta.',
  conteudo: L.orcamento(d, ctx),
  migalhas: [INICIO, CATHELIER, { nome: 'Orçamento', caminho: '/cathelier/orcamento/' }],
  schema: [mig([INICIO, CATHELIER, { nome: 'Orçamento', caminho: '/cathelier/orcamento/' }])],
}));

/* ------------------------------------------------ páginas de texto -------- */

const textoPagina = (chave) => aplicar(d.paginas[chave] ?? '', d, `conteudo/paginas/${chave}.md`);

/* O mapa da Google é um TERCEIRO: o browser do visitante contacta o servidor
   dela e recebe cookies. Por isso não vai no HTML — vai uma caixa com um botão,
   e o mapa só entra depois de alguém dizer que sim. Enquanto a morada completa
   não existir, aponta para a localidade. */
function caixaDoMapa() {
  if (!d.loja.mapa?.mostrar) return '';
  const consulta = d.loja.mapa.consulta
    || [d.identidade.morada, d.identidade.codigo_postal, d.identidade.localidade, d.identidade.pais]
      .filter(Boolean).join(', ');
  const externo = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  return `
<section class="mapa" id="mapa">
  <h2>No mapa</h2>
  <div class="mapa__caixa" data-mapa="${esc(consulta)}" data-zoom="${esc(String(d.loja.mapa.zoom ?? 13))}">
    <p class="mapa__aviso">O mapa é da Google e só carrega se aceitar. Enquanto não aceitar, este
      sítio não contacta servidores de terceiros.</p>
    <button class="botao" type="button" data-mapa-carregar>Ver o mapa</button>
    <p class="pequeno"><a class="ligacao" href="${esc(externo)}" rel="noopener">Abrir no Google Maps</a>
      — abre noutro separador, sem carregar nada aqui.</p>
  </div>
</section>`;
}

/* As perguntas frequentes deixaram de ter página própria.
 *
 * Tinham-na, e era um endereço a mais no menu a competir com «Contactos» —
 * quando quem procura uma resposta e quem procura o telefone são a MESMA pessoa,
 * no mesmo momento. Agora vivem no fim dos contactos, com âncora própria, e o
 * `FAQPage` continua a ser emitido onde elas estão. */
function blocoPerguntas() {
  return `
<section class="perguntas" id="perguntas">
  <h2>Perguntas que nos fazem</h2>
  <div class="prosa">
    ${d.perguntas.map((q) => `<details class="pergunta">
      <summary>${esc(q.pergunta)}</summary>
      <div>${paras(q.resposta)}</div>
    </details>`).join('\n    ')}
  </div>
</section>`;
}

const paginasTexto = [
  ['/sobre/', 'ithos', 'O ateliê', 'Um ateliê pequeno onde nascem as duas marcas: candeeiros ithos e peças personalizadas cathelier. Veja como se faz um candeeiro, passo a passo.',
    () => `${md(textoPagina('sobre'), BASE)}
<section id="como-e-feito" class="ancora">
  ${md(textoPagina('como-e-feito'), BASE)}
</section>`],
  ['/contactos/', 'ithos', 'Contactos', 'Fale connosco por email, telefone ou WhatsApp. Quem responde é quem faz as peças. Respondemos em dois dias úteis.',
    () => md(textoPagina('contactos'), BASE), () => caixaDoMapa() + blocoPerguntas(),
    [S.perguntas(d.perguntas)]],
  ['/cuidados-e-seguranca/', 'ithos', 'Cuidados e segurança', 'Avisos de segurança, como colocar e retirar as pilhas, limpeza e onde colocar o candeeiro.',
    () => md(textoPagina('cuidados-e-seguranca'), BASE)],
  ['/cathelier/atelier/', 'cathelier', 'O ateliê cathelier', 'Do pedido à entrega: como nasce uma peça personalizada cathelier, passo a passo.',
    () => md(textoPagina('como-trabalhamos'), BASE)],
];

for (const [caminho, marca, titulo, descricao, corpo, extra, schemaExtra] of paginasTexto) {
  const migalhas = [INICIO];
  if (marca === 'cathelier') migalhas.push(CATHELIER);
  migalhas.push({ nome: titulo, caminho });
  escrever(caminho, montar({
    marca, caminho,
    titulo: `${titulo} | ${marca === 'cathelier' ? 'cathelier' : 'ithos'}`,
    descricao,
    conteudo: `<article class="envolvente pagina-texto">
  <h1>${esc(titulo)}</h1>
  <div class="prosa">${corpo()}</div>
  ${extra ? extra() : ''}
</article>`,
    migalhas,
    schema: [mig(migalhas), ...(schemaExtra ?? [])],
  }));
}

/* ------------------------------------------------------------- legais ----- */

/* Cada página legal leva a SUA descrição. Antes eram todas «X da loja
   ithos · cathelier» — oito descrições quase iguais, e uma descrição que não
   distingue a página é o mesmo que não existir. */
const LEGAIS = [
  ['identificacao', 'Identificação do vendedor',
    'Quem vende, o número de contribuinte, a morada e os contactos — a informação que a lei obriga a mostrar antes de comprar.'],
  ['termos', 'Termos e condições de venda',
    'Como se faz uma encomenda, quando se paga, quando o contrato fica feito e o que acontece se alguma coisa correr mal.'],
  ['privacidade', 'Política de privacidade',
    'Que dados recolhemos, para que servem, quem lhes toca, quanto tempo ficam e como pode pedir para os ver ou apagar.'],
  ['envios-e-devolucoes', 'Envios e devoluções',
    'Prazos de produção e de entrega, quanto custam os portes para cada país, e como se devolve uma peça.'],
  ['livre-resolucao', 'Direito de livre resolução',
    'Tem 14 dias para desistir da compra sem dar explicações. Aqui diz-se como se faz, e quais são as peças que não têm esse direito.'],
  ['livre-resolucao-formulario', 'Formulário de livre resolução',
    'O formulário oficial para desistir da compra dentro dos 14 dias. Copie, preencha e envie — ou escreva-nos como preferir.'],
  ['garantia', 'Garantia',
    'Três anos de garantia legal em todas as peças. O que cobre, o que não cobre, e como se pede uma reparação ou uma troca.'],
  ['reclamacoes', 'Reclamações e litígios',
    'Como apresentar uma reclamação, o Livro de Reclamações eletrónico e a entidade de resolução alternativa de litígios.'],
];

for (const [chave, titulo, descricao] of LEGAIS) {
  const caminho = chave === 'livre-resolucao-formulario'
    ? '/legal/livre-resolucao/formulario/'
    : `/legal/${chave}/`;
  const migalhas = [INICIO, { nome: titulo, caminho }];
  escrever(caminho, montar({
    marca: 'ithos', caminho,
    titulo: `${titulo} | ithos · cathelier`,
    descricao,
    conteudo: `<article class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:42rem">
  <h1>${esc(titulo)}</h1>
  <div class="prosa">${md(aplicar(d.legais[chave] ?? '', d, `conteudo/legal/${chave}.md`), BASE)}</div>
  <p class="pequeno discreto" style="margin-top:var(--e6)">Última atualização: ${esc(ultimaAlteracao(`conteudo/legal/${chave}.md`) ?? catalogo.gerado)}.</p>
</article>`,
    migalhas,
    schema: [mig(migalhas)],
  }));
}

/* -------------------------------------------------------------- loja ------ */

escrever('/carrinho/', montar({
  marca: 'ithos', caminho: '/carrinho/', naoIndexar: true,
  titulo: 'Carrinho | ithos · cathelier',
  descricao: 'O seu carrinho de compras.',
  conteudo: L.carrinho(d, ctx),
}));

escrever('/encomenda/', montar({
  marca: 'ithos', caminho: '/encomenda/', naoIndexar: true,
  titulo: 'A sua encomenda | ithos · cathelier',
  descricao: 'Confirme a encomenda antes de pagar.',
  conteudo: L.encomenda(d, ctx),
}));

escrever('/obrigado/', montar({
  marca: 'ithos', caminho: '/obrigado/', naoIndexar: true,
  titulo: 'Encomenda feita | ithos · cathelier',
  descricao: 'A sua encomenda foi registada.',
  conteudo: L.obrigado(d, ctx),
}));

escrever('/encomenda-cancelada/', montar({
  marca: 'ithos', caminho: '/encomenda-cancelada/', naoIndexar: true,
  titulo: 'Pagamento não concluído | ithos · cathelier',
  descricao: 'O pagamento não foi concluído.',
  conteudo: L.cancelada(d, ctx),
}));

/* ------------------------------------------------------------- 404 -------- */

escrever('/404.html', montar({
  marca: 'ithos', caminho: '/404.html', naoIndexar: true,
  titulo: 'Página não encontrada | ithos · cathelier',
  descricao: 'Esta página não existe.',
  conteudo: `<section class="envolvente centrado" style="padding-block:var(--e8);max-width:36rem">
  <h1>Esta página não existe</h1>
  <p class="discreto">Talvez o endereço esteja mal escrito, ou a página tenha mudado de sítio.</p>
  <p style="margin-top:var(--e4)">
    <a class="botao" href="${l('/candeeiros/')}">Ver os candeeiros</a>
    <a class="botao botao--vazio" href="${l('/cathelier/')}">Ver a cathelier</a>
  </p>
</section>`,
}));

/* ------------------------------------------------- sitemap e robots ------- */

const semSitemap = new Set(['/carrinho/', '/encomenda/', '/obrigado/', '/encomenda-cancelada/', '/404.html']);
const paginasSitemap = escrito.filter((p) => !semSitemap.has(p) && p.endsWith('/'));

const prioridade = (p) => {
  if (p === '/') return '1.0';
  if (p === '/candeeiros/' || p === '/cathelier/') return '0.9';
  if (p === '/cathelier/pecas/') return '0.8';
  if (p.startsWith('/legal/')) return '0.2';
  return p.split('/').length > 3 ? '0.8' : '0.7';
};

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
console.log(`  catálogo: dados/catalogo.${hash}.json (${Object.keys(catalogo.produtos).length} produtos: `
  + `${d.ithos.filter((p) => p.publicado).length} ithos, ${d.pecas.filter((p) => p.publicado).length} cathelier)`);
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
  const m = /^\/candeeiros\/([^/]+)\/$/.exec(caminho);
  if (m) return ultimaAlteracao(`conteudo/ithos/${m[1]}.json`) ?? catalogo.gerado;
  const q = /^\/cathelier\/([^/]+)\/([^/]+)\/$/.exec(caminho);
  if (q) return ultimaAlteracao(`conteudo/cathelier/pecas/${q[2]}.json`) ?? catalogo.gerado;
  const c = /^\/cathelier\/([^/]+)\/$/.exec(caminho);
  if (c) return ultimaAlteracao('conteudo/cathelier/categorias.json') ?? catalogo.gerado;
  const g = /^\/legal\/([^/]+)\//.exec(caminho);
  if (g) return ultimaAlteracao(`conteudo/legal/${g[1]}.md`) ?? catalogo.gerado;
  return catalogo.gerado;
}
