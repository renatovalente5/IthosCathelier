/* Lê `conteudo/` e devolve tudo o que o gerador precisa, já validado.
 *
 * A validação vive aqui e não no fim: um site publicado sem a morada do
 * vendedor, sem preço num produto visível ou sem aviso de segurança é pior do
 * que um site que não publica. Por isso estas funções MATAM a construção. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ler = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Campos sem os quais o site é ilegal — DL 7/2004 art. 10.º n.º 1. */
const IDENTIDADE_OBRIGATORIA = ['nome', 'nif', 'email', 'telefone', 'morada', 'codigo_postal', 'localidade'];

export function carregar(raiz, { permitirIncompleto = false } = {}) {
  const C = join(raiz, 'conteudo');
  const erros = [];

  const identidade = ler(join(C, 'definicoes', 'identidade.json'));
  const fiscal = ler(join(C, 'definicoes', 'fiscal.json'));
  const portes = ler(join(C, 'definicoes', 'portes.json'));
  const loja = ler(join(C, 'definicoes', 'loja.json'));
  const marcas = ler(join(C, 'definicoes', 'marcas.json'));

  for (const campo of IDENTIDADE_OBRIGATORIA) {
    if (!String(identidade[campo] ?? '').trim()) {
      erros.push(`identidade.json: falta «${campo}» — é obrigatório por lei (DL 7/2004, art. 10.º)`);
    }
  }
  if (!identidade.ral?.nome) erros.push('identidade.json: falta a entidade de resolução de litígios (Lei 144/2015, art. 18.º)');

  // --- produtos ithos ------------------------------------------------------
  const ithos = [];
  const dirIthos = join(C, 'ithos');
  for (const f of readdirSync(dirIthos).filter((n) => n.endsWith('.json')).sort()) {
    const slug = f.slice(0, -5);
    const p = ler(join(dirIthos, f));
    p.slug = slug;
    p.marca = 'ithos';
    p.dir = `ithos/${slug}`;
    p.caminho = `/candeeiros/${slug}/`;

    if (!p.publicado) { ithos.push(p); continue; }

    if (typeof p.preco !== 'number' || !(p.preco > 0)) {
      erros.push(`ithos/${slug}: está publicado mas não tem preço. Ou mete o preço, ou desliga o «publicado».`);
    }
    if (!p.nome) erros.push(`ithos/${slug}: falta o nome`);
    if (!p.resumo) erros.push(`ithos/${slug}: falta o resumo — é o que aparece na montra e nos resultados da Google`);
    if (!Array.isArray(p.fotos) || !p.fotos.length) {
      erros.push(`ithos/${slug}: está publicado sem uma única fotografia`);
    }
    if (!['em_stock', 'por_encomenda', 'esgotado'].includes(p.estado)) {
      erros.push(`ithos/${slug}: estado «${p.estado}» desconhecido (em_stock, por_encomenda ou esgotado)`);
    }
    for (const o of p.opcoes ?? []) {
      if (!o.id || !o.nome) erros.push(`ithos/${slug}: opção sem id ou sem nome`);
      if (o.tipo === 'escolha' && !(o.valores ?? []).length) {
        erros.push(`ithos/${slug}: a opção «${o.nome}» é de escolha e não tem valores`);
      }
    }
    ithos.push(p);
  }
  ithos.sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

  // --- cathelier -----------------------------------------------------------
  const categorias = ler(join(C, 'cathelier', 'categorias.json'))
    .map((c) => ({ ...c, marca: 'cathelier', caminho: `/cathelier/${c.slug}/`, dir: `cathelier/${c.slug}` }))
    .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

  const pecas = [];
  const dirPecas = join(C, 'cathelier', 'pecas');
  if (existsSync(dirPecas)) {
    for (const f of readdirSync(dirPecas).filter((n) => n.endsWith('.json')).sort()) {
      const slug = f.slice(0, -5);
      const p = ler(join(dirPecas, f));
      p.slug = slug;
      p.marca = 'cathelier';
      p.dir = `cathelier/pecas/${slug}`;
      const cat = categorias.find((c) => c.slug === p.categoria);
      if (!cat) {
        erros.push(`cathelier/pecas/${slug}: categoria «${p.categoria}» não existe em categorias.json`);
        continue;
      }
      p.caminho = `/cathelier/${p.categoria}/${slug}/`;
      p.categoriaNome = cat.nome;

      if (p.publicado) {
        if (typeof p.preco !== 'number' || !(p.preco > 0)) {
          erros.push(`cathelier/${slug}: está publicada mas não tem preço`);
        }
        if (!p.resumo) erros.push(`cathelier/${slug}: publicada sem resumo`);
        if (!p.texto) erros.push(`cathelier/${slug}: publicada sem descrição`);
        if (!p.forma && !(p.fotos ?? []).length) {
          erros.push(`cathelier/${slug}: sem fotografia e sem desenho — não há nada para mostrar`);
        }
        for (const o of p.opcoes ?? []) {
          if (!o.id || !o.nome) erros.push(`cathelier/${slug}: opção sem id ou sem nome`);
          if (o.tipo === 'escolha' && !(o.valores ?? []).length) {
            erros.push(`cathelier/${slug}: a opção «${o.nome}» é de escolha e não tem valores`);
          }
        }
      }
      pecas.push(p);
    }
  }

  // --- perguntas frequentes ------------------------------------------------
  // Vivem num JSON e não num markdown porque a marcação FAQPage precisa de
  // pergunta e resposta separadas, e porque a página inicial mostra as três
  // primeiras sem as reescrever.
  const perguntas = ler(join(C, 'paginas', 'perguntas.json'));
  for (const [i, q] of perguntas.entries()) {
    if (!q.pergunta || !q.resposta) erros.push(`perguntas.json: a pergunta n.º ${i + 1} está incompleta`);
  }

  // --- páginas de texto ----------------------------------------------------
  const paginas = {};
  const dirPag = join(C, 'paginas');
  if (existsSync(dirPag)) {
    for (const f of readdirSync(dirPag).filter((n) => n.endsWith('.md'))) {
      paginas[f.slice(0, -3)] = readFileSync(join(dirPag, f), 'utf8');
    }
  }
  const legais = {};
  const dirLegal = join(C, 'legal');
  if (existsSync(dirLegal)) {
    for (const f of readdirSync(dirLegal).filter((n) => n.endsWith('.md'))) {
      legais[f.slice(0, -3)] = readFileSync(join(dirLegal, f), 'utf8');
    }
  }

  // --- coerência das zonas de envio ----------------------------------------
  const paisesConhecidos = new Set(portes.zonas.flatMap((z) => z.paises.map((p) => p.slice(0, 2))));
  for (const pais of portes.ativos) {
    if (!paisesConhecidos.has(pais)) {
      erros.push(`portes.json: o país ativo «${pais}» não pertence a nenhuma zona — ninguém conseguiria comprar para lá`);
    }
  }
  if (!portes.ativos.length) erros.push('portes.json: não há um único país ativo — a loja não consegue vender');

  if (erros.length && !permitirIncompleto) {
    console.error('\nA CONSTRUÇÃO PAROU. Um site incompleto publicado é pior do que um site que não publica.\n');
    for (const e of erros) console.error('  ·', e);
    console.error('');
    process.exit(1);
  }

  pecas.sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
  for (const c of categorias) c.pecas = pecas.filter((p) => p.categoria === c.slug && p.publicado);

  return { identidade, fiscal, portes, loja, marcas, ithos, categorias, pecas, perguntas, paginas, legais, erros };
}

/** O preço de partida de um produto (o mais baixo, contando suplementos). */
export function precoBase(p) {
  return p.preco ?? null;
}

/** Um produto é sempre personalizado, nunca, ou depende das opções escolhidas?
 *
 *  Isto decide se há ou não direito de livre resolução de 14 dias, e por isso
 *  não é cosmética: escolher uma COR DE CATÁLOGO não é personalização
 *  (Orientações da Comissão 2021/C 525/01, 5.11.2) — só o texto livre gravado é.
 */
export function personalizacao(p) {
  const opcoesQuePersonalizam = (p.opcoes ?? []).filter((o) => o.personaliza);
  if (!opcoesQuePersonalizam.length) return 'nunca';
  if (opcoesQuePersonalizam.every((o) => o.obrigatoria)) return 'sempre';
  return 'depende';
}
