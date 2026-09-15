#!/usr/bin/env node
/* As guardas que correm ANTES da construção.
 *
 * Todas nasceram de uma coisa que já correu mal: dados legais apagados por um
 * backoffice e publicados na mesma; uma fotografia anunciada que não existia;
 * texto de marketing a dizer «brinquedo» num produto que juridicamente não é um.
 *
 * Quando alguma falha, a construção MORRE. Um site incompleto publicado é pior
 * do que um site que não publica.
 *
 *     node scripts/guardas.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const erros = [];
const avisos = [];
const ler = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));

/* --- 1. dados legais ------------------------------------------------------
   O backoffice pode apagar um campo sem querer. Sem estes, o site é ilegal. */

const identidade = ler('conteudo/definicoes/identidade.json');
for (const campo of ['nome', 'nif', 'email', 'telefone', 'telefone_texto', 'morada', 'codigo_postal', 'localidade']) {
  if (!String(identidade[campo] ?? '').trim()) {
    erros.push(`identidade.json: «${campo}» está vazio — obrigatório pelo art. 10.º do DL 7/2004`);
  }
}
if (!/^\d{9}$/.test(String(identidade.nif ?? ''))) {
  erros.push(`identidade.json: o NIF «${identidade.nif}» não tem nove dígitos`);
}
for (const campo of ['nome', 'site', 'email']) {
  if (!identidade.ral?.[campo]) erros.push(`identidade.json: falta ral.${campo} — art. 18.º da Lei 144/2015`);
}
if (!identidade.livro_reclamacoes?.startsWith('https://')) {
  erros.push('identidade.json: falta o endereço do Livro de Reclamações — art. 5.º-B do DL 156/2005');
}

/* --- 2. envios e fiscal --------------------------------------------------- */

const portes = ler('conteudo/definicoes/portes.json');
if (!portes.ativos?.length) erros.push('portes.json: nenhum país ativo — ninguém consegue comprar');
const paisesDasZonas = new Set(portes.zonas.flatMap((z) => z.paises.map((p) => p.slice(0, 2))));
for (const p of portes.ativos ?? []) {
  if (!paisesDasZonas.has(p)) erros.push(`portes.json: o país ativo «${p}» não pertence a nenhuma zona`);
}
for (const z of portes.zonas ?? []) {
  if (!(z.preco >= 0)) erros.push(`portes.json: a zona «${z.nome}» não tem preço`);
  if (!(z.dias_min >= 1) || !(z.dias_max >= z.dias_min)) {
    erros.push(`portes.json: a zona «${z.nome}» tem prazos impossíveis (${z.dias_min}–${z.dias_max})`);
  }
}
// Fora da União Europeia é exportação, e exportar faz perder a isenção do
// art. 53.º do CIVA logo na primeira venda. Não se impede — avisa-se alto.
const fiscal = ler('conteudo/definicoes/fiscal.json');
const FORA_DA_UE = new Set(['GB', 'CH', 'NO', 'IS', 'US', 'BR', 'CA', 'AU']);
const terceiros = (portes.ativos ?? []).filter((p) => FORA_DA_UE.has(p));
if (terceiros.length && fiscal.regime === 'isento_art53') {
  avisos.push(`PORTES: ${terceiros.join(', ')} está fora da União Europeia e o regime declarado é o do `
    + 'art. 53.º do CIVA. Exportar exclui a isenção na data do facto — confirme com a contabilista.');
}

