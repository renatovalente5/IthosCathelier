/* As páginas que dão a cara às duas marcas: o portal, as duas casas, o catálogo
 * da ithos, a ficha de candeeiro, o índice de ocasiões da cathelier. */

import { esc, euros, figura, paras, md, temFoto } from './util.mjs';
import { desenhoDaPeca } from './formas.mjs';
import { personalizacao } from './dados.mjs';

/* ============================================================== a loja ===== */

/* A raiz É a loja. O portal de duas portas que aqui estava gastava a página
 * mais valiosa a fazer uma pergunta — e quem chega do Instagram não quer
 * escolher uma marca, quer ver um candeeiro. A cathelier continua a ter casa
 * própria; deixou é de disputar a porta de entrada. */

export function paginaInicial(d, ctx) {
  const { l, raiz, base } = ctx;
  const m = d.marcas.ithos;
  const publicados = d.ithos.filter((p) => p.publicado);
  const destaques = [
    ...publicados.filter((p) => p.destaque),
    ...publicados.filter((p) => !p.destaque),
  ].slice(0, 12);
  const capa = publicados.find((p) => p.slug === 'raposa') ?? publicados[0];
  const zonaPt = d.portes.zonas.find((z) => z.id === 'pt');
  const cats = d.categorias.filter((c) => c.publicado && c.pecas.length).slice(0, 4);


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
        <a class="botao" href="${l('/candeeiros/')}">Ver os candeeiros</a>
      </div>
    </div>
    <div class="heroi__peca">
      <div class="arco">
        ${capa ? figura({ raiz, base, dir: capa.dir, nome: capa.fotos[capa.fotos.length - 1] ?? capa.fotos[0],
          alt: `Candeeiro ${capa.nome} aceso num quarto`,
          sizes: '(min-width: 52rem) 46vw, 92vw', prioridade: true }) : ''}
      </div>
    </div>
  </div>
</section>

<!-- Quatro factos, todos lidos dos dados. Sem estrelas nem «54 opiniões»: não
     há sistema de avaliações, e inventá-las é prática comercial desleal. -->
<section class="confianca">
  <div class="envolvente confianca__tira">
    <span>Feito à mão em ${esc(d.identidade.localidade)}</span>
    <span>Até ${d.loja.prazos.producao_dias} dias úteis de produção</span>
    <span>Portes ${euros(zonaPt?.preco ?? 5)} para todo o país</span>
    <span>Garantia legal de ${d.loja.devolucoes.garantia_anos} anos</span>
  </div>
</section>

<section class="seccao" id="candeeiros">
  <div class="envolvente">
    <div class="cabeca-seccao">
      <span class="sobrescrito">Feitos um a um</span>
      <h2>Os candeeiros</h2>
    </div>
    <div class="grelha grelha--montra">
      ${destaques.map((p) => cartaoPeca(p, ctx)).join('\n      ')}
    </div>
    <p style="margin-top:var(--e5)">
      <a class="botao botao--vazio" href="${l('/candeeiros/')}">Ver os ${publicados.length} candeeiros →</a>
    </p>
  </div>
</section>

<section class="seccao seccao--alt">
  <div class="envolvente bilhete">
    <div class="arco bilhete__foto">
      ${(() => { const s = publicados.find((x) => x.slug === 'ourico'); return s ? figura({ raiz, base, dir: s.dir, nome: s.fotos[0], alt: '', sizes: '(min-width: 48rem) 40vw, 92vw' }) : ''; })()}
    </div>
    <div class="bilhete__texto">
      <span class="sobrescrito">Sobre nós</span>
      <h2>${esc(m.sobre_titulo)}</h2>
      ${paras(m.sobre_texto.split('\n\n').slice(0, 2).join('\n\n'))}
      <p class="bilhete__assinatura">Cathia</p>
      <p><a class="ligacao" href="${l('/sobre/#como-e-feito')}">Como é feito →</a></p>
    </div>
  </div>
</section>

<!-- A porta da cathelier veste-se da cathelier: vê-se o outro sítio ATRAVÉS da
     porta, em vez de se ler uma placa a dizer que ele existe. -->
<section class="porta-cathelier" data-marca="cathelier">
  <div class="envolvente">
    <img class="porta-cathelier__logo" src="${l('/assets/img/marca/cathelier.svg')}" alt="cathelier" width="117" height="54">
    <p class="porta-cathelier__linha">Também fazemos as peças com o nome de quem as recebe —
      casamento, batizado, nascimento, quarto de criança.</p>
    <ul class="porta-cathelier__ocasioes">
      ${cats.map((c) => `<li><a href="${l(c.caminho)}">${esc(c.nome)} <span>${c.pecas.length} peças</span></a></li>`).join('\n      ')}
    </ul>
    <p><a class="botao botao--vazio" href="${l('/cathelier/')}" data-outra-marca>Ver a cathelier →</a></p>
  </div>
</section>

<!-- As perguntas frequentes saíram daqui. Viviam em quatro sítios: nesta
     página, em /contactos/#perguntas, na ficha de cada peça, e agora também no
     grupo «Apoio ao cliente» do rodapé, que sai nas 93 páginas. Na primeira
     página estavam a empurrar a montra para baixo — e a montra é o que a dona
     da loja quer que se veja. -->
`;
}

/* ==================================================== ithos: catálogo ===== */

export function catalogoIthos(d, ctx) {
  const { l } = ctx;
  const publicados = d.ithos.filter((p) => p.publicado);
  const precos = publicados.map((p) => p.preco).filter(Boolean);

  return `
<!-- «Breve apresentação e LOGO os ithos». Breve é breve: sai o sobrescrito
     manuscrito, que aqui era decoração a ocupar uma linha inteira, e a
     apresentação e os filtros passam a viver na mesma secção que a grelha —
     duas secções com espaçamento próprio somavam um ecrã antes do
     primeiro candeeiro. -->
<section class="envolvente catalogo-topo">
  <h1>Candeeiros</h1>
  <p class="discreto medida">${publicados.length} modelos, todos feitos à mão. ${precos.length ? `De ${euros(Math.min(...precos))} a ${euros(Math.max(...precos))}.` : ''} Todos podem levar um nome gravado.</p>
  <div class="filtros" data-filtros>
    <button class="filtro" type="button" data-filtro="todos" aria-pressed="true">Todos</button>
    <button class="filtro" type="button" data-filtro="animais" aria-pressed="false">Animais</button>
    <button class="filtro" type="button" data-filtro="veiculos" aria-pressed="false">Veículos</button>
    <button class="filtro" type="button" data-filtro="natureza" aria-pressed="false">Natureza</button>
    <button class="filtro" type="button" data-filtro="festa" aria-pressed="false">Época festiva</button>
  </div>
  <div class="grelha grelha--montra" data-lista-produtos style="margin-top:var(--e5)">
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

/* O cartão da montra: fotografia, nome, preço. Mais nada.
 *
 * O resumo saiu daqui. A dona escreveu «as frases estão giras MAS é difícil te
 * dizer itho rato ou itho gato» — a frase poética estava a disputar com o nome
 * a linha que identifica o animal. E há uma medida por trás: com o resumo, o
 * cartão mede 318 px de altura e num telemóvel de 667 px cabem DOIS por ecrã;
 * sem ele mede 271 px e cabem os QUATRO que ela pediu. As frases não se
 * perderam — vivem na ficha, que é onde vendem, e na Google.
 *
 * O `sizes` foi recalculado para as colunas novas. O antigo declarava 90vw no
 * telemóvel e o browser trazia a imagem de 800 px para uma caixa de 165 px:
 * numa página com 26 candeeiros eram megabytes a mais, a cada visita. */
export function cartaoPeca(p, ctx, { familia: fam = '' } = {}) {
  const { l, raiz, base } = ctx;
  const foto = figura({
    raiz, base, dir: p.dir, nome: p.fotos[0], alt: `Candeeiro ${p.nome}`,
    sizes: '(min-width: 71.25rem) 250px, (min-width: 60rem) 23vw, (min-width: 40rem) 30vw, 45vw',
  });
  const etiqueta = p.estado === 'esgotado'
    ? '<span class="etiqueta etiqueta--esgotado">Esgotado</span>'
    : '';
  return `<a class="peca" href="${l(p.caminho)}"${fam ? ` data-familia="${esc(fam)}"` : ''}>
  <div class="peca__foto">${etiqueta}${foto}</div>
  <div class="peca__corpo">
    <h3 class="peca__nome">${esc(p.nome)}</h3>
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
        <p class="pequeno discreto" style="margin:0">Instruções de utilização, limpeza e substituição de pilhas em <a class="ligacao" href="${l('/cuidados-e-seguranca/')}">cuidados e segurança</a>.</p>
      </div>
    </details>
  </div>
</article>

<section class="seccao seccao--alt">
  <div class="envolvente">
    <div class="cabeca-seccao"><h2 style="font-size:clamp(1.2rem,1rem+1vw,1.6rem)">Talvez também goste</h2></div>
    <div class="grelha grelha--montra">
      ${d.ithos.filter((o) => o.publicado && o.slug !== p.slug).slice(0, 4).map((o) => cartaoPeca(o, ctx)).join('\n      ')}
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
    <p><a class="botao botao--vazio" href="${l('/')}" data-outra-marca>Conhecer a ithos</a></p>
  </div>
</section>
`;
}

/* ================================================ cathelier: categoria ==== */

export function categoriaCathelier(c, d, ctx) {
  const { l } = ctx;
  const pecas = d.pecas.filter((p) => p.categoria === c.slug && p.publicado);
  const outras = d.categorias.filter((o) => o.publicado && o.slug !== c.slug && o.pecas.length);

  return `
<section class="envolvente categoria">
  <div class="categoria__cabeca">
    <hr class="fio--curto">
    <h1>${esc(c.nome)}</h1>
    <p class="discreto">${esc(c.resumo)}</p>
  </div>

  <div class="categoria__intro">
    <div class="medida">${paras(c.texto)}</div>
    <div>
      <h2 class="rotulo">O que fazemos para esta ocasião</h2>
      <ul class="tipos">${c.tipos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>
  </div>

  ${pecas.length ? `
  <div class="categoria__pecas">
    <hr class="fio">
    <h2>${pecas.length === 1 ? 'A peça' : `As ${pecas.length} peças`}</h2>
    <div class="grelha grelha--montra-c">
      ${pecas.map((p) => cartaoPecaCathelier(p, ctx)).join('\n      ')}
    </div>
  </div>` : ''}

  <!-- O pedido de orçamento vem DEPOIS das peças, não antes.
       Antes delas, pedia a alguém que descrevesse o que queria sem nunca ter
       visto o que se faz — e é aí que a maior parte das pessoas desiste. -->
  <div class="categoria__pedido">
    <h2>Quer uma peça que não está aqui?</h2>
    <p class="discreto">Diga-nos a ocasião, a quantidade e a data. Respondemos em dois dias úteis com uma proposta e uma maqueta.</p>
    <p><a class="botao" href="${l(`/cathelier/orcamento/?ocasiao=${encodeURIComponent(c.slug)}`)}">Pedir orçamento para ${esc(c.nome.toLowerCase())}</a></p>
  </div>
</section>

${outras.length ? `<section class="seccao seccao--alt">
  <div class="envolvente">
    <hr class="fio--curto">
    <h2>Outras ocasiões</h2>
    <div class="indice" style="margin-top:var(--e4)">
      ${outras.slice(0, 4).map((o) => `<a class="indice__linha" href="${l(o.caminho)}">
        <h3 class="indice__nome">${esc(o.nome)}</h3>
        <p class="indice__resumo">${esc(o.resumo)}</p>
        <span class="indice__seta">${o.pecas.length} peças &rarr;</span>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}
`;
}

/* ==================================================== cathelier: peças ===== */

/** A imagem de uma peça: a fotografia, se existir; senão, o desenho da linha
 *  de corte. Nunca uma caixa vazia. */
export function imagemDaPeca(p, ctx, { sizes = '(min-width: 48rem) 20rem, 90vw', prioridade = false } = {}) {
  const { raiz, base } = ctx;
  const primeira = (p.fotos ?? [])[0];
  if (primeira && temFoto(raiz, p.dir, primeira)) {
    return figura({ raiz, base, dir: p.dir, nome: primeira, alt: p.nome, sizes, prioridade });
  }
  return desenhoDaPeca(p.forma, p.nome);
}

export function cartaoPecaCathelier(p, ctx) {
  const { l } = ctx;
  return `<a class="peca peca--c" href="${l(p.caminho)}">
  <div class="peca__foto">${imagemDaPeca(p, ctx)}</div>
  <div class="peca__corpo">
    <span class="peca__ocasiao">${esc(p.categoriaNome ?? '')}</span>
    <h3 class="peca__nome">${esc(p.nome)}</h3>
    <p class="peca__resumo">${esc(p.resumo)}</p>
    <p class="peca__preco">${p.preco ? `desde ${euros(p.preco)}` : 'Sob consulta'}</p>
  </div>
</a>`;
}

export function catalogoCathelier(d, ctx) {
  const { l } = ctx;
  const pecas = d.pecas.filter((p) => p.publicado);
  const cats = d.categorias.filter((c) => c.publicado && c.pecas.length);
  const precos = pecas.map((p) => p.preco).filter(Boolean);

  return `
<section class="seccao seccao--apertada">
  <div class="envolvente">
    <hr class="fio--curto">
    <h1>Todas as peças</h1>
    <p class="discreto medida">${pecas.length} peças, todas feitas por encomenda.
      ${precos.length ? `Desde ${euros(Math.min(...precos))}.` : ''}
      Cada uma leva os nomes, as datas ou a frase que escolher — e mandamos sempre uma
      maqueta para aprovar antes de cortar.</p>
  </div>
</section>

<section class="envolvente" style="padding-bottom:var(--e7)">
  <div class="filtros" data-filtros>
    <button class="filtro" type="button" data-filtro="todos" aria-pressed="true">Todas</button>
    ${cats.map((c) => `<button class="filtro" type="button" data-filtro="${esc(c.slug)}" aria-pressed="false">${esc(c.nome)}</button>`).join('\n    ')}
  </div>
  <div class="grelha grelha--montra-c" data-lista-produtos style="margin-top:var(--e5)">
    ${pecas.map((p) => cartaoPecaCathelier(p, { ...ctx }).replace('class="peca peca--c"', `class="peca peca--c" data-familia="${esc(p.categoria)}"`)).join('\n    ')}
  </div>
  <p class="discreto" data-sem-resultados hidden style="margin-top:var(--e5)">Não há peças nesta ocasião.</p>
</section>
`;
}

export function fichaCathelier(p, d, ctx) {
  const { l, raiz, base } = ctx;
  const pers = personalizacao(p);
  const outras = d.pecas
    .filter((o) => o.publicado && o.slug !== p.slug && o.categoria === p.categoria)
    .slice(0, 3);
  const fotos = (p.fotos ?? []).filter((f) => temFoto(raiz, p.dir, f));

  return `
<article class="envolvente ficha ficha--c" data-produto="c-${esc(p.slug)}" data-preco="${p.preco ?? ''}">
  <div class="ficha__galeria">
    <div class="galeria__principal" data-galeria-principal>
      ${imagemDaPeca(p, ctx, { sizes: '(min-width: 56rem) 52vw, 92vw', prioridade: true })}
    </div>
    ${fotos.length > 1 ? `<div class="galeria__tiras" role="group" aria-label="Fotografias de ${esc(p.nome)}">
      ${fotos.map((f, i) => `<button class="galeria__tira" type="button" data-foto="${esc(f)}" aria-current="${i === 0}" aria-label="Fotografia ${i + 1}">
        ${figura({ raiz, base, dir: p.dir, nome: f, alt: '', sizes: '72px' })}
      </button>`).join('\n      ')}
    </div>` : ''}
    ${!fotos.length ? `<p class="pequeno discreto" style="text-align:center">
      Desenho da peça. A fotografia do trabalho real entra em breve.</p>` : ''}
  </div>

  <div class="ficha__lado pilha">
    <div>
      <p class="sobrescrito" style="margin-bottom:var(--e1)">${esc(p.categoriaNome ?? '')}</p>
      <h1 style="margin-bottom:var(--e2)">${esc(p.nome)}</h1>
      <p class="discreto" style="margin:0">${esc(p.resumo)}</p>
    </div>

    <p class="preco" data-preco-mostrado>${p.preco ? euros(p.preco) : 'Sob consulta'}
      <small>${d.fiscal.regime === 'isento_art53' ? 'Preço final. Sem IVA — regime de isenção, artigo 53.º do CIVA.' : 'Preço final, com IVA incluído.'} Portes à parte.</small>
    </p>

    <p class="estado" data-estado="${esc(p.estado ?? 'por_encomenda')}">${esc(d.loja.prazos.texto_por_encomenda)}</p>

    <form class="opcoes" data-form-produto>
      ${(p.opcoes ?? []).map((o) => campoOpcao(o, p)).join('\n      ')}
      <button class="botao botao--largo" type="submit" data-juntar>Juntar ao carrinho</button>
    </form>

    ${pers !== 'nunca' ? `<div class="nota" data-aviso-personalizacao${pers === 'depende' ? ' hidden' : ''}>
      <strong>Peça personalizada.</strong> Feita com as suas indicações: não há direito de livre
      resolução de ${d.loja.devolucoes.dias_livre_resolucao} dias (artigo 17.º n.º 1 alínea c) do
      Decreto-Lei 24/2014). A garantia de ${d.loja.devolucoes.garantia_anos} anos mantém-se.
    </div>` : ''}
    ${pers !== 'sempre' ? `<p class="pequeno discreto" data-aviso-devolucao>Sem gravação, tem
      ${d.loja.devolucoes.dias_livre_resolucao} dias para devolver sem dar explicações.
      <a class="ligacao" href="${l('/legal/livre-resolucao/')}">Como se faz</a>.</p>` : ''}

    <div class="ficha__texto">${paras(p.texto)}</div>

    <div class="painel pilha" style="font-size:.92rem">
      <p style="margin:0"><strong>Antes de cortar, mandamos uma maqueta.</strong> É aí que se
      apanham os erros de ortografia nos nomes — e apanham-se sempre.</p>
      <p style="margin:0" class="discreto">Precisa de muitas unidades? O preço por peça desce.
      <a class="ligacao" href="${l('/cathelier/orcamento/')}">Peça um orçamento</a>.</p>
    </div>
  </div>
</article>

${outras.length ? `<section class="seccao seccao--alt">
  <div class="envolvente">
    <hr class="fio--curto">
    <h2 style="font-size:1.2rem">Mais para ${esc((p.categoriaNome ?? '').toLowerCase())}</h2>
    <div class="grelha grelha--montra-c" style="margin-top:var(--e4)">
      ${outras.map((o) => cartaoPecaCathelier(o, ctx)).join('\n      ')}
    </div>
  </div>
</section>` : ''}
`;
}
