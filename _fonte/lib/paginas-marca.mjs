/* As páginas que dão a cara às duas marcas: o portal, as duas casas, o catálogo
 * da ithos, a ficha de candeeiro, o índice de ocasiões da cathelier. */

import { esc, euros, figura, paras, md, temFoto } from './util.mjs';
import { personalizacao } from './dados.mjs';

/* ============================================================ o portal ==== */

export function portal(d, ctx) {
  const { l, raiz, base } = ctx;
  const { marcas, ithos } = d;
  const capa = ithos.find((p) => p.publicado && p.slug === 'raposa') ?? ithos.find((p) => p.publicado);

  return `
<section class="seccao" style="padding-block:clamp(2rem,6vw,4rem) 0">
  <div class="envolvente centrado" style="max-width:52ch">
    <p class="sobrescrito">Um ateliê, duas marcas</p>
    <h1 style="font-size:clamp(1.8rem,1.2rem+2.4vw,3rem)">Feito à mão em Portugal, peça a peça</h1>
    <p class="discreto">Escolha por onde quer entrar. São dois mundos diferentes, saídos das mesmas mãos.</p>
  </div>
</section>

<section class="portas envolvente">
  <a class="porta porta--ithos" href="${l('/ithos/')}" data-outra-marca>
    <div class="porta__foto">
      ${capa ? figura({ raiz, base, dir: capa.dir, nome: capa.fotos[0], alt: '',
        sizes: '(min-width: 48rem) 45vw, 90vw', prioridade: true }) : ''}
    </div>
    <div class="porta__corpo">
      <img class="porta__logo" src="${l('/assets/img/marca/ithos.svg')}" alt="ithos" width="120" height="129">
      <p class="porta__linha">Candeeiros de presença em madeira, para quartos de crianças.</p>
      <span class="porta__accao">Ver os candeeiros</span>
    </div>
  </a>

  <a class="porta porta--cathelier" href="${l('/cathelier/')}" data-outra-marca>
    <div class="porta__foto porta__foto--tipografica">
      <span>casamento</span><span>batizado</span><span>nascimento</span>
      <span>troféus</span><span>comunhão</span><span>decoração</span>
    </div>
    <div class="porta__corpo">
      <img class="porta__logo" src="${l('/assets/img/marca/cathelier.svg')}" alt="cathelier" width="142" height="92">
      <p class="porta__linha">Peças personalizadas para os dias que não se repetem.</p>
      <span class="porta__accao">Ver as ocasiões</span>
    </div>
  </a>
</section>

<section class="seccao">
  <div class="envolvente" style="display:grid;gap:var(--e5);grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))">
    <div>
      <p class="sobrescrito">O ateliê</p>
      <h2 style="font-size:clamp(1.4rem,1.1rem+1.4vw,2rem)">As mesmas mãos, dois ofícios</h2>
    </div>
    <div class="medida">
      ${paras(`Tudo o que aqui está sai de um ateliê pequeno em ${esc(d.identidade.localidade)}. A ithos nasceu dos candeeiros: madeira de pinho cortada, lixada, colada e pintada à mão, com LED por dentro. A cathelier nasceu do laser: madeira de bétula e acrílico, gravados com nomes e datas.\n\nSão duas marcas porque servem pessoas diferentes — mas é a mesma pessoa que faz, e é a mesma encomenda que segue.`)}
      <p><a class="ligacao" href="${l('/sobre/')}">Conhecer o ateliê</a></p>
    </div>
  </div>
</section>
`;
}

/* ========================================================= ithos: casa ==== */

