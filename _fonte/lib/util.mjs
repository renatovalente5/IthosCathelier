/* Ferramentas partilhadas pelo gerador. Sem dependências. */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Endereços com acentos ou espaços têm de ir codificados no HTML — senão o
 *  browser pede um ficheiro que não existe. E o inverso também importa: quem
 *  verifica os caminhos tem de descodificar antes de os procurar no disco. */
export const url = (p) => p.split('/').map(encodeURIComponent).join('/');

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Preço em euros para texto. Nunca se faz aritmética de dinheiro em vírgula
 *  flutuante no gerador: os valores vêm inteiros dos dados e só aqui viram texto. */
export const euros = (n) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

/** Markdown minúsculo: parágrafos, **negrito**, *itálico*, [ligações](url),
 *  listas com «- » e títulos com «## ». Chega para textos legais e de página, e
 *  não traz uma dependência que envelhece. */
/** @param {string} base  prefixo dos endereços internos. Sem ele, um
 *  `[garantia](/legal/garantia/)` escrito num texto sai literal e dá 404
 *  assim que o site é publicado debaixo do nome do repositório — coisa que em
 *  local nunca se vê, porque em local o prefixo é vazio. */
export function md(texto, base = '') {
  if (!texto) return '';
  const linha = (t) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t2, h) => {
      const externo = /^(https?:|mailto:|tel:|#)/.test(h);
      const alvo = externo || h.startsWith('//') ? h : `${base}${h}`;
      return `<a href="${esc(alvo)}"${externo && h.startsWith('http') ? ' rel="noopener"' : ''}>${t2}</a>`;
    });

  const saida = [];
  let lista = null;
  let tabela = null;
  const fecharTabela = () => {
    if (!tabela) return;
    const [cab, ...corpo] = tabela;
    saida.push('<div class="tabela-envolve"><table><thead><tr>' +
      cab.map((c) => `<th>${linha(c)}</th>`).join('') + '</tr></thead><tbody>' +
      corpo.map((r) => `<tr>${r.map((c) => `<td>${linha(c)}</td>`).join('')}</tr>`).join('') +
      '</tbody></table></div>');
    tabela = null;
  };
  for (const bruto of String(texto).split('\n')) {
    const l = bruto.trim();
    if (!l) {
      if (lista) { saida.push(`<${lista.tipo}>${lista.itens.join('')}</${lista.tipo}>`); lista = null; }
      fecharTabela();
      continue;
    }
    if (l.startsWith('|') && l.endsWith('|')) {
      const celulas = l.slice(1, -1).split('|').map((c) => c.trim());
      // A linha de traços que separa o cabeçalho não é conteúdo.
      if (celulas.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      (tabela ??= []).push(celulas);
      continue;
    }
    fecharTabela();
    const t = /^(#{2,4})\s+(.*)$/.exec(l);
    if (t) {
      if (lista) { saida.push(`<${lista.tipo}>${lista.itens.join('')}</${lista.tipo}>`); lista = null; }
      const n = t[1].length;
      saida.push(`<h${n} id="${slugify(t[2])}">${linha(t[2])}</h${n}>`);
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(l);
    if (li) { lista ??= { tipo: 'ul', itens: [] }; lista.itens.push(`<li>${linha(li[1])}</li>`); continue; }
    const on = /^\d+[.)]\s+(.*)$/.exec(l);
    if (on) { lista ??= { tipo: 'ol', itens: [] }; lista.itens.push(`<li>${linha(on[1])}</li>`); continue; }
    if (lista) { saida.push(`<${lista.tipo}>${lista.itens.join('')}</${lista.tipo}>`); lista = null; }
    saida.push(`<p>${linha(l)}</p>`);
  }
  if (lista) saida.push(`<${lista.tipo}>${lista.itens.join('')}</${lista.tipo}>`);
  fecharTabela();
  return saida.join('\n');
}

/** Parágrafos simples, sem títulos nem listas — para resumos e textos curtos. */
export const paras = (texto) =>
  String(texto ?? '').split(/\n{2,}/).filter(Boolean)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n');

const LARGURAS = [400, 800, 1200, 1600];

/**
 * Constrói um <picture> a partir das variantes QUE EXISTEM NO DISCO.
 *
 * Isto não é zelo: as fotografias que vieram das redes sociais só têm 1024 px,
 * e o motor de imagens não amplia. Anunciar um `-1600.webp` que não foi gerado
 * dá um pedido falhado por cada cartão da montra, sem erro visível em lado
 * nenhum a não ser na conta de dados de quem está no telemóvel.
 */
export function figura({ raiz, base = '', nome, dir, alt, sizes, classe = '', prioridade = false, proporcao = '' }) {
  const pasta = join(raiz, 'media', dir);
  if (!existsSync(pasta)) return '';
  const presentes = new Set(readdirSync(pasta));
  const tem = (w, ext) => presentes.has(`${nome}-${w}.${ext}`);
  const largurasWebp = LARGURAS.filter((w) => tem(w, 'webp'));
  if (!largurasWebp.length) return '';
  const largurasAvif = LARGURAS.filter((w) => tem(w, 'avif'));

  const conj = (ws, ext) => ws
    .map((w) => `${base}${url(`/media/${dir}/${nome}-${w}.${ext}`)} ${w}w`).join(', ');

  const maior = largurasWebp[largurasWebp.length - 1];
  const carga = prioridade
    ? ' fetchpriority="high" decoding="async"'
    : ' loading="lazy" decoding="async"';

  return `<picture>${
    largurasAvif.length ? `<source type="image/avif" srcset="${conj(largurasAvif, 'avif')}" sizes="${esc(sizes)}">` : ''
  }<source type="image/webp" srcset="${conj(largurasWebp, 'webp')}" sizes="${esc(sizes)}">` +
    `<img src="${base}${url(`/media/${dir}/${nome}-${maior}.webp`)}" alt="${esc(alt)}"` +
    `${classe ? ` class="${esc(classe)}"` : ''}${proporcao ? ` width="${proporcao.split('x')[0]}" height="${proporcao.split('x')[1]}"` : ''}${carga}></picture>`;
}

/** Existe alguma variante desta fotografia? Usado para decidir entre mostrar a
 *  fotografia ou a composição tipográfica das peças ainda sem fotografia. */
export function temFoto(raiz, dir, base) {
  const pasta = join(raiz, 'media', dir);
  if (!existsSync(pasta)) return false;
  return readdirSync(pasta).some((f) => f.startsWith(`${base}-`) && f.endsWith('.webp'));
}
