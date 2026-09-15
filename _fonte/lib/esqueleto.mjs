/* O esqueleto de todas as páginas: cabeça, cabeçalho, rodapé.
 *
 * `data-marca` é escrito no HTML servido, nunca posto por JavaScript: se fosse,
 * a página piscava na cor errada antes de trocar. É também ele que carrega as
 * variáveis todas — cor, forma, tipografia, ritmo. Trocar de marca é trocar um
 * atributo, e é por isso que só há uma folha de estilo. */

import { esc, url } from './util.mjs';
import { icone } from './icones.mjs';

/* O custo da chamada é obrigatório JUNTO A CADA número de telefone (DL 59/2021).
 * Vive aqui, numa constante só: escrito à mão em cada sítio, mais tarde ou mais
 * cedo um deles fica diferente dos outros e ninguém dá por isso. */
export const CUSTO_CHAMADA = '(Chamada para a rede móvel nacional)';

const LOGO = {
  ithos: '/assets/img/marca/ithos.svg',
  cathelier: '/assets/img/marca/cathelier.svg',
};

const MENU = {
  ithos: [
    ['/ithos/candeeiros/', 'Candeeiros'],
    ['/ithos/como-e-feito/', 'Como é feito'],
    ['/ithos/cuidados-e-seguranca/', 'Cuidados'],
    ['/contactos/', 'Contactos'],
  ],
  cathelier: [
    ['/cathelier/', 'Ocasiões'],
    ['/cathelier/como-trabalhamos/', 'Como trabalhamos'],
    ['/cathelier/orcamento/', 'Pedir orçamento'],
    ['/contactos/', 'Contactos'],
  ],
  casa: [
    ['/ithos/', 'ithos'],
    ['/cathelier/', 'cathelier'],
    ['/sobre/', 'O ateliê'],
    ['/contactos/', 'Contactos'],
  ],
};

const IRMA = {
  ithos: ['/cathelier/', 'cathelier', 'peças personalizadas'],
  cathelier: ['/ithos/', 'ithos', 'candeeiros de presença'],
};



/**
 * @param {object} o
 * @param {'ithos'|'cathelier'|'casa'} o.marca
 */