export function casaIthos(d, ctx) {
  const { l, raiz, base } = ctx;
  const m = d.marcas.ithos;
  const publicados = d.ithos.filter((p) => p.publicado);
  const destaques = publicados.filter((p) => p.destaque).slice(0, 6);
  const capa = publicados.find((p) => p.slug === 'foguetao') ?? publicados[0];
  const nZonas = d.portes.zonas.find((z) => z.id === 'pt');

  return `
<section class="heroi">
  <div class="bolas" aria-hidden="true">
    <span class="bola bola--1"></span><span class="bola bola--2"></span>
    <span class="bola bola--3"></span><span class="bola bola--4"></span>
  </div>
  <div class="envolvente heroi__grelha">
    <div class="heroi__texto">
      <span class="sobrescrito">${esc(m.assinatura)}</span>
      <h1>${esc(m.hero_titulo)}</h1>
      <p>${esc(m.hero_texto)}</p>
      <div class="heroi__accoes">
        <a class="botao" href="${l('/ithos/candeeiros/')}">Ver os candeeiros</a>
        <a class="botao botao--vazio" href="${l('/ithos/como-e-feito/')}">Como é feito</a>
      </div>
    </div>
    <div class="heroi__peca">
      <div class="arco">
        ${capa ? figura({ raiz, base, dir: capa.dir, nome: capa.fotos[0], alt: `Candeeiro ${capa.nome} aceso`,
          sizes: '(min-width: 52rem) 46vw, 92vw', prioridade: true }) : ''}
      </div>
    </div>
  </div>
</section>

<section class="seccao seccao--apertada seccao--alt">
  <div class="envolvente argumentos">
    ${[
      ['Feito à mão, um a um', 'Cortado, lixado, colado e pintado no ateliê. Não há duas peças iguais.'],
      ['Com o nome gravado', 'Um nome, uma data ou uma frase, gravados a laser na madeira.'],
      ['Madeira de pinho e tinta de água', 'Materiais escolhidos a pensar em quem dorme ao lado.'],
      [`Entrega em ${nZonas?.dias_min ?? 1} a ${nZonas?.dias_max ?? 5} dias`, `Envio por ${esc(d.portes.transportadora)} para todo o país.`],
    ].map(([t, x]) => `<div class="argumento"><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join('\n    ')}
  </div>
</section>

${destaques.length ? `
<section class="seccao">
  <div class="envolvente">
    <div class="cabeca-seccao">
      <span class="sobrescrito">Os mais queridos</span>
      <h2>Alguns dos nossos ithos</h2>
    </div>
    <div class="grelha grelha--3">
      ${destaques.map((p) => cartaoPeca(p, ctx)).join('\n      ')}
    </div>
    <p style="margin-top:var(--e5)"><a class="botao botao--vazio" href="${l('/ithos/candeeiros/')}">Ver os ${publicados.length} candeeiros</a></p>
  </div>
</section>` : ''}

<section class="seccao seccao--alt">
  <div class="envolvente" style="display:grid;gap:clamp(2rem,5vw,4rem);grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));align-items:center">
    <div class="arco">
      ${(() => { const s = publicados.find((p) => p.slug === 'ourico'); return s ? figura({ raiz, base, dir: s.dir, nome: s.fotos[0], alt: '', sizes: '(min-width: 48rem) 45vw, 92vw' }) : ''; })()}
    </div>
    <div>
      <span class="sobrescrito">Sobre nós</span>
      <h2>${esc(m.sobre_titulo)}</h2>
      ${paras(m.sobre_texto)}
      <p style="margin-top:var(--e4)"><a class="ligacao" href="${l('/ithos/como-e-feito/')}">Ver como se faz um ithos</a></p>
    </div>
  </div>
</section>

<section class="seccao">
  <div class="envolvente centrado" style="max-width:46ch">
    <span class="sobrescrito">Também fazemos</span>
    <h2 style="font-size:clamp(1.3rem,1.1rem+1.2vw,1.9rem)">Lembranças e peças personalizadas</h2>
    <p class="discreto">A cathelier é a nossa outra marca: lembranças de casamento e batizado, troféus, nomes para a parede do quarto. Sai do mesmo ateliê.</p>
    <p><a class="botao botao--vazio" href="${l('/cathelier/')}" data-outra-marca>Conhecer a cathelier</a></p>
  </div>
</section>
`;
}

/* ==================================================== ithos: catálogo ===== */

export function catalogoIthos(d, ctx) {
  const { l } = ctx;
  const publicados = d.ithos.filter((p) => p.publicado);
  const precos = publicados.map((p) => p.preco).filter(Boolean);

  return `