const loja = ler('conteudo/definicoes/loja.json');
if (!(loja.devolucoes?.dias_livre_resolucao >= 14)) {
  erros.push('loja.json: o direito de livre resolução não pode ser inferior a 14 dias (DL 24/2014)');
}
if (!(loja.devolucoes?.garantia_anos >= 3)) {
  erros.push('loja.json: a garantia não pode ser inferior a 3 anos (DL 84/2021)');
}
// O prazo máximo de entrega é de 30 dias sem aceitação expressa. Se produção e
// transporte, juntos, passarem disso, o site tem de pedir aceitação — e pede,
// mas convém saber.
const zonaMaisLenta = Math.max(...(portes.zonas ?? []).map((z) => z.dias_max ?? 0));
if ((loja.prazos?.producao_dias ?? 0) + zonaMaisLenta > 30) {
  avisos.push(`PRAZOS: produção (${loja.prazos.producao_dias}) + transporte (${zonaMaisLenta}) passa dos 30 dias `
    + 'do art. 19.º do DL 24/2014. O checkout pede aceitação expressa — confirme que o texto está certo.');
}
if (!(loja.avisos_seguranca_ithos ?? []).length) {
  erros.push('loja.json: não há avisos de segurança — obrigatórios pelo art. 19.º do Reg. (UE) 2023/988');
}

/* --- 3. produtos ---------------------------------------------------------- */

const dirProdutos = join(RAIZ, 'conteudo', 'ithos');
const produtos = readdirSync(dirProdutos).filter((f) => f.endsWith('.json'));
if (!produtos.length) erros.push('conteudo/ithos: não há um único produto');

for (const f of produtos) {
  const slug = f.slice(0, -5);
  const p = ler(`conteudo/ithos/${f}`);
  const onde = `ithos/${slug}`;

  // Campos que o backoffice pode apagar sem se dar por isso.
  for (const campo of ['nome', 'opcoes', 'fotos', 'estado']) {
    if (p[campo] === undefined) erros.push(`${onde}: o campo «${campo}» desapareceu dos dados`);
  }
  if (!p.publicado) continue;

  if (!(p.preco > 0)) erros.push(`${onde}: publicado sem preço`);
  if (!p.resumo?.trim()) erros.push(`${onde}: publicado sem resumo`);
  if (!p.texto?.trim()) erros.push(`${onde}: publicado sem descrição`);
  if (!['em_stock', 'por_encomenda', 'esgotado'].includes(p.estado)) {
    erros.push(`${onde}: estado «${p.estado}» desconhecido`);
  }

  // As fotografias declaradas TÊM de existir no disco. Anunciar uma que não
  // existe dá um buraco na montra, e ninguém dá por isso até um cliente ligar.
  if (!(p.fotos ?? []).length) {
    erros.push(`${onde}: publicado sem uma única fotografia`);
  }
  for (const base of p.fotos ?? []) {
    const pasta = join(RAIZ, '_fonte', 'originais', 'ithos', slug);
    const existe = existsSync(pasta)
      && readdirSync(pasta).some((x) => x.replace(/\.[^.]+$/, '') === base);
    if (!existe) erros.push(`${onde}: a fotografia «${base}» está na lista mas não existe em _fonte/originais`);
  }

  for (const o of p.opcoes ?? []) {
    if (!o.id || !o.nome) erros.push(`${onde}: há uma opção sem identificador ou sem nome`);
    if (o.tipo === 'escolha') {
      if (!(o.valores ?? []).length) erros.push(`${onde}: a opção «${o.nome}» é de escolha e não tem valores`);
      // Escolher uma cor de catálogo NÃO é personalização (Orientações da
      // Comissão 2021/C 525/01, 5.11.2). Marcar uma escolha como personalizadora
      // retirava os 14 dias a quem tem direito a eles — e informar mal é
      // contraordenação.
      if (o.personaliza) {
        erros.push(`${onde}: a opção de escolha «${o.nome}» está marcada como personalizadora. `
          + 'Escolher de uma lista não é personalização e não retira o direito de livre resolução.');
      }
    } else if (!(o.max > 0)) {
      erros.push(`${onde}: a opção de texto «${o.nome}» não tem limite de caracteres`);
    }
  }

  if (!p.gpsr?.tipo) erros.push(`${onde}: falta a referência do modelo (art. 19.º do Reg. (UE) 2023/988)`);
}

