/* Desenhos de linha para as peças da cathelier.
 *
 * Porque existem: a cathelier ainda não tem fotografias. Uma caixa cinzenta com
 * um ícone de imagem partida diz «site por acabar»; isto diz outra coisa.
 *
 * Cada peça é desenhada como a **linha de corte** que a máquina segue — que é
 * literalmente o ficheiro de trabalho de quem corta a laser. Traço fino,
 * contínuo, sem preenchimento, com os pormenores gravados sugeridos por linhas
 * mais curtas. É honesto (ninguém confunde isto com uma fotografia), é da
 * linguagem da própria oficina, e desaparece assim que a fotografia real entrar.
 */

const T = {
  // --- discos e redondos ---------------------------------------------------
  disco: `<circle cx="100" cy="100" r="66"/><circle cx="100" cy="30" r="5"/>
    <path d="M62 92h76M62 104h60M62 116h44"/>`,
  circulo: `<circle cx="100" cy="100" r="58"/><circle cx="100" cy="100" r="48"/>
    <path d="M78 100h44M86 112h28"/>`,

  // --- corações ------------------------------------------------------------
  coracao: `<path d="M100 158C60 128 40 108 40 84a30 30 0 0 1 60-10 30 30 0 0 1 60 10c0 24-20 44-60 74Z"/>
    <path d="M74 92h52M82 106h36"/><circle cx="100" cy="42" r="4"/>`,

  // --- etiquetas e marcadores ----------------------------------------------
  etiqueta: `<path d="M64 44h72a8 8 0 0 1 8 8v92l-44 22-44-22V52a8 8 0 0 1 8-8Z"/>
    <circle cx="100" cy="62" r="5"/><path d="M76 92h48M76 106h36M76 120h44"/>`,

  // --- caixas --------------------------------------------------------------
  caixa: `<path d="M44 84h112v66H44z"/><path d="M44 84 62 58h76l18 26"/>
    <path d="M100 84v66"/><path d="M78 108h44"/>`,

  // --- placas --------------------------------------------------------------
  placa: `<path d="M40 62h120v76H40z"/><path d="M52 74h96v52H52z"/>
    <path d="M70 92h60M70 106h44"/>`,

  // --- moldura -------------------------------------------------------------
  moldura: `<path d="M48 44h104v104H48z"/><path d="M62 58h76v62H62z"/>
    <path d="M62 120l24-26 18 16 14-14 20 24"/><circle cx="118" cy="76" r="7"/>
    <path d="M78 134h44"/><path d="M100 148v18M82 166h36"/>`,

  // --- árvore genealógica --------------------------------------------------
  arvore: `<path d="M100 146V92"/>
    <path d="M100 116 76 92M100 108l26-18M100 130 80 116M100 124l22-14"/>
    <path d="M60 78a22 22 0 0 1 20-26 26 26 0 0 1 40-12 24 24 0 0 1 22 16 20 20 0 0 1-4 38Z"/>
    <circle cx="74" cy="66" r="4"/><circle cx="100" cy="52" r="4"/><circle cx="126" cy="64" r="4"/>
    <circle cx="112" cy="78" r="4"/><circle cx="86" cy="82" r="4"/>
    <path d="M56 146h88v16H56z"/><path d="M72 154h56"/>`,

  // --- letra com nome ------------------------------------------------------
  // Uma inicial grande com o nome em letra corrida por cima: é exactamente a
  // peça que ela faz, e não um alfabeto abstracto.
  letras: `<path d="M48 154V58l26 52 26-52v96"/>
    <path d="M60 116c14-12 26-8 30 0s-4 18-12 14 0-20 18-22 26 10 34 6"/>
    <path d="M124 154V58h22a24 24 0 0 1 0 48h-22"/><path d="M146 106l22 48"/>`,

  // --- régua ---------------------------------------------------------------
  regua: `<path d="M84 30h32v140H84z"/>
    <path d="M84 50h18M84 70h12M84 90h18M84 110h12M84 130h18M84 150h12"/>
    <path d="M116 50h-10M116 90h-10M116 130h-10"/>`,

  // --- nuvem ---------------------------------------------------------------
  nuvem: `<path d="M64 128a24 24 0 0 1 2-48 32 32 0 0 1 60-8 24 24 0 0 1 10 56Z"/>
    <path d="M78 108h44M86 118h28"/><path d="M100 128v22"/><circle cx="100" cy="158" r="5"/>`,

  // --- estrela -------------------------------------------------------------
  estrela: `<path d="m100 38 18 40 44 5-33 30 9 43-38-22-38 22 9-43-33-30 44-5Z"/>
    <path d="M84 100h32"/><circle cx="100" cy="26" r="4"/>`,

  // --- cruz ----------------------------------------------------------------
  cruz: `<path d="M86 34h28v44h40v28h-40v60H86v-60H46V78h40Z"/>
    <path d="M78 92h44"/>`,

  // --- vela ----------------------------------------------------------------
  vela: `<path d="M74 78h52v84H74z"/><path d="M100 78V58"/>
    <path d="M100 58c-10-10-4-22 0-28 4 6 10 18 0 28Z"/>
    <path d="M84 108h32M84 124h22"/>`,

  // --- topo de bolo --------------------------------------------------------
  // O recorte por cima e os dois espetos por baixo — é assim que a peça chega.
  // Uma tentativa anterior desenhava o floreado da letra corrida e lia-se como
  // uma mesa com um laço. Uma placa recortada com dois espetos lê-se logo.
  corte: `<path d="M46 52h108a10 10 0 0 1 10 10v44a10 10 0 0 1-10 10H46a10 10 0 0 1-10-10V62a10 10 0 0 1 10-10Z"/>
    <path d="M62 74h76M62 90h50"/>
    <path d="M78 116v44M122 116v44"/><path d="M78 160l-5 10M122 160l5 10"/>`,

  // --- troféu --------------------------------------------------------------
  trofeu: `<path d="M72 44h56v34a28 28 0 0 1-56 0Z"/>
    <path d="M72 52H56a14 14 0 0 0 16 20M128 52h16a14 14 0 0 1-16 20"/>
    <path d="M100 106v22M78 128h44v14H78z"/><path d="M68 156h64"/>
    <path d="M88 60h24"/>`,

  // --- escudo --------------------------------------------------------------
  escudo: `<path d="M100 36 46 54v52c0 34 24 52 54 62 30-10 54-28 54-62V54Z"/>
    <path d="M76 90h48M84 106h32"/><circle cx="100" cy="70" r="6"/>`,

  // --- coelho --------------------------------------------------------------
  coelho: `<ellipse cx="100" cy="128" rx="36" ry="34"/>
    <path d="M86 96c-8-26-8-44-2-52 8-4 12 16 12 44M114 96c8-26 8-44 2-52-8-4-12 16-12 44"/>
    <path d="M90 124a4 4 0 0 0 8 0M102 124a4 4 0 0 0 8 0"/><circle cx="100" cy="134" r="4"/>
    <path d="M82 148h36"/>`,

  // --- painel --------------------------------------------------------------
  painel: `<path d="M34 46h132v96H34z"/><path d="M34 142l16 22M166 142l-16 22"/>
    <path d="M56 78h88M56 96h60M56 114h74"/>`,
};

/**
 * Um desenho de linha para uma peça sem fotografia.
 * @param {string} forma  a chave do desenho
 * @param {string} nome   o nome da peça, escrito por baixo
 */
export function desenhoDaPeca(forma, nome) {
  const corpo = T[forma] ?? T.placa;
  return `<div class="corte" role="img" aria-label="Desenho de ${escapar(nome)}">
  <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      ${corpo}
    </g>
  </svg>
  <span class="corte__nome">${escapar(nome)}</span>
</div>`;
}

export const formasConhecidas = Object.keys(T);

function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