<section class="seccao seccao--apertada">
  <div class="envolvente">
    <span class="sobrescrito">O catálogo</span>
    <h1>Candeeiros</h1>
    <p class="discreto medida">${publicados.length} modelos, todos feitos à mão. ${precos.length ? `De ${euros(Math.min(...precos))} a ${euros(Math.max(...precos))}.` : ''} Todos podem levar um nome gravado e escolher a cor.</p>
  </div>
</section>

<section class="envolvente" style="padding-bottom:var(--e7)">
  <div class="filtros" data-filtros>
    <button class="filtro" type="button" data-filtro="todos" aria-pressed="true">Todos</button>
    <button class="filtro" type="button" data-filtro="animais" aria-pressed="false">Animais</button>
    <button class="filtro" type="button" data-filtro="veiculos" aria-pressed="false">Veículos</button>
    <button class="filtro" type="button" data-filtro="natureza" aria-pressed="false">Natureza</button>
    <button class="filtro" type="button" data-filtro="festa" aria-pressed="false">Época festiva</button>
  </div>
  <div class="grelha grelha--3" data-lista-produtos style="margin-top:var(--e5)">
    ${publicados.map((p) => cartaoPeca(p, ctx, { familia: familia(p.slug) })).join('\n    ')}
  </div>
  <p class="discreto" data-sem-resultados hidden style="margin-top:var(--e5)">Não há candeeiros nesta família.</p>
</section>
`;
}

/** Famílias para os filtros. É deliberado não estar nos dados: a cliente não
 *  deve ter de classificar cada peça, e trinta e três peças não justificam um
 *  campo novo no backoffice que ela vai esquecer de preencher. */
function familia(slug) {
  const veiculos = ['carro-2', 'carro-3', 'comboio', 'foguetao', 'balao'];
  const natureza = ['bolota', 'cogumelo'];
  const festa = ['pai-natal'];
  if (veiculos.includes(slug)) return 'veiculos';
  if (natureza.includes(slug)) return 'natureza';
  if (festa.includes(slug)) return 'festa';
  return 'animais';
}

export function cartaoPeca(p, ctx, { familia: fam = '' } = {}) {
  const { l, raiz, base } = ctx;
  const foto = figura({
    raiz, base, dir: p.dir, nome: p.fotos[0], alt: `Candeeiro ${p.nome}`,
    sizes: '(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 90vw',
  });
  const etiqueta = p.estado === 'esgotado'
    ? '<span class="etiqueta etiqueta--esgotado">Esgotado</span>'
    : '';
  return `<a class="peca" href="${l(p.caminho)}"${fam ? ` data-familia="${esc(fam)}"` : ''}>
  <div class="peca__foto">${etiqueta}${foto}</div>
  <div class="peca__corpo">
    <h3 class="peca__nome">${esc(p.nome)}</h3>
    <p class="peca__resumo">${esc(p.resumo)}</p>
    <p class="peca__preco">${p.preco ? euros(p.preco) : 'Sob consulta'}</p>
  </div>
</a>`;
}

/* ======================================================= ithos: ficha ===== */

export function fichaIthos(p, d, ctx) {
  const { l, raiz, base } = ctx;
  const pers = personalizacao(p);
  const prazo = p.estado === 'em_stock' ? d.loja.prazos.texto_em_stock
    : p.estado === 'esgotado' ? d.loja.prazos.texto_esgotado
    : d.loja.prazos.texto_por_encomenda;

  const medidas = Object.entries(p.medidas ?? {})
    .map(([k, v]) => `<span><b>${{ altura: 'Altura', largura: 'Largura', profundidade: 'Profundidade', comprimento: 'Comprimento' }[k] ?? k}</b> ${String(v).replace('.', ',')} cm</span>`)
    .join('');

  const avisos = (p.gpsr?.avisos?.length ? p.gpsr.avisos : d.loja.avisos_seguranca_ithos);

  return `