/* --- 4. o que o site NÃO pode dizer ---------------------------------------
   O candeeiro não é juridicamente um brinquedo (Anexo I, ponto 17 da Diretiva
   2009/48/CE exclui as luminárias apelativas a crianças). Mas a utilização
   razoavelmente previsível prevalece sobre a declaração do fabricante: se o
   texto de venda o tratar como brinquedo, a classificação cai — e com ela vem
   a EN 71, a marcação CE de brinquedo e o resto.

   Também se apanham as alegações ambientais genéricas, proibidas pela Diretiva
   (UE) 2024/825 a partir de 27/09/2026. */

const PROIBIDAS = [
  [/\bbrinquedo/i, 'trata o candeeiro como brinquedo'],
  [/\bbrincar\b/i, 'sugere brincar com o candeeiro'],
  [/companheiro de brincadeira/i, 'sugere brincar com o candeeiro'],
  [/\becológic[oa]/i, 'alegação ambiental genérica (Dir. (UE) 2024/825)'],
  [/\bsustentáve/i, 'alegação ambiental genérica (Dir. (UE) 2024/825)'],
  [/amig[oa] do ambiente/i, 'alegação ambiental genérica (Dir. (UE) 2024/825)'],
  [/\bbiodegradáve/i, 'alegação ambiental genérica (Dir. (UE) 2024/825)'],
];

// O aviso «não é um brinquedo» TEM de poder ser escrito — é ele que sustenta a
// classificação. Por isso a procura é por FRASE: a palavra só é problema numa
// frase que a afirme. Numa frase que a negue, é o contrário do problema.
//
// Esta distinção não é zelo: uma primeira versão desta guarda procurava a
// palavra no texto todo e acusava a própria página de segurança e as perguntas
// frequentes, que são exactamente onde o aviso vive.
const NEGA = /\b(não|nao|nunca|jamais|sem ser)\b/i;

/** @param {boolean} umBloco  trata o texto todo como uma unidade, em vez de o
 *  partir em frases. É o caso de uma pergunta frequente: «Os candeeiros são
 *  brinquedos?» só se percebe com o «Não.» que vem na resposta, e uma pergunta
 *  não é uma afirmação. */
function procurarProibidas(texto, onde, umBloco = false) {
  const frases = umBloco
    ? [String(texto ?? '')]
    : String(texto ?? '').split(/(?<=[.!?])\s+|\n+/);
  for (const frase of frases) {
    for (const [re, porque] of PROIBIDAS) {
      const m = re.exec(frase);
      if (!m) continue;
      const ambiental = porque.includes('ambiental');
      if (!ambiental && NEGA.test(frase)) continue;   // «não é um brinquedo»: é o aviso
      erros.push(`${onde}: «${m[0]}» em «${frase.trim().slice(0, 90)}» — ${porque}`);
    }
  }
}

for (const f of produtos) {
  const p = ler(`conteudo/ithos/${f}`);
  procurarProibidas(`${p.nome} ${p.resumo} ${p.texto}`, `ithos/${f.slice(0, -5)}`);
}
for (const pasta of ['conteudo/paginas', 'conteudo/legal']) {
  if (!existsSync(join(RAIZ, pasta))) continue;
  for (const f of readdirSync(join(RAIZ, pasta))) {
    if (f === 'perguntas.json') {
      // Uma pergunta e a sua resposta são UMA unidade: «Os candeeiros são
      // brinquedos?» só se percebe com o «Não.» que vem a seguir, e estão em
      // campos diferentes do JSON. Separadas, a guarda acusava a própria
      // resposta que existe para esclarecer o assunto.
      for (const q of JSON.parse(readFileSync(join(RAIZ, pasta, f), 'utf8'))) {
        procurarProibidas(`${q.pergunta} ${q.resposta}`, `${pasta}/${f} · «${q.pergunta.slice(0, 40)}»`, true);
      }
      continue;
    }
    if (!/\.(md|json)$/.test(f)) continue;
    procurarProibidas(readFileSync(join(RAIZ, pasta, f), 'utf8'), `${pasta}/${f}`);
  }
}
const marcas = ler('conteudo/definicoes/marcas.json');
for (const [m, v] of Object.entries(marcas)) {
  procurarProibidas(Object.values(v).join(' '), `marcas.json/${m}`);
}

