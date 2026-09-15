// Bateria injectável: mede o que só o browser sabe.
window.__bateria = function () {
  const R = [];
  const nota = (ok, o, detalhe = '') => R.push({ ok: !!ok, o, detalhe: String(detalhe).slice(0, 180) });

  // --- transbordo lateral --------------------------------------------------
  const de = document.documentElement;
  nota(de.scrollWidth <= de.clientWidth + 1, 'não rola de lado',
    `scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}`);
  const transbordam = [...document.querySelectorAll('body *')]
    .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1
      && getComputedStyle(e).position !== 'fixed')
    .slice(0, 4).map((e) => `${e.tagName}.${(e.className || '').toString().split(' ')[0]}`);
  nota(transbordam.length === 0, 'nada passa da margem direita', transbordam.join(', '));

  // --- gaveta lateral ------------------------------------------------------
  // Mede-se o CONTEÚDO, não o contentor: o contentor é largo de propósito e o
  // respiro vive no seu `padding`. Medir a caixa dava sempre «0 px de respiro»
  // em todas as páginas — catorze falhas seguidas, nenhuma verdadeira.
  const conteudo = document.querySelector('main h1, main p, main .peca__nome');
  if (conteudo) {
    const r = conteudo.getBoundingClientRect();
    nota(r.left >= 15 && de.clientWidth - r.right >= 15, 'há pelo menos 16 px de respiro dos lados',
      `esquerda ${Math.round(r.left)} direita ${Math.round(de.clientWidth - r.right)}`);
  }

  // --- contraste -----------------------------------------------------------
  // A cor tem de ser normalizada pelo BROWSER, não lida com uma expressão
  // regular. Um `color-mix()` computado sai como `color(srgb 0.98 0.96 0.94)` —
  // números entre 0 e 1 — e tratá-los como 0-255 dá um fundo quase preto. Foi
  // isso que fez esta bateria acusar 31 falhas de contraste que não existiam:
  // o contraste real era 7:1 e ela dizia 2,7:1.
  // A cor é PINTADA e lida de volta, em vez de analisada com uma expressão
  // regular. É a única forma que funciona para todas as sintaxes: `rgb()`,
  // `#rrggbb`, `color(srgb …)` (o que um `color-mix()` computado devolve, com
  // números de 0 a 1) e `oklch()`. Sobre branco, para resolver a transparência.
  const tela = document.createElement('canvas');
  tela.width = tela.height = 1;
  const ctx2 = tela.getContext('2d', { willReadFrequently: true });
  const rgbDe = (c, porBaixo = 'rgb(255,255,255)') => {
    ctx2.clearRect(0, 0, 1, 1);
    ctx2.fillStyle = porBaixo; ctx2.fillRect(0, 0, 1, 1);
    ctx2.fillStyle = c; ctx2.fillRect(0, 0, 1, 1);
    const d = ctx2.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const lum = (c, porBaixo) => {
    const [r, g, b] = rgbDe(c, porBaixo).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const opaco = (c) => {
    if (!c || c === 'transparent') return false;
    const n = c.match(/[\d.]+/g);
    // O quarto número é a opacidade quando existe: um fundo a 0 não é fundo.
    return !(n && n.length === 4 && Number(n[3]) === 0);
  };
  const fundoDe = (el) => {
    let e = el;
    while (e && e !== document.documentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (opaco(c)) return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  };
  const corDoBody = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  const razao = (a, b) => {
    // O fundo pode ser translúcido (o cabeçalho é): compõe-se sobre o fundo do
    // corpo antes de medir. O texto compõe-se sobre o fundo já resolvido.
    const fundoResolvido = rgbDe(b, corDoBody);
    const fundoCss = `rgb(${fundoResolvido.join(',')})`;
    const [x, y] = [lum(a, fundoCss), lum(fundoCss)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const maus = [];
  const textos = [...document.querySelectorAll('p, a, li, h1, h2, h3, h4, span, button, label, td, th, summary, dt, dd')]
    .filter((e) => e.offsetParent !== null && e.textContent.trim().length > 1
      && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  for (const e of textos) {
    const s = getComputedStyle(e);
    const tam = parseFloat(s.fontSize);
    const grande = tam >= 24 || (tam >= 18.66 && Number(s.fontWeight) >= 700);
    const r = razao(s.color, fundoDe(e));
    const minimo = grande ? 3 : 4.5;
    if (r < minimo) {
      maus.push(`${e.tagName}.${(e.className || '').toString().split(' ')[0]} «${e.textContent.trim().slice(0, 26)}» ${r.toFixed(2)}:1 (min ${minimo})`);
    }
  }
  nota(maus.length === 0, `contraste de ${textos.length} textos`, maus.slice(0, 5).join(' · '));

  // --- alvos de toque ------------------------------------------------------
  /* Duas isenções, e as duas são da própria norma (WCAG 2.5.8):
     · um campo dentro de uma <label> tem como alvo A ETIQUETA INTEIRA, que é
       grande — medir a caixa de 20 px dá um falso positivo;
     · uma ligação no meio de uma frase está expressamente isenta.
     Sem elas, a bateria acusava dez alvos que não têm problema nenhum, e o
     ruído escondia os três que tinham. */
  const dentroDeEtiqueta = (e) => {
    const lab = e.closest('label');
    return !!lab && lab.getBoundingClientRect().height >= 23.5;
  };
  const noMeioDeUmaFrase = (e) => {
    if (e.tagName !== 'A') return false;
    const pai = e.parentElement;
    if (!pai) return false;
    const texto = pai.textContent.trim();
    return texto.length > e.textContent.trim().length + 3;
  };
  const pequenos = [...document.querySelectorAll('a, button, input[type=checkbox], input[type=radio], select')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ e, r }) => (r.height < 23.5 || r.width < 23.5)
      && !dentroDeEtiqueta(e) && !noMeioDeUmaFrase(e)
      && !e.closest('.migalhas, .rodape__legal, .prosa, .linha__opcoes'))
    .slice(0, 5)
    .map(({ e, r }) => `${e.tagName}«${e.textContent.trim().slice(0, 18)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
  nota(pequenos.length === 0, 'alvos de toque com pelo menos 24 px', pequenos.join(' · '));

  // --- imagens -------------------------------------------------------------
  // A prova de que uma imagem falhou é o ESTADO DA RESPOSTA, não o
  // `naturalWidth`: numa moldura fora do ecrã o browser troca de candidato a
  // meio e há um instante em que `complete` é verdade com `naturalWidth` a
  // zero. A primeira versão desta bateria acusou três imagens que carregam
  // perfeitamente numa página normal.
  const respostas = new Map(performance.getEntriesByType('resource')
    .map((r) => [r.name, r.responseStatus]));
  const partidas = [...document.images]
    .map((i) => i.currentSrc || i.src)
    .filter((u) => u && respostas.get(u) >= 400)
    .slice(0, 4);
  nota(partidas.length === 0, 'nenhuma imagem partida (pelo estado da resposta)', partidas.join(', '));
  const semAlt = [...document.images].filter((i) => i.alt === null || i.alt === undefined).length;
  nota(semAlt === 0, 'todas as imagens têm atributo alt', String(semAlt));

  // --- estrutura -----------------------------------------------------------
  nota(document.querySelectorAll('h1').length === 1, 'há exactamente um h1',
    String(document.querySelectorAll('h1').length));
  nota(!!document.querySelector('main#conteudo'), 'há um <main> com âncora');
  nota(document.documentElement.lang === 'pt-PT', 'a língua está declarada', document.documentElement.lang);
  const marca = document.documentElement.dataset.marca;
  nota(['ithos', 'cathelier', 'casa'].includes(marca), 'a marca vem no HTML servido', marca);

  // --- tipografia carregada ------------------------------------------------
  const esperadas = { ithos: ['Bodoni Moda', 'Outfit'], cathelier: ['Poiret One', 'Jost'], casa: ['Jost'] }[marca] ?? [];
  const carregadas = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
  for (const f of esperadas) nota(carregadas.includes(f), `tipo «${f}» carregado`, carregadas.join(', '));

  return { total: R.length, falhas: R.filter((x) => !x.ok), tudo: R };
};
'bateria pronta';
