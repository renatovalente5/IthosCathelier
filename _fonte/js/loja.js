/* ==========================================================================
   ithos · cathelier — o que corre no browser

   Regras que não se quebram:
   1. O carrinho guarda IDENTIFICADORES, quantidades e opções. Nunca preços.
   2. Os preços vêm do catálogo gerado pela construção, e quem cobra é o Worker,
      que volta a calcular tudo do zero a partir do mesmo ficheiro.
   3. Nada aqui é preciso para VER o site: sem JavaScript, as páginas continuam
      a ler-se e a navegar-se. Só o carrinho precisa.
   ========================================================================== */

(() => {
  'use strict';

  const BASE = '__BASE__';
  const API = '__API__';
  const CHAVE = 'ic-carrinho-v1';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const euros = (n) => new Intl.NumberFormat('pt-PT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);

  /* ------------------------------------------------------ armazenamento --- */

  /** O `localStorage` pode rebentar: janela privada, dados do sítio bloqueados,
   *  quota cheia. Nunca pode partir a página. */
  function lerCesto() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (!b) return { linhas: [], pais: 'PT' };
      const c = JSON.parse(b);
      return { linhas: Array.isArray(c.linhas) ? c.linhas : [], pais: c.pais || 'PT' };
    } catch { return { linhas: [], pais: 'PT' }; }
  }
  function gravarCesto(c) {
    try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* segue sem guardar */ }
    pintarConta(c);
    document.dispatchEvent(new CustomEvent('cesto-mudou', { detail: c }));
  }

  const idLinha = (l) => `${l.id}|${Object.entries(l.opcoes || {}).sort().map(([k, v]) => `${k}=${v}`).join('&')}`;

  function pintarConta(c = lerCesto()) {
    const n = c.linhas.reduce((s, l) => s + l.qtd, 0);
    for (const el of $$('[data-cesto-conta]')) {
      el.textContent = n || '';
      el.dataset.vazio = n ? 'nao' : 'sim';
    }
  }

  /* ---------------------------------------------------------- catálogo ---- */

  let catalogoPromessa = null;
  /** Lê o ponteiro e depois o catálogo com o resumo no nome. O ponteiro é
   *  pequeno e muda sempre; o catálogo é imutável e pode ficar em cache. */
  function catalogo() {
    catalogoPromessa ??= (async () => {
      const r = await fetch(`${BASE}/dados/catalogo-atual.txt`, { cache: 'no-cache' });
      if (!r.ok) throw new Error('catálogo indisponível');
      const hash = (await r.text()).trim();
      const r2 = await fetch(`${BASE}/dados/catalogo.${hash}.json`);
      if (!r2.ok) throw new Error('catálogo indisponível');
      const dados = await r2.json();
      dados.hash = hash;
      return dados;
    })();
    return catalogoPromessa;
  }

  /** O preço de uma linha, a partir do catálogo. Em cêntimos e em inteiros: com
   *  vírgula flutuante, 0,1 + 0,2 não dá 0,3, e um cêntimo a menos numa conta
   *  de portes é uma reclamação. */
  function precoLinhaCent(prod, linha) {
    let cent = Math.round(prod.preco * 100);
    for (const o of prod.opcoes || []) {
      const escolhido = (linha.opcoes || {})[o.id];
      if (o.tipo === 'escolha') {
        const v = (o.valores || []).find((x) => String(x.id) === String(escolhido));
        if (v) cent += Math.round((v.suplemento || 0) * 100);
      } else if (escolhido && String(escolhido).trim()) {
        cent += Math.round((o.suplemento || 0) * 100);
      }
    }
    return cent;
  }

  function zonaDoPais(cat, codigo) {
    return cat.portes.zonas.find((z) => z.paises.includes(codigo))
      ?? cat.portes.zonas.find((z) => z.paises.some((p) => p.slice(0, 2) === codigo.slice(0, 2)));
  }

  /** Uma encomenda, uma remessa, uns portes — mesmo com peças das duas marcas.
   *  A campanha de portes grátis é lida do catálogo, nunca escrita aqui. */
  function contas(cat, cesto) {
    const linhas = [];
    let artigosCent = 0;
    for (const l of cesto.linhas) {
      const prod = cat.produtos[l.id];
      if (!prod) continue;                 // saiu do catálogo: ignora-se em silêncio
      const unitCent = precoLinhaCent(prod, l);
      const totalCent = unitCent * l.qtd;
      artigosCent += totalCent;
      linhas.push({ ...l, prod, unitCent, totalCent });
    }
    const zona = zonaDoPais(cat, cesto.pais);
    let portesCent = zona ? Math.round(zona.preco * 100) : 0;
    let campanha = false;
    const c = cat.portes.campanha;
    if (c?.ativa && c.portes_gratis_acima > 0 && artigosCent >= Math.round(c.portes_gratis_acima * 100)
        && (!c.paises?.length || c.paises.includes(cesto.pais))) {
      campanha = true;
      portesCent = 0;
    }
    return { linhas, artigosCent, portesCent, zona, campanha, totalCent: artigosCent + portesCent };
  }

  /* --------------------------------------------------- aviso de cookies --- */

  /* Uma resposta só, guardada localmente. «sim» é o único estado que autoriza
     carregar o mapa da Google — o resto do site não usa terceiros nenhuns, por
     isso não há nada mais a autorizar. */
  const CHAVE_COOKIES = 'ic-cookies-v1';
  const respostaCookies = () => {
    try { return localStorage.getItem(CHAVE_COOKIES); } catch { return null; }
  };
  const responderCookies = (v) => {
    try { localStorage.setItem(CHAVE_COOKIES, v); } catch { /* segue sem guardar */ }
    document.documentElement.dataset.cookies = v;
    document.dispatchEvent(new CustomEvent('cookies-respondidas', { detail: v }));
  };

  {
    const caixa = $('[data-cookies]');
    const ja = respostaCookies();
    if (ja) document.documentElement.dataset.cookies = ja;
    if (caixa && !ja) {
      caixa.hidden = false;
      const fechar = (v) => { responderCookies(v); caixa.hidden = true; };
      $('[data-cookies-sim]', caixa)?.addEventListener('click', () => fechar('sim'));
      $('[data-cookies-nao]', caixa)?.addEventListener('click', () => fechar('nao'));
    }
  }

  /* ------------------------------------------------------------- menu ----- */

  {
    const gaveta = $('#menu');
    const abrir = $('.abrir-menu');
    if (gaveta && abrir) {
      const fechar = () => { if (gaveta.open) gaveta.close(); };
      abrir.addEventListener('click', () => {
        // `showModal` trata do foco, da armadilha de tabulação e de tornar o
        // resto da página inerte. Escrever isso à mão são três promessas que
        // quase ninguém cumpre até ao fim.
        gaveta.showModal();
        abrir.setAttribute('aria-expanded', 'true');
        $('.gaveta__menu a', gaveta)?.focus();
      });
      $('.fechar-menu', gaveta)?.addEventListener('click', fechar);
      // Seguir uma ligação fecha a gaveta: sem isto, voltar atrás no browser
      // devolve a página com o menu ainda por cima.
      for (const a of $$('.gaveta a', gaveta)) a.addEventListener('click', fechar);
      gaveta.addEventListener('close', () => {
        abrir.setAttribute('aria-expanded', 'false');
        abrir.focus();
      });
      // O <dialog> já fecha com Esc sozinho; isto é só para o caso de o
      // browser não o fazer.
      gaveta.addEventListener('cancel', () => abrir.setAttribute('aria-expanded', 'false'));
    }
  }

  /* -------------------------------------------- cabeçalho a encolher ------
     O cabeçalho encolhe quando a sentinela de 1 px sai do ecrã. Um
     IntersectionObserver em vez de um ouvinte de `scroll`: o ouvinte corre a
     cada pixel e, com um limiar só, faz o logótipo tremer entre dois tamanhos
     quando alguém pára a rolagem mesmo em cima dele.

     Se o JavaScript falhar, fica a barra grande — que é o estado pedido. */
  {
    const topo = $('.topo');
    const sentinela = $('.sentinela');
    if (topo && sentinela && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        topo.dataset.compacto = e.isIntersecting ? 'nao' : 'sim';
      }, { threshold: 0 }).observe(sentinela);
    }
  }

  /* ------------------------------------------ a loja ainda não abriu ------ */
  /* Enquanto o catálogo disser `previa`, os botões que levam dinheiro ficam
   * desligados e dizem porquê. A tarja no topo prometia isto desde o primeiro
   * dia — «não é possível comprar» — e o botão continuava a funcionar.
   *
   * Isto é a CORTESIA. Quem trava a sério é o Worker, que recusa criar sessão
   * de pagamento quando o catálogo vem em pré-visualização: o que o browser
   * manda não se acredita. */
  {
    catalogo().then((cat) => {
      if (!cat.previa) return;
      for (const b of $$('[data-juntar], [data-pagar], [data-ir-encomenda]')) {
        // `aria-disabled` e não `disabled`: um botão desativado perde o foco e
        // quem navega por teclado fica sem saber onde está.
        b.setAttribute('aria-disabled', 'true');
        b.dataset.previa = 'sim';
        b.title = 'A loja ainda não abriu.';
      }
      // O aviso vai a seguir ao PRÓPRIO botão, e não a um contentor que se
      // presume existir: o `data-produto` vive no `<article>` e não no
      // `<form>`, e a primeira versão disto não escrevia nada em lado nenhum.
      for (const b of $$('[data-juntar], [data-pagar], [data-ir-encomenda]')) {
        const depois = b.nextElementSibling;
        if (depois?.dataset?.avisoPrevia) continue;
        const aviso = document.createElement('p');
        aviso.className = 'pequeno discreto';
        aviso.dataset.avisoPrevia = 'sim';
        aviso.style.marginTop = 'var(--e2)';
        aviso.textContent = 'A loja ainda não abriu — ainda não é possível comprar.';
        b.after(aviso);
      }
    }).catch(() => { /* sem catálogo não há nada a desligar */ });
  }

  /* -------------------------------------------------- subir ao topo ------- */
  // Aparece depois de se ter descido uma altura de ecrã. Usa-se um
  // IntersectionObserver sobre a sentinela que já existe no topo — e não um
  // ouvinte de `scroll`, que corre a cada pixel.
  {
    const botao = $('.subir');
    const sentinela = $('.sentinela');
    if (botao && sentinela && 'IntersectionObserver' in window) {
      botao.hidden = false;
      new IntersectionObserver(([e]) => {
        botao.dataset.visivel = e.isIntersecting ? 'nao' : 'sim';
      }, { rootMargin: '100% 0px 0px 0px' }).observe(sentinela);

      botao.addEventListener('click', (ev) => {
        ev.preventDefault();
        const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' });
        // O foco tem de voltar ao princípio do documento, senão quem navega por
        // teclado continua onde estava e a página «subiu» só para o rato.
        const saltar = $('.saltar');
        if (saltar) { saltar.focus({ preventScroll: true }); }
      });
    }
  }

  /* ------------------------------------------------ rodapé em acordeão ---- */
  // Os grupos saem ABERTOS do gerador; aqui só se FECHAM, e só ao estreito.
  // Se este ficheiro não correr, o rodapé fica como sempre foi — aberto e
  // inteiro. O modo de falha é o estado antigo, não um rodapé mudo.
  {
    const grupos = $$('.rodape__grupo');
    if (grupos.length) {
      const estreito = matchMedia('(width < 60rem)');
      const arrumar = () => { for (const g of grupos) g.open = !estreito.matches; };
      arrumar();
      estreito.addEventListener('change', arrumar);
    }
  }

  /* ------------------------------------------ transição entre as marcas --- */
  // A cortina só entra quando se atravessa de uma marca para a outra. Dentro da
  // mesma marca é um fundido curto.
  for (const a of $$('[data-outra-marca]')) {
    a.addEventListener('click', () => { document.documentElement.dataset.trocaMarca = 'sim'; });
  }

  /* ------------------------------------------------------------ surgir ---- */

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    // A `.peca` e a `.indice__linha` NÃO entram: são a montra, e com quatro
    // vezes mais cartões no primeiro ecrã, qualquer captura feita antes de o
    // IntersectionObserver disparar mostra a loja vazia — e o `loading=lazy`
    // das fotografias fica adiado à espera de uma animação.
    const alvos = $$('.seccao, .porta');
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const a of alvos) { a.classList.add('surge'); obs.observe(a); }
  }

  /* ------------------------------------------------ filtros do catálogo --- */

  const caixaFiltros = $('[data-filtros]');
  if (caixaFiltros) {
    const lista = $('[data-lista-produtos]');
    const semResultados = $('[data-sem-resultados]');
    caixaFiltros.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      for (const outro of $$('[data-filtro]', caixaFiltros)) {
        outro.setAttribute('aria-pressed', String(outro === b));
      }
      const alvo = b.dataset.filtro;
      let visiveis = 0;
      for (const p of $$('[data-familia]', lista)) {
        // Uma peça pode pertencer a várias listas («Nascimento» e «Pendentes»),
        // e por isso compara-se com a lista e não com uma palavra só.
        const mostra = alvo === 'todos' || p.dataset.familia.split(' ').includes(alvo);
        // `hidden` não esconde nada se o CSS declarar `display` no elemento — e
        // `.peca` declara `display:flex`. Por isso mexe-se no `display`.
        p.style.display = mostra ? '' : 'none';
        if (mostra) visiveis++;
      }
      if (semResultados) semResultados.hidden = visiveis > 0;
      // Uma pastilha escolhida NUNCA pode ficar escondida atrás do «+N»: se se
      // escolher uma da quarta linha e a fila voltasse a encolher, a página
      // ficava filtrada sem se ver por quê. Uma vez aberta, fica aberta.
      abrirFila();
    });

    /* ---- as pastilhas não cabem todas: encolher para duas linhas --------
     *
     * A fila rolava de lado e escondia 927 px de pastilhas na cathelier sem
     * aviso nenhum. Agora muda de linha — mas onze pastilhas dão cinco linhas,
     * e isso empurra o primeiro produto para fora do ecrã. Fica em duas, com
     * uma pastilha «+N» a dizer quantas faltam.
     *
     * Mede-se, não se adivinha: quantas cabem em duas linhas depende da
     * largura do ecrã, do tipo de letra e do comprimento dos nomes, e nenhuma
     * dessas coisas se sabe daqui. E remede-se quando a janela muda de tamanho
     * ou quando o tipo de letra acaba de carregar, senão a conta é feita com
     * as medidas da letra de recurso. */
    const pastilhas = $$('[data-filtro]', caixaFiltros);
    let aberta = false;

    const mais = document.createElement('button');
    mais.type = 'button';
    mais.className = 'filtro filtro--mais';
    mais.hidden = true;
    mais.addEventListener('click', abrirFila);
    caixaFiltros.appendChild(mais);

    function abrirFila() {
      aberta = true;
      for (const b of pastilhas) b.hidden = false;
      mais.hidden = true;
    }

    function encolherFila() {
      if (aberta) return;
      for (const b of pastilhas) b.hidden = false;
      mais.hidden = false;
      mais.textContent = '+0';

      // O topo de cada pastilha diz em que linha está. Duas linhas = os dois
      // primeiros valores distintos.
      const topos = [...new Set(pastilhas.map((b) => Math.round(b.offsetTop)))].sort((a, b) => a - b);
      if (topos.length <= 2) { mais.hidden = true; return; }   // cabem todas

      const limite = topos[1];
      let escondidas = 0;
      for (const b of pastilhas) {
        if (Math.round(b.offsetTop) > limite) { b.hidden = true; escondidas++; }
      }
      // O próprio «+N» ocupa lugar. Se depois de o pôr ele for parar à terceira
      // linha, esconde-se mais uma pastilha até ele caber — senão o remédio
      // acrescentava a linha que veio tirar.
      mais.textContent = `+${escondidas}`;
      let guarda = pastilhas.length;
      while (Math.round(mais.offsetTop) > limite && guarda-- > 0) {
        const ultima = pastilhas.filter((b) => !b.hidden).pop();
        if (!ultima || ultima === pastilhas[0]) break;         // «Todos» fica sempre
        ultima.hidden = true;
        escondidas++;
        mais.textContent = `+${escondidas}`;
      }
      mais.setAttribute('aria-label', `Mostrar mais ${escondidas} filtros`);
    }

    encolherFila();
    addEventListener('resize', encolherFila, { passive: true });
    // As pastilhas medem-se com a letra de recurso enquanto a verdadeira não
    // chegou, e a conta muda quando ela chega.
    if (document.fonts?.ready) document.fonts.ready.then(encolherFila);
  }

  /* ---------------------------------------------------- ficha de produto -- */

  const artigo = $('[data-produto]');
  if (artigo) prepararFicha(artigo);

  function prepararFicha(art) {
    const slug = art.dataset.produto;
    const form = $('[data-form-produto]', art);
    const mostrado = $('[data-preco-mostrado]', art);
    const base = Number(art.dataset.preco);
    const avisoPers = $('[data-aviso-personalizacao]', art);
    const avisoDev = $('[data-aviso-devolucao]', art);

    // galeria
    const principal = $('[data-galeria-principal]', art);
    for (const b of $$('.galeria__tira', art)) {
      b.addEventListener('click', () => {
        const fig = $('picture', b);
        if (fig && principal) {
          principal.innerHTML = fig.outerHTML;
          const img = $('img', principal);
          if (img) { img.removeAttribute('loading'); img.setAttribute('fetchpriority', 'high'); }
          // O `sizes` do miniatura é de 72 px: se ficar, a imagem grande vem
          // pixelizada. Repõe-se o da principal.
          for (const s of $$('source', principal)) s.setAttribute('sizes', '(min-width: 56rem) 52vw, 92vw');
          if (img) img.setAttribute('sizes', '(min-width: 56rem) 52vw, 92vw');
        }
        for (const o of $$('.galeria__tira', art)) o.setAttribute('aria-current', String(o === b));
      });
    }

    // contador de caracteres do texto a gravar
    for (const campo of $$('[data-opcao] input[type="text"]', art)) {
      const contador = $('[data-contador]', campo.closest('[data-opcao]'));
      const max = campo.maxLength;
      const pinta = () => { if (contador) contador.textContent = `${campo.value.length}/${max}`; };
      campo.addEventListener('input', pinta);
      pinta();
    }

    function lerOpcoes() {
      const o = {};
      for (const grupo of $$('[data-opcao]', art)) {
        const id = grupo.dataset.opcao;
        const radio = $(`input[type="radio"]:checked`, grupo);
        const texto = $('input[type="text"]', grupo);
        if (radio) o[id] = radio.value;
        else if (texto && texto.value.trim()) o[id] = texto.value.trim();
      }
      return o;
    }

    function actualizar() {
      let total = base;
      for (const grupo of $$('[data-opcao]', art)) {
        const radio = $('input[type="radio"]:checked', grupo);
        const texto = $('input[type="text"]', grupo);
        if (radio) total += Number(radio.dataset.suplemento || 0);
        else if (texto && texto.value.trim()) total += Number(texto.dataset.suplemento || 0);
      }
      if (mostrado) {
        const pequeno = $('small', mostrado);
        mostrado.textContent = euros(total);
        if (pequeno) mostrado.appendChild(pequeno);
      }
      // Personaliza? Então não há livre resolução — e o aviso tem de aparecer
      // ANTES de se juntar ao carrinho, não só no fim.
      const personaliza = $$('[data-opcao][data-personaliza="sim"]', art).some((g) => {
        const t = $('input[type="text"]', g);
        const r = $('input[type="radio"]:checked', g);
        return (t && t.value.trim()) || (r && r.value);
      });
      if (avisoPers) avisoPers.hidden = !personaliza;
      if (avisoDev) avisoDev.hidden = personaliza;
    }

    art.addEventListener('input', actualizar);
    art.addEventListener('change', actualizar);
    actualizar();

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const botao = $('[data-juntar]', form);
      // A loja ainda não abriu: não se junta nada ao carrinho. O aviso já está
      // escrito por baixo do botão; aqui só se impede a acção.
      if (botao?.dataset.previa === 'sim') return;
      const cesto = lerCesto();
      const nova = { id: slug, marca: 'ithos', qtd: 1, opcoes: lerOpcoes() };
      const existente = cesto.linhas.find((l) => idLinha(l) === idLinha(nova));
      if (existente) existente.qtd += 1; else cesto.linhas.push(nova);
      gravarCesto(cesto);
      if (botao) {
        const antes = botao.textContent;
        botao.textContent = 'Juntou ao carrinho ✓';
        setTimeout(() => { botao.textContent = antes; }, 1800);
      }
    });
  }

  /* --------------------------------------------------------- carrinho ----- */

  if ($('[data-carrinho-cheio]')) pintarCarrinho();

  async function pintarCarrinho() {
    const vazio = $('[data-carrinho-vazio]');
    const cheio = $('[data-carrinho-cheio]');
    const selPais = $('[data-pais]');
    let cat;
    try { cat = await catalogo(); } catch {
      vazio.hidden = false;
      vazio.innerHTML = '<p>Não conseguimos carregar o catálogo. Verifique a ligação e recarregue a página.</p>';
      return;
    }

    const cesto = lerCesto();
    if (selPais) {
      if ([...selPais.options].some((o) => o.value === cesto.pais)) selPais.value = cesto.pais;
      else cesto.pais = selPais.value;
      selPais.addEventListener('change', () => {
        const c = lerCesto(); c.pais = selPais.value; gravarCesto(c); desenhar();
      });
    }

    function desenhar() {
      const c = lerCesto();
      const r = contas(cat, c);
      vazio.hidden = r.linhas.length > 0;
      cheio.hidden = r.linhas.length === 0;
      if (!r.linhas.length) return;

      // Agrupar por marca não é estética: a ithos entrega em 3 dias úteis e a
      // cathelier é por encomenda. Um cesto misto transformaria em silêncio uma
      // entrega de 3 dias numa de 20.
      const porMarca = {};
      for (const l of r.linhas) (porMarca[l.prod.marca] ??= []).push(l);

      $('[data-carrinho-grupos]').innerHTML = Object.entries(porMarca).map(([marca, linhas]) => {
        const porEncomenda = linhas.some((l) => l.prod.estado !== 'em_stock');
        const prazo = porEncomenda ? cat.prazos.texto_por_encomenda : cat.prazos.texto_em_stock;
        // O logótipo a 22 px é um borrão. Aqui o que importa é dizer de que
        // marca são estas linhas e qual é o prazo delas — e isso lê-se melhor
        // escrito na tipografia da própria marca.
        return `<div class="grupo-marca" data-marca-grupo="${marca}">
  <div class="grupo-marca__cabeca">
    <span class="grupo-marca__nome">${marca}</span>
    <span class="pequeno discreto">${prazo}</span>
  </div>
  ${linhas.map(linhaHtml).join('')}
</div>`;
      }).join('');

      $('[data-conta-artigos]').textContent = euros(r.artigosCent / 100);
      $('[data-conta-portes]').textContent = r.portesCent ? euros(r.portesCent / 100) : 'Grátis';
      $('[data-conta-zona]').textContent = r.zona ? r.zona.nome : '—';
      $('[data-conta-total]').textContent = euros(r.totalCent / 100);
      const linhaPoupanca = $('[data-linha-poupanca]');
      if (linhaPoupanca) linhaPoupanca.hidden = !r.campanha;
      if (r.campanha) $('[data-conta-poupanca]').textContent = 'campanha ativa';
    }

    function linhaHtml(l) {
      const opcoes = Object.entries(l.opcoes || {}).map(([k, v]) => {
        const o = (l.prod.opcoes || []).find((x) => x.id === k);
        if (!o) return null;
        const nome = o.tipo === 'escolha'
          ? (o.valores.find((x) => String(x.id) === String(v))?.nome ?? v)
          : `«${v}»`;
        return `${o.nome}: ${nome}`;
      }).filter(Boolean).join(' · ');
      // As peças da cathelier ainda podem não ter fotografia. Em vez de um
      // quadrado partido, o mesmo desenho de linha que a ficha mostra.
      const miniatura = l.prod.capa
        ? `<img src="${escapar(l.prod.capa)}" alt="" loading="lazy">`
        : `<span class="linha__forma" aria-hidden="true">${formaSvg(l.prod.forma)}</span>`;
      return `<div class="linha" data-linha="${escapar(idLinha(l))}">
  <div class="linha__foto">${miniatura}</div>
  <div>
    <p class="linha__nome"><a href="${escapar(l.prod.caminho)}">${escapar(l.prod.nome)}</a></p>
    ${opcoes ? `<p class="linha__opcoes">${escapar(opcoes)}</p>` : ''}
    <div class="linha__fim">
      <span class="qtd">
        <button type="button" data-menos aria-label="Tirar um">−</button>
        <span>${l.qtd}</span>
        <button type="button" data-mais aria-label="Juntar um">+</button>
      </span>
      <button class="tirar" type="button" data-tirar>Tirar</button>
    </div>
  </div>
  <p class="linha__preco">${euros(l.totalCent / 100)}</p>
</div>`;
    }

    $('[data-carrinho-grupos]').addEventListener('click', (e) => {
      const linha = e.target.closest('[data-linha]');
      if (!linha) return;
      const c = lerCesto();
      const alvo = c.linhas.find((l) => idLinha(l) === linha.dataset.linha);
      if (!alvo) return;
      if (e.target.closest('[data-mais]')) alvo.qtd = Math.min(alvo.qtd + 1, 20);
      else if (e.target.closest('[data-menos]')) alvo.qtd -= 1;
      else if (e.target.closest('[data-tirar]')) alvo.qtd = 0;
      else return;
      c.linhas = c.linhas.filter((l) => l.qtd > 0);
      gravarCesto(c);
      desenhar();
    });

    desenhar();
  }

  /* -------------------------------------------------------- encomenda ---- */

  if ($('[data-encomenda-cheia]')) prepararEncomenda();

  async function prepararEncomenda() {
    const vazia = $('[data-encomenda-vazia]');
    const cheia = $('[data-encomenda-cheia]');
    const erro = $('[data-erro-encomenda]');
    let cat;
    try { cat = await catalogo(); } catch {
      vazia.hidden = false;
      vazia.innerHTML = '<p>Não conseguimos carregar o catálogo. Recarregue a página.</p>';
      return;
    }

    const c = lerCesto();
    const r = contas(cat, c);
    vazia.hidden = r.linhas.length > 0;
    cheia.hidden = r.linhas.length === 0;
    if (!r.linhas.length) return;

    $('[data-resumo-linhas]').innerHTML = r.linhas.map((l) => {
      const opcoes = Object.entries(l.opcoes || {}).map(([k, v]) => {
        const o = (l.prod.opcoes || []).find((x) => x.id === k);
        return o ? `${o.nome}: ${o.tipo === 'escolha' ? (o.valores.find((x) => String(x.id) === String(v))?.nome ?? v) : `«${v}»`}` : null;
      }).filter(Boolean).join(' · ');
      return `<p style="display:flex;justify-content:space-between;gap:1rem;margin-bottom:.5rem">
        <span>${l.qtd}× <strong>${escapar(l.prod.nome)}</strong>${opcoes ? `<br><span class="pequeno discreto">${escapar(opcoes)}</span>` : ''}</span>
        <span style="white-space:nowrap">${euros(l.totalCent / 100)}</span>
      </p>`;
    }).join('');

    $('[data-conta-artigos]').textContent = euros(r.artigosCent / 100);
    $('[data-conta-portes]').textContent = r.portesCent ? euros(r.portesCent / 100) : 'Grátis';
    $('[data-conta-pais]').textContent = r.zona ? r.zona.nome : '—';
    $('[data-conta-total]').textContent = euros(r.totalCent / 100);

    // O prazo é o do artigo mais demorado: é esse que o comprador tem de aceitar
    // expressamente, com o máximo legal de 30 dias em vista.
    const porEncomenda = r.linhas.some((l) => l.prod.estado !== 'em_stock');
    const diasProducao = porEncomenda ? cat.prazos.producao_dias : cat.prazos.expedicao_em_stock_dias;
    const transporte = r.zona ? `${r.zona.dias_min} a ${r.zona.dias_max} dias úteis` : '—';
    $('[data-prazo-texto]').textContent =
      `${porEncomenda ? `Há peças feitas por encomenda: até ${diasProducao} dias úteis de produção.` : `As peças estão em stock: saem em até ${diasProducao} dias úteis.`} Depois de expedida, a entrega demora ${transporte}.`;
    $('[data-prazo-aceitacao]').textContent =
      `Aceito que a entrega possa demorar até ${diasProducao} dias úteis de produção mais ${transporte} de transporte.`;

    const personalizadas = r.linhas.filter((l) => Object.entries(l.opcoes || {}).some(([k, v]) => {
      const o = (l.prod.opcoes || []).find((x) => x.id === k);
      return o?.personaliza && String(v).trim();
    }));
    const bloco = $('[data-bloco-personalizadas]');
    if (personalizadas.length) {
      bloco.hidden = false;
      $('[data-lista-personalizadas]').innerHTML = personalizadas
        .map((l) => `<li>${escapar(l.prod.nome)}</li>`).join('');
    }

    $('[data-pagar]').addEventListener('click', async (e) => {
      const botao = e.currentTarget;            // guardado ANTES do primeiro await
      if (botao.dataset.previa === 'sim') {
        erro.hidden = false;
        erro.textContent = 'A loja ainda não abriu. Ainda não é possível pagar.';
        return;
      }
      erro.hidden = true;

      const obrigatorias = $$('input[type="checkbox"][required]', cheia)
        .filter((x) => !x.closest('[hidden]'));
      const falta = obrigatorias.find((x) => !x.checked);
      if (falta) {
        erro.hidden = false;
        erro.textContent = 'Para continuar, confirme as caixas acima.';
        falta.focus();
        return;
      }

      // `aria-disabled` em vez de `disabled`: um botão desativado perde o foco,
      // e o foco vai parar ao `body` — quem navega por teclado fica sem saber
      // onde está.
      botao.setAttribute('aria-disabled', 'true');
      const antes = botao.textContent;
      botao.textContent = 'A preparar o pagamento…';

      try {
        const resposta = await fetch(`${API}/checkout`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            hash: cat.hash,
            pais: c.pais,
            linhas: c.linhas.map((l) => ({ id: l.id, qtd: l.qtd, opcoes: l.opcoes || {} })),
          }),
        });
        const dados = await resposta.json().catch(() => ({}));
        if (resposta.status === 409) {
          erro.hidden = false;
          erro.textContent = 'Os preços foram atualizados enquanto estava a comprar. Recarregue a página e confirme antes de continuar.';
          return;
        }
        if (!resposta.ok || !dados.url) throw new Error(dados.erro || 'sem resposta');
        location.href = dados.url;
      } catch (falha) {
        erro.hidden = false;
        erro.textContent = 'Não foi possível abrir o pagamento. Tente outra vez daqui a pouco, ou escreva-nos.';
        console.error(falha);
      } finally {
        botao.removeAttribute('aria-disabled');
        botao.textContent = antes;
      }
    });
  }

  /* --------------------------------------------------------- obrigado ---- */

  const detalhe = $('[data-obrigado-detalhe]');
  if (detalhe) {
    const id = new URLSearchParams(location.search).get('session_id');
    if (!id) {
      detalhe.innerHTML = '<p class="discreto">Se acabou de encomendar, vai receber a confirmação por email.</p>';
    } else {
      fetch(`${API}/sessao?id=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sem resposta'))))
        .then((s) => {
          try { localStorage.removeItem(CHAVE); } catch { /* nada */ }
          pintarConta({ linhas: [] });
          detalhe.innerHTML = `<p><strong>Encomenda ${escapar(s.referencia || '')}</strong></p>
            <p class="discreto">${escapar(s.estado === 'pago'
              ? 'Pagamento confirmado. Vamos começar a preparar a sua encomenda.'
              : 'Estamos a aguardar a confirmação do pagamento. Avisamos por email assim que estiver.')}</p>`;
        })
        .catch(() => {
          detalhe.innerHTML = '<p class="discreto">A encomenda foi registada. A confirmação segue por email.</p>';
        });
    }
  }

  /* ---------------------------------------------------------------- mapa -- */

  const caixaMapa = $('[data-mapa]');
  if (caixaMapa) {
    const endereco = caixaMapa.dataset.mapa;
    const zoom = caixaMapa.dataset.zoom || '13';
    const carregar = () => {
      if (caixaMapa.querySelector('iframe')) return;
      const f = document.createElement('iframe');
      f.src = `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&z=${zoom}&output=embed`;
      f.loading = 'lazy';
      f.title = `Mapa de ${endereco}`;
      f.referrerPolicy = 'no-referrer-when-downgrade';
      caixaMapa.innerHTML = '';
      caixaMapa.classList.add('mapa__caixa--carregado');
      caixaMapa.appendChild(f);
    };
    if (respostaCookies() === 'sim') carregar();
    document.addEventListener('cookies-respondidas', (e) => { if (e.detail === 'sim') carregar(); });
    $('[data-mapa-carregar]')?.addEventListener('click', () => { responderCookies('sim'); carregar(); });
  }

  /* -------------------------------------------------------- orçamento ---- */

  const formOrc = $('[data-form-orcamento]');
  if (formOrc) {
    const ocasiao = new URLSearchParams(location.search).get('ocasiao');
    if (ocasiao) {
      const sel = $('#o-ocasiao', formOrc);
      if (sel && [...sel.options].some((o) => o.value === ocasiao)) sel.value = ocasiao;
    }
    formOrc.addEventListener('submit', async (e) => {
      e.preventDefault();
      const botao = $('button[type="submit"]', formOrc);
      const erro = $('[data-erro-orcamento]');
      const estado = $('[data-estado-orcamento]');
      erro.hidden = true;
      if (!formOrc.checkValidity()) {
        erro.hidden = false;
        erro.textContent = 'Faltam campos obrigatórios.';
        formOrc.reportValidity();
        return;
      }
      botao.setAttribute('aria-disabled', 'true');
      const antes = botao.textContent;
      botao.textContent = 'A enviar…';
      try {
        const corpo = Object.fromEntries(new FormData(formOrc).entries());
        const r = await fetch(`${API}/orcamento`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
        });
        if (!r.ok) throw new Error('sem resposta');
        formOrc.reset();
        estado.hidden = false;
        estado.textContent = 'Pedido enviado. Respondemos em dois dias úteis.';
      } catch {
        erro.hidden = false;
        erro.innerHTML = 'Não conseguimos enviar o pedido. Escreva-nos diretamente por email ou WhatsApp.';
      } finally {
        botao.removeAttribute('aria-disabled');
        botao.textContent = antes;
      }
    });
  }

  /* Um desenho muito simples por forma — o suficiente para a miniatura do
     carrinho não ser um buraco. O desenho completo vive no gerador. */
  const FORMAS = {
    disco: '<circle cx="12" cy="12" r="8"/>',
    circulo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/>',
    coracao: '<path d="M12 19c-5-4-7-6-7-8a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 2-2 4-7 8Z"/>',
    etiqueta: '<path d="M7 4h10v13l-5 3-5-3Z"/>',
    caixa: '<path d="M4 9h16v11H4z"/><path d="m4 9 2-4h12l2 4"/>',
    placa: '<rect x="3" y="6" width="18" height="12" rx="1"/>',
    moldura: '<rect x="5" y="4" width="14" height="14"/><path d="M12 18v3"/>',
    arvore: '<path d="M12 20v-7"/><circle cx="12" cy="9" r="5"/><path d="M7 20h10"/>',
    letras: '<path d="M5 19V5l4 8 4-8v14"/><path d="M16 19V5h3a3 3 0 0 1 0 7h-3"/>',
    regua: '<rect x="9" y="3" width="6" height="18"/><path d="M9 7h3M9 12h3M9 17h3"/>',
    nuvem: '<path d="M7 16a3 3 0 0 1 .4-6 4.5 4.5 0 0 1 8.3-1A3 3 0 0 1 17 16Z"/>',
    estrela: '<path d="m12 4 2.4 5.2 5.6.7-4.2 3.8 1.1 5.5L12 16.4 7.1 19.2l1.1-5.5L4 9.9l5.6-.7Z"/>',
    cruz: '<path d="M10 4h4v5h5v4h-5v7h-4v-7H5V9h5Z"/>',
    vela: '<rect x="8" y="9" width="8" height="11"/><path d="M12 9V6"/>',
    corte: '<rect x="4" y="5" width="16" height="8" rx="2"/><path d="M9 13v6M15 13v6"/>',
    trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M12 13v3M9 19h6"/>',
    escudo: '<path d="M12 4 6 6v5c0 4 3 6 6 7 3-1 6-3 6-7V6Z"/>',
    coelho: '<ellipse cx="12" cy="15" rx="5" ry="4.5"/><path d="M10 11c-1-4-1-6 0-7 1 0 1.5 3 1.5 6M14 11c1-4 1-6 0-7-1 0-1.5 3-1.5 6"/>',
    painel: '<rect x="3" y="5" width="18" height="11"/><path d="M3 16l2 3M21 16l-2 3"/>',
  };
  function formaSvg(forma) {
    const d = FORMAS[forma] || FORMAS.placa;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" `
      + `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }

  function escapar(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  pintarConta();
})();
