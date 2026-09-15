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

  /* ------------------------------------------------------------- menu ----- */

  const topo = $('.topo');
  const botaoMenu = $('.abrir-menu');
  if (topo && botaoMenu) {
    botaoMenu.addEventListener('click', () => {
      const aberto = topo.dataset.aberto === 'sim';
      topo.dataset.aberto = aberto ? 'nao' : 'sim';
      botaoMenu.setAttribute('aria-expanded', String(!aberto));
    });
    // Fechar com Escape devolve o foco ao botão: senão o foco fica num menu que
    // já não está no ecrã e a tabulação parece partida.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && topo.dataset.aberto === 'sim') {
        topo.dataset.aberto = 'nao';
        botaoMenu.setAttribute('aria-expanded', 'false');
        botaoMenu.focus();
      }
    });
  }

  /* ------------------------------------------ transição entre as marcas --- */
  // A cortina só entra quando se atravessa de uma marca para a outra. Dentro da
  // mesma marca é um fundido curto.
  for (const a of $$('[data-outra-marca]')) {
    a.addEventListener('click', () => { document.documentElement.dataset.trocaMarca = 'sim'; });
  }

  /* ------------------------------------------------------------ surgir ---- */

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const alvos = $$('.seccao, .peca, .indice__linha, .porta');
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
        const mostra = alvo === 'todos' || p.dataset.familia === alvo;
        // `hidden` não esconde nada se o CSS declarar `display` no elemento — e
        // `.peca` declara `display:flex`. Por isso mexe-se no `display`.
        p.style.display = mostra ? '' : 'none';
        if (mostra) visiveis++;
      }
      if (semResultados) semResultados.hidden = visiveis > 0;
    });
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
      return `<div class="linha" data-linha="${escapar(idLinha(l))}">
  <div class="linha__foto"><img src="${escapar(l.prod.capa)}" alt="" loading="lazy"></div>
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

  function escapar(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  pintarConta();
})();