<article class="envolvente ficha" data-produto="${esc(p.slug)}" data-preco="${p.preco ?? ''}">
  <div class="ficha__galeria">
    <div class="galeria">
      <div class="galeria__principal arco" data-galeria-principal>
        ${figura({ raiz, base, dir: p.dir, nome: p.fotos[0], alt: `Candeeiro ${p.nome}`,
          sizes: '(min-width: 56rem) 52vw, 92vw', prioridade: true })}
      </div>
      ${p.fotos.length > 1 ? `<div class="galeria__tiras" role="group" aria-label="Fotografias de ${esc(p.nome)}">
        ${p.fotos.map((f, i) => `<button class="galeria__tira" type="button" data-foto="${esc(f)}" aria-current="${i === 0}" aria-label="Fotografia ${i + 1}">
          ${figura({ raiz, base, dir: p.dir, nome: f, alt: '', sizes: '72px' })}
        </button>`).join('\n        ')}
      </div>` : ''}
    </div>
  </div>

  <div class="ficha__lado pilha">
    <div>
      <h1 style="margin-bottom:var(--e1)">${esc(p.nome)}</h1>
      <p class="discreto" style="margin:0">${esc(p.resumo)}</p>
    </div>

    <p class="preco" data-preco-mostrado>${p.preco ? euros(p.preco) : 'Sob consulta'}
      <small>${d.fiscal.regime === 'isento_art53' ? 'Preço final. Sem IVA — regime de isenção, artigo 53.º do CIVA.' : 'Preço final, com IVA incluído.'} Portes à parte.</small>
    </p>

    <p class="estado" data-estado="${esc(p.estado)}">${esc(prazo)}</p>

    ${medidas ? `<p class="medidas">${medidas}</p>` : ''}

    <form class="opcoes" data-form-produto>
      ${(p.opcoes ?? []).map((o) => campoOpcao(o, p)).join('\n      ')}

      ${p.estado === 'esgotado'
        ? `<p class="nota">Este candeeiro está esgotado de momento. Escreva-nos para <a class="ligacao" href="mailto:${esc(d.identidade.email)}?subject=${encodeURIComponent(`Aviso quando o ${p.nome} voltar`)}">${esc(d.identidade.email)}</a> e avisamos assim que voltar.</p>`
        : `<button class="botao botao--largo" type="submit" data-juntar>Juntar ao carrinho</button>`}
    </form>

    ${pers !== 'nunca' ? `<div class="nota" data-aviso-personalizacao${pers === 'depende' ? ' hidden' : ''}>
      <strong>Peça personalizada.</strong> Com gravação, esta peça é feita só para si: não há direito de livre resolução de ${d.loja.devolucoes.dias_livre_resolucao} dias (artigo 17.º n.º 1 alínea c) do Decreto-Lei 24/2014). A garantia de ${d.loja.devolucoes.garantia_anos} anos mantém-se.
    </div>` : ''}
    ${pers !== 'sempre' ? `<p class="pequeno discreto" data-aviso-devolucao${pers === 'depende' ? '' : ''}>Sem gravação, tem ${d.loja.devolucoes.dias_livre_resolucao} dias para devolver sem dar explicações. <a class="ligacao" href="${l('/legal/livre-resolucao/')}">Como se faz</a>.</p>` : ''}

    <div class="ficha__texto">
      ${paras(p.texto)}
    </div>

    <details class="seguranca painel">
      <summary>Segurança, materiais e conformidade</summary>
      <div class="pilha" style="margin-top:var(--e3)">
        <div>
          <h4>Avisos</h4>
          <ul>${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
        </div>
        <div>
          <h4>Fabricante</h4>
          <p class="pequeno discreto" style="margin:0">
            ${esc(d.identidade.nome)}${d.identidade.morada ? `, ${esc(d.identidade.morada)}, ${esc(d.identidade.codigo_postal)} ${esc(d.identidade.localidade)}, Portugal` : ''}<br>
            <a class="ligacao" href="mailto:${esc(d.identidade.email)}">${esc(d.identidade.email)}</a>
            ${p.gpsr?.tipo ? `<br>Tipo: ${esc(p.gpsr.tipo)}` : ''}${p.gpsr?.lote ? ` · Lote: ${esc(p.gpsr.lote)}` : ''}
          </p>
        </div>
        <p class="pequeno discreto" style="margin:0">Instruções de utilização, limpeza e substituição de pilhas em <a class="ligacao" href="${l('/ithos/cuidados-e-seguranca/')}">cuidados e segurança</a>.</p>
      </div>
    </details>
  </div>
</article>

<section class="seccao seccao--alt">
  <div class="envolvente">
    <div class="cabeca-seccao"><h2 style="font-size:clamp(1.2rem,1rem+1vw,1.6rem)">Talvez também goste</h2></div>
    <div class="grelha grelha--3">
      ${d.ithos.filter((o) => o.publicado && o.slug !== p.slug).slice(0, 3).map((o) => cartaoPeca(o, ctx)).join('\n      ')}
    </div>
  </div>
</section>
`;
}

function campoOpcao(o, p) {
  if (o.tipo === 'escolha') {
    return `<fieldset class="grupo" data-opcao="${esc(o.id)}" data-personaliza="${o.personaliza ? 'sim' : 'nao'}">
  <legend>${esc(o.nome)}</legend>
  <div class="escolhas">
    ${o.valores.map((v, i) => `<label class="escolha">
      <input type="radio" name="${esc(o.id)}" value="${esc(v.id ?? v)}" data-suplemento="${v.suplemento ?? 0}"${i === 0 ? ' checked' : ''}${o.obrigatoria ? ' required' : ''}>
      <span>${esc(v.nome ?? v)}${v.suplemento ? ` · +${euros(v.suplemento)}` : ''}</span>
    </label>`).join('\n    ')}
  </div>
  ${o.ajuda ? `<p class="campo__ajuda">${esc(o.ajuda)}</p>` : ''}
</fieldset>`;
  }
  // texto livre = personalização, e é isto que tira o direito de livre resolução
  return `<div class="campo" data-opcao="${esc(o.id)}" data-personaliza="${o.personaliza ? 'sim' : 'nao'}">
  <label for="op-${esc(p.slug)}-${esc(o.id)}">${esc(o.nome)}${o.suplemento ? ` · +${euros(o.suplemento)}` : ''}</label>
  <input type="text" id="op-${esc(p.slug)}-${esc(o.id)}" name="${esc(o.id)}"
    maxlength="${o.max ?? 40}" data-suplemento="${o.suplemento ?? 0}"
    placeholder="${esc(o.ajuda ? '' : 'Deixe em branco se não quiser')}" autocomplete="off">
  <p class="campo__ajuda">${esc(o.ajuda ?? '')} <span data-contador>0/${o.max ?? 40}</span></p>
</div>`;
}

/* ===================================================== cathelier: casa ==== */

export function casaCathelier(d, ctx) {
  const { l } = ctx;
  const m = d.marcas.cathelier;
  const cats = d.categorias.filter((c) => c.publicado);

  return `
<section class="heroi-c">
  <div class="envolvente">
    <span class="sobrescrito">${esc(m.assinatura)}</span>
    <h1>${esc(m.hero_titulo)}</h1>
    <p>${esc(m.hero_texto)}</p>
    <div class="heroi-c__accoes">
      <a class="botao" href="${l('/cathelier/orcamento/')}">Pedir orçamento</a>
      <a class="botao botao--vazio" href="#ocasioes">Ver as ocasiões</a>
    </div>
  </div>
</section>

<section class="seccao" id="ocasioes">
  <div class="envolvente">
    <div class="cabeca-seccao">
      <hr class="fio--curto">
      <h2>Ocasiões</h2>
      <p>Cada ocasião pede uma peça diferente. Estas são as que mais fazemos — mas não há catálogo fechado.</p>
    </div>
    <div class="indice">
      ${cats.map((c) => `<a class="indice__linha" href="${l(c.caminho)}">
        <h3 class="indice__nome">${esc(c.nome)}</h3>
        <p class="indice__resumo">${esc(c.resumo)}</p>
        <span class="indice__seta">Ver &rarr;</span>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="seccao seccao--alt">
  <div class="envolvente">
    <div class="cabeca-seccao"><hr class="fio--curto"><h2>Como trabalhamos</h2></div>
    <div class="passos">
      <div class="passo"><h3>Conte-nos</h3><p>A ocasião, a quantidade, a data. Se já tiver uma ideia ou uma imagem, ainda melhor.</p></div>
      <div class="passo"><h3>Desenhamos</h3><p>Fazemos uma proposta com maqueta e preço. Ajusta-se até estar como quer.</p></div>
      <div class="passo"><h3>Cortamos e gravamos</h3><p>A laser, em madeira de bétula ou acrílico. Cada peça passa pela mão antes de sair.</p></div>
      <div class="passo"><h3>Enviamos</h3><p>Por ${esc(d.portes.transportadora)}, embalado para aguentar a viagem.</p></div>
    </div>
  </div>
</section>

<section class="seccao">
  <div class="envolvente" style="display:grid;gap:clamp(2rem,5vw,4rem);grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))">
    <div><hr class="fio--curto"><h2>${esc(m.sobre_titulo)}</h2></div>
    <div class="medida">${paras(m.sobre_texto)}</div>
  </div>
</section>

<section class="seccao seccao--alt">
  <div class="envolvente centrado" style="max-width:44ch">
    <hr class="fio--curto" style="margin-inline:auto">
    <h2 style="font-size:clamp(1.2rem,1rem+1.2vw,1.8rem)">Também fazemos candeeiros</h2>
    <p class="discreto">A ithos é a nossa outra marca: luzes de presença em madeira, para quartos de crianças. Sai do mesmo ateliê.</p>
    <p><a class="botao botao--vazio" href="${l('/ithos/')}" data-outra-marca>Conhecer a ithos</a></p>
  </div>
</section>
`;
}

/* ================================================ cathelier: categoria ==== */

export function categoriaCathelier(c, d, ctx) {
  const { l, raiz, base } = ctx;
  const pecas = d.pecas.filter((p) => p.categoria === c.slug && p.publicado);

  return `
<section class="envolvente categoria">
  <div class="categoria__cabeca">
    <hr class="fio--curto">
    <h1>${esc(c.nome)}</h1>
    <p class="discreto">${esc(c.resumo)}</p>
  </div>

  <div style="display:grid;gap:clamp(2rem,5vw,4rem);grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))">
    <div class="medida">${paras(c.texto)}</div>
    <div>
      <h2 style="font-size:1rem">O que fazemos para esta ocasião</h2>
      <ul class="tipos">${c.tipos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p style="margin-top:var(--e4)">
        <a class="botao" href="${l(`/cathelier/orcamento/?ocasiao=${encodeURIComponent(c.slug)}`)}">Pedir orçamento para ${esc(c.nome.toLowerCase())}</a>
      </p>
    </div>
  </div>

  ${pecas.length ? `
  <div style="margin-top:clamp(3rem,6vw,5rem)">
    <hr class="fio">
    <h2 style="margin-top:var(--e5);font-size:1.2rem">Trabalhos feitos</h2>
    <div class="trabalhos">
      ${pecas.map((p) => `<figure class="trabalho">
        ${temFoto(raiz, p.dir, (p.fotos ?? [])[0] ?? '')
          ? `<div class="foto">${figura({ raiz, base, dir: p.dir, nome: p.fotos[0], alt: esc(p.nome), sizes: '(min-width: 48rem) 20rem, 90vw' })}</div>`
          : `<div class="sem-foto"><span>${esc(p.nome)}</span></div>`}
        <figcaption><b>${esc(p.nome)}</b>${p.resumo ? esc(p.resumo) : ''}</figcaption>
      </figure>`).join('\n      ')}
    </div>
  </div>` : ''}
</section>

<section class="seccao seccao--alt">
  <div class="envolvente">
    <hr class="fio--curto">
    <h2 style="font-size:1.2rem">Outras ocasiões</h2>
    <div class="indice" style="margin-top:var(--e4)">
      ${d.categorias.filter((o) => o.publicado && o.slug !== c.slug).slice(0, 4).map((o) => `<a class="indice__linha" href="${l(o.caminho)}">
        <h3 class="indice__nome">${esc(o.nome)}</h3>
        <p class="indice__resumo">${esc(o.resumo)}</p>
        <span class="indice__seta">Ver &rarr;</span>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>
`;
}
