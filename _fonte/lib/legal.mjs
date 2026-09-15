/* Substitui os marcadores das páginas legais pelos dados reais.
 *
 * Porquê existir: num projeto anterior os contactos estavam ESCRITOS À MÃO nas
 * páginas legais. Quando a morada mudou, o rodapé mudou e as páginas legais
 * ficaram a mentir durante meses, sem que nada avisasse. Aqui não há um único
 * contacto escrito nas páginas: há marcadores, e um marcador que o gerador não
 * conheça MATA a construção — em vez de sair para o ar como texto literal. */

import { CUSTO_CHAMADA } from './esqueleto.mjs';

const MARCADORES = (d) => {
  const i = d.identidade;
  // A morada é tudo ou nada. Juntar só as partes que existem daria «Castelo
  // Branco, Portugal» numa página legal que diz ser a sede — uma morada
  // incompleta apresentada como completa é pior do que um espaço em branco,
  // porque ninguém dá por ela.
  const moradaCompleta = !!(String(i.morada ?? '').trim()
    && String(i.codigo_postal ?? '').trim()
    && String(i.localidade ?? '').trim());
  const morada = moradaCompleta
    ? `${i.morada}, ${i.codigo_postal} ${i.localidade}, ${i.pais}`
    : '';
  return {
    NOME: i.nome,
    DESIGNACAO: i.designacao,
    FORMA_JURIDICA: i.forma_juridica,
    NIF: i.nif,
    EMAIL: i.email,
    TELEFONE: i.telefone_texto,
    CUSTO_CHAMADA: CUSTO_CHAMADA,
    TELEFONE_LINK: i.telefone,
    MORADA: morada,
    LOCALIDADE: i.localidade,
    MORADA_DEVOLUCAO: d.loja.devolucoes.morada_devolucao || morada,
    RAL_NOME: i.ral.nome,
    RAL_SITE: i.ral.site,
    RAL_EMAIL: i.ral.email,
    RAL_TELEFONE: i.ral.telefone,
    RAL_MORADA: i.ral.morada,
    LIVRO: i.livro_reclamacoes,
    DIAS_RESOLUCAO: String(d.loja.devolucoes.dias_livre_resolucao),
    ANOS_GARANTIA: String(d.loja.devolucoes.garantia_anos),
    DIAS_EXPEDICAO: String(d.loja.prazos.expedicao_em_stock_dias),
    DIAS_PRODUCAO: String(d.loja.prazos.producao_dias),
    TRANSPORTADORA: d.portes.transportadora,
    MENCAO_IVA: d.fiscal.regime === 'isento_art53'
      ? 'Os preços são finais e não incluem IVA, por o vendedor estar abrangido pelo regime de isenção do artigo 53.º do Código do IVA.'
      : 'Os preços são finais e incluem IVA à taxa legal em vigor.',
    TABELA_PORTES: tabelaPortes(d),
  };
};

function tabelaPortes(d) {
  const ativas = d.portes.zonas.filter((z) => z.paises.some((p) => d.portes.ativos.includes(p.slice(0, 2))));
  const linhas = ativas.map((z) =>
    `| ${z.nome} | ${z.preco} € | ${z.dias_min} a ${z.dias_max} dias úteis |`).join('\n');
  return `| Destino | Portes | Prazo depois da expedição |\n|---|---|---|\n${linhas}`;
}

export function aplicar(texto, d, ondeEstou) {
  const mapa = MARCADORES(d);
  const desconhecidos = new Set();
  const saida = String(texto).replace(/\{\{([A-Z_]+)\}\}/g, (bruto, chave) => {
    if (!(chave in mapa)) { desconhecidos.add(chave); return bruto; }
    const v = mapa[chave];
    if (v === undefined || v === null || String(v).trim() === '') {
      desconhecidos.add(`${chave} (existe mas está vazio)`);
      return bruto;
    }
    return v;
  });
  if (desconhecidos.size) {
    const lista = [...desconhecidos].map((k) => `{{${k}}}`).join(', ');
    // Em desenvolvimento deixa-se passar com aviso, para se poder ver o site
    // antes de a cliente dar a morada. Na publicação, morre.
    if (process.env.PERMITIR_INCOMPLETO === 'sim' || process.env.PREVISUALIZACAO === 'sim') {
      console.warn(`aviso: marcadores por resolver em ${ondeEstou}: ${lista}`);
      return saida.replace(/\{\{[A-Z_]+\}\}/g, '⟨por preencher⟩');
    }
    console.error(`\nA CONSTRUÇÃO PAROU. Marcadores por resolver em ${ondeEstou}:\n`);
    for (const k of desconhecidos) console.error('  ·', `{{${k}}}`);
    console.error('\nSe fossem ignorados, o site publicava as chavetas em texto, ou uma página legal em branco.\n');
    process.exit(1);
  }
  return saida;
}