export function pagina(o) {
  const {
    marca = 'casa', titulo, descricao, caminho, conteudo,
    site, base = '', identidade, marcas, imagem, schema = [],
    classeCorpo = '', naoIndexar = false, migalhas = null, estilosExtra = '', previa = false,
  } = o;

  const abs = (p) => `${site}${base}${p}`;
  const l = (p) => `${base}${p}`;
  const canonico = abs(caminho);
  const tema = marca === 'ithos' ? '#FBF5EF' : marca === 'cathelier' ? '#FBFAF7' : '#F7F7F7';
  const og = imagem ? (imagem.startsWith('http') ? imagem : abs(imagem)) : abs('/assets/img/partilha.jpg');

  // Só se pré-carrega a tipografia da marca ATIVA. Pré-carregar as cinco seria
  // gastar 200 KB do orçamento de rede para mostrar duas.
  const tipos = {
    ithos: ['bodoni-moda-latin', 'outfit-latin'],
    cathelier: ['poiret-one-latin', 'jost-latin'],
    casa: ['jost-latin'],
  }[marca];

  const menu = MENU[marca] ?? MENU.casa;
  const irma = IRMA[marca];

  const ld = schema.length
    ? `<script type="application/ld+json">${JSON.stringify(schema.length === 1 ? schema[0] : schema)}</script>`
    : '';

  return `<!doctype html>
<html lang="pt-PT" data-marca="${marca}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(canonico)}">
${naoIndexar ? '<meta name="robots" content="noindex, follow">' : ''}
<meta name="theme-color" content="${tema}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ithos · cathelier">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(canonico)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
${tipos.map((t) => `<link rel="preload" href="${l(`/assets/tipos/${t}.woff2`)}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${l('/assets/css/estilo.css')}">
${estilosExtra}
<link rel="icon" href="${l(`/assets/img/icone-${marca}.svg`)}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${l(`/assets/img/icone-${marca}-180.png`)}">
<link rel="sitemap" type="application/xml" href="${l('/sitemap.xml')}">
${ld}
</head>
<body class="${esc(classeCorpo)}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${previa ? `<p class="tarja-previa" role="status">Pré-visualização — o site ainda não abriu. Não é possível comprar, e alguns dados estão por preencher.</p>` : ''}

<header class="topo" id="topo">
  <div class="envolvente topo__barra">
    <a class="topo__marca" href="${l(marca === 'casa' ? '/' : `/${marca}/`)}" aria-label="${marca === 'casa' ? 'ithos · cathelier — página inicial' : `${marca} — página inicial`}">
      ${marca === 'casa'
        ? `<img class="marca-ithos" src="${l('/assets/img/marca/ithos-simbolo.svg')}" alt="ithos" width="138" height="128">
           <span class="separador" aria-hidden="true">·</span>
           <img class="marca-cathelier" src="${l(LOGO.cathelier)}" alt="cathelier" width="117" height="54">`
        : marca === 'ithos'
          ? `<img src="${l(LOGO.ithos)}" alt="ithos — handmade in Portugal" width="130" height="140">`
          : `<img src="${l(LOGO.cathelier)}" alt="cathelier" width="117" height="54">`}
    </a>
    <button class="abrir-menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir o menu">${icone('menu', 26)}</button>
    <nav class="topo__menu" id="menu" aria-label="Menu principal">
      <button class="fechar-menu" type="button" aria-label="Fechar o menu">${icone('fechar', 24)}</button>
      ${menu.map(([h, t]) => `<a href="${l(h)}"${caminho === h ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('\n      ')}
      ${irma ? `<a class="topo__irma" href="${l(irma[0])}" data-outra-marca><span>${esc(irma[1])}</span><span class="topo__irma-nota">${esc(irma[2])}</span></a>` : ''}
    </nav>
    <div class="topo__accoes">
      <a class="cesto" href="${l('/carrinho/')}" aria-label="Carrinho de compras">
        ${icone('carrinho', 22)}<span class="cesto__conta" data-cesto-conta data-vazio="sim"></span>
      </a>
    </div>
  </div>
</header>

${migalhas ? migalhasHtml(migalhas, l) : ''}

<main id="conteudo">
${conteudo}
</main>

${rodape({ marca, identidade, l, base })}

<!-- O aviso só aparece a quem ainda não respondeu. Fica no HTML para não
     depender de JavaScript para existir; o JavaScript só o esconde. -->
<aside class="cookies" data-cookies hidden>
  <p><strong>Este site não usa cookies de análise nem de publicidade.</strong>
     O único conteúdo de terceiros é o mapa da Google na página de contactos, e
     esse só carrega se disser que sim.</p>
  <div class="cookies__botoes">
    <button class="botao" type="button" data-cookies-sim>Aceitar</button>
    <button class="botao botao--vazio" type="button" data-cookies-nao>Só o essencial</button>
  </div>
  <p class="pequeno"><a class="ligacao" href="${l('/legal/privacidade/')}">Como tratamos os seus dados</a></p>
</aside>

<script src="${l('/assets/js/loja.js')}" defer></script>
</body>
</html>
`;
}

function migalhasHtml(itens, l) {
  return `<nav class="migalhas envolvente" aria-label="Onde está">
  <ol>${itens.map((it, i) => (i === itens.length - 1
    ? `<li><span aria-current="page">${esc(it.nome)}</span></li>`
    : `<li><a href="${l(it.caminho)}">${esc(it.nome)}</a></li>`)).join('')}</ol>
</nav>`;
}

function rodape({ marca, identidade, l, base }) {
  const i = identidade;
  const morada = [i.morada, [i.codigo_postal, i.localidade].filter(Boolean).join(' '), i.pais]
    .filter(Boolean).join(' · ');

  // As redes da marca em que se está primeiro; as outras a seguir. Quem está na
  // cathelier não quer o Facebook dos candeeiros à frente do Instagram das peças.
  const redes = marca === 'cathelier'
    ? [[i.instagram_cathelier, 'Instagram', 'instagram'], [i.instagram_ithos, 'Instagram ithos', 'instagram']]
    : [[i.instagram_ithos, 'Instagram', 'instagram'], [i.facebook_ithos, 'Facebook', 'facebook'],
       [i.instagram_cathelier, 'Instagram cathelier', 'instagram']];

  return `<footer class="rodape">
  <div class="envolvente">
    <div class="rodape__grelha">
      <div class="rodape__coluna">
        <h4>ithos</h4>
        <ul>
          <li><a href="${l('/ithos/')}">A marca</a></li>
          <li><a href="${l('/ithos/candeeiros/')}">Candeeiros</a></li>
          <li><a href="${l('/ithos/como-e-feito/')}">Como é feito</a></li>
          <li><a href="${l('/ithos/cuidados-e-seguranca/')}">Cuidados e segurança</a></li>
        </ul>
      </div>
      <div class="rodape__coluna">
        <h4>cathelier</h4>
        <ul>
          <li><a href="${l('/cathelier/')}">A marca</a></li>
          <li><a href="${l('/cathelier/pecas/')}">Todas as peças</a></li>
          <li><a href="${l('/cathelier/como-trabalhamos/')}">Como trabalhamos</a></li>
          <li><a href="${l('/cathelier/orcamento/')}">Pedir orçamento</a></li>
        </ul>
      </div>
      <div class="rodape__coluna">
        <h4>A loja</h4>
        <ul>
          <li><a href="${l('/sobre/')}">O ateliê</a></li>
          <li><a href="${l('/contactos/')}">Contactos</a></li>
          <li><a href="${l('/perguntas/')}">Perguntas frequentes</a></li>
          <li><a href="${l('/legal/envios-e-devolucoes/')}">Envios e devoluções</a></li>
          <li><a href="${l('/legal/garantia/')}">Garantia de 3 anos</a></li>
        </ul>
      </div>
      <div class="rodape__coluna">
        <h4>Falar connosco</h4>
        <ul class="rodape__contactos">
          <li>${icone('email')}<a href="mailto:${esc(i.email)}">${esc(i.email)}</a></li>
          <li>${icone('telefone')}<span><a href="tel:${esc(i.telefone)}">${esc(i.telefone_texto)}</a>
            <small>${esc(CUSTO_CHAMADA)}</small></span></li>
          <li>${icone('whatsapp')}<a href="https://wa.me/${esc(i.whatsapp)}" rel="noopener">WhatsApp</a></li>
          <li>${icone('local')}<span>${esc(i.localidade)}, ${esc(i.pais)}<br>
            <small>Sem loja aberta ao público</small></span></li>
        </ul>
        <div class="rodape__redes">
          ${redes.filter(([h]) => h).map(([h, t, ic]) =>
            `<a href="${esc(h)}" rel="noopener" aria-label="${esc(t)}" title="${esc(t)}">${icone(ic, 20)}</a>`).join('\n          ')}
        </div>
      </div>
    </div>

    <div class="rodape__fim">
      <p class="rodape__identificacao">${esc(i.nome)} · NIF ${esc(i.nif)}${morada ? ` · ${esc(morada)}` : ''}</p>
      <nav class="rodape__legal" aria-label="Informação legal">
        <a href="${l('/legal/identificacao/')}">Identificação</a>
        <a href="${l('/legal/termos/')}">Termos e condições</a>
        <a href="${l('/legal/privacidade/')}">Privacidade</a>
        <a href="${l('/legal/livre-resolucao/')}">Livre resolução</a>
        <a href="${l('/legal/reclamacoes/')}">Reclamações</a>
        <a class="rodape__livro" href="${esc(i.livro_reclamacoes)}" rel="noopener">
          ${icone('livro', 15)}Livro de Reclamações</a>
        <a class="rodape__gestao" href="${esc(i.backoffice || 'https://renatovalente5.github.io/IthosCathelier-Backoffice/')}" rel="noopener nofollow">Gestão</a>
      </nav>
    </div>
  </div>
</footer>`;
}