/* --- 5. português sem acentos --------------------------------------------
   «Loica lavada» já chegou a um ecrã noutro projeto. Palavras comuns escritas
   sem acento passam despercebidas a quem escreve e saltam à vista de quem lê. */

const SEM_ACENTO = [
  [/\bnao\b/g, 'não'], [/\bmae\b/g, 'mãe'], [/\bavo\b/g, 'avó'],
  [/\bcriancas?\b/g, 'crianças'], [/\bprecos?\b/g, 'preços'], [/\bportugues\b/g, 'português'],
  [/\bencomendas? gratis\b/g, 'grátis'], [/\bgratis\b/g, 'grátis'], [/\bproducao\b/g, 'produção'],
  [/\bdevolucao\b/g, 'devolução'], [/\bgarantia de tres\b/g, 'três'], [/\bmadeira macica\b/g, 'maciça'],
];
function procurarSemAcento(texto, onde) {
  for (const [re, certo] of SEM_ACENTO) {
    const m = re.exec(String(texto ?? ''));
    re.lastIndex = 0;
    if (m) avisos.push(`${onde}: «${m[0]}» — devia ser «${certo}»?`);
  }
}
for (const f of produtos) {
  const p = ler(`conteudo/ithos/${f}`);
  procurarSemAcento(`${p.resumo} ${p.texto}`, `ithos/${f.slice(0, -5)}`);
}

/* --- 6. categorias da cathelier ------------------------------------------- */

const categorias = ler('conteudo/cathelier/categorias.json');
const vistos = new Set();
for (const c of categorias) {
  if (!c.slug || !c.nome) erros.push('categorias.json: há uma categoria sem slug ou sem nome');
  if (vistos.has(c.slug)) erros.push(`categorias.json: o slug «${c.slug}» aparece duas vezes`);
  vistos.add(c.slug);
  if (c.publicado && !c.resumo?.trim()) erros.push(`categorias.json: «${c.nome}» publicada sem resumo`);
}
if (!categorias.some((c) => c.publicado)) avisos.push('categorias.json: nenhuma ocasião publicada');

/* --- 7. páginas obrigatórias ---------------------------------------------- */

const LEGAIS = ['identificacao', 'termos', 'privacidade', 'envios-e-devolucoes',
  'livre-resolucao', 'livre-resolucao-formulario', 'garantia', 'reclamacoes'];
for (const n of LEGAIS) {
  if (!existsSync(join(RAIZ, 'conteudo', 'legal', `${n}.md`))) {
    erros.push(`falta a página legal obrigatória: conteudo/legal/${n}.md`);
  }
}
for (const n of ['cuidados-e-seguranca', 'sobre', 'contactos']) {
  if (!existsSync(join(RAIZ, 'conteudo', 'paginas', `${n}.md`))) {
    erros.push(`falta a página: conteudo/paginas/${n}.md`);
  }
}
// A plataforma ODR europeia foi revogada pelo Reg. (UE) 2024/3228 e desligada em
// 20/07/2025. Mencioná-la é mandar o consumidor a um sítio que não existe.
for (const f of readdirSync(join(RAIZ, 'conteudo', 'legal'))) {
  const t = readFileSync(join(RAIZ, 'conteudo', 'legal', f), 'utf8');
  if (/ec\.europa\.eu\/consumers\/odr|plataforma de resolução de litígios em linha|plataforma ODR/i.test(t)) {
    erros.push(`conteudo/legal/${f}: menciona a plataforma ODR, que foi desligada em 20/07/2025`);
  }
}

/* --- resultado ------------------------------------------------------------ */

for (const a of avisos) console.log('aviso:', a);

if (erros.length) {
  console.error(`\nA CONSTRUÇÃO PAROU — ${erros.length} problema(s):\n`);
  for (const e of erros) console.error('  ·', e);
  console.error('');
  process.exit(1);
}

console.log(`guardas: ${produtos.length} produtos, ${categorias.length} ocasiões, `
  + `${LEGAIS.length} páginas legais — tudo coerente${avisos.length ? ` (${avisos.length} aviso(s))` : ''}`);
