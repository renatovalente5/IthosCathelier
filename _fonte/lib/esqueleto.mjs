/* O esqueleto de todas as páginas: cabeça, cabeçalho, rodapé.
 *
 * `data-marca` é escrito no HTML servido, nunca posto por JavaScript: se fosse,
 * a página piscava na cor errada antes de trocar. É também ele que carrega as
 * variáveis todas — cor, forma, tipografia, ritmo. Trocar de marca é trocar um
 * atributo, e é por isso que só há uma folha de estilo. */

import { esc, url } from './util.mjs';

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

const svgCesto = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="20" height="20" aria-hidden="true"><path d="M4 7h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>`;
const svgMenu = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="24" height="24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;

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
    <button class="abrir-menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir o menu">${svgMenu}</button>
    <nav class="topo__menu" id="menu" aria-label="Menu principal">
      ${menu.map(([h, t]) => `<a href="${l(h)}"${caminho === h ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('\n      ')}
      ${irma ? `<a class="topo__irma" href="${l(irma[0])}" data-outra-marca><span>${esc(irma[1])}</span><span class="topo__irma-nota">${esc(irma[2])}</span></a>` : ''}
    </nav>
    <div class="topo__accoes">
      <a class="cesto" href="${l('/carrinho/')}" aria-label="Carrinho de compras">
        ${svgCesto}<span class="cesto__conta" data-cesto-conta data-vazio="sim"></span>
      </a>
    </div>
  </div>
</header>

${migalhas ? migalhasHtml(migalhas, l) : ''}

<main id="conteudo">
${conteudo}
</main>

${rodape({ marca, identidade, marcas, l })}

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

function rodape({ marca, identidade, marcas, l }) {
  const i = identidade;
  const morada = [i.morada, [i.codigo_postal, i.localidade].filter(Boolean).join(' '), i.pais]
    .filter(Boolean).join(' · ');

  const redes = marca === 'cathelier'
    ? [[i.instagram_cathelier, 'Instagram']]
    : [[i.instagram_ithos, 'Instagram'], [i.facebook_ithos, 'Facebook']];

  return `<footer class="rodape">
  <div class="envolvente">
    <div class="rodape__grelha">
      <div>
        <h4>ithos</h4>
        <ul>
          <li><a href="${l('/ithos/')}">A marca</a></li>
          <li><a href="${l('/ithos/candeeiros/')}">Candeeiros</a></li>
          <li><a href="${l('/ithos/como-e-feito/')}">Como é feito</a></li>
          <li><a href="${l('/ithos/cuidados-e-seguranca/')}">Cuidados e segurança</a></li>
        </ul>
      </div>
      <div>
        <h4>cathelier</h4>
        <ul>
          <li><a href="${l('/cathelier/')}">Ocasiões</a></li>
          <li><a href="${l('/cathelier/como-trabalhamos/')}">Como trabalhamos</a></li>
          <li><a href="${l('/cathelier/orcamento/')}">Pedir orçamento</a></li>
        </ul>
      </div>
      <div>
        <h4>A loja</h4>
        <ul>
          <li><a href="${l('/sobre/')}">O ateliê</a></li>
          <li><a href="${l('/contactos/')}">Contactos</a></li>
          <li><a href="${l('/legal/envios-e-devolucoes/')}">Envios e devoluções</a></li>
          <li><a href="${l('/legal/garantia/')}">Garantia</a></li>
          <li><a href="${l('/perguntas/')}">Perguntas frequentes</a></li>
        </ul>
      </div>
      <div>
        <h4>Falar connosco</h4>
        <ul>
          <li><a href="mailto:${esc(i.email)}">${esc(i.email)}</a></li>
          <li><a href="tel:${esc(i.telefone)}">${esc(i.telefone_texto)}</a><br>
              <span class="pequeno discreto">(chamada para a rede móvel nacional)</span></li>
          ${redes.map(([h, t]) => `<li><a href="${esc(h)}" rel="noopener">${esc(t)}</a></li>`).join('\n          ')}
        </ul>
      </div>
    </div>

    <div class="rodape__fim">
      <p>${esc(i.nome)} · NIF ${esc(i.nif)}${morada ? ` · ${esc(morada)}` : ''}</p>
      <a class="livro" href="${esc(i.livro_reclamacoes)}" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>
        Livro de Reclamações
      </a>
      <div class="rodape__legal">
        <a href="${l('/legal/identificacao/')}">Identificação</a>
        <a href="${l('/legal/termos/')}">Termos e condições</a>
        <a href="${l('/legal/privacidade/')}">Privacidade</a>
        <a href="${l('/legal/livre-resolucao/')}">Livre resolução</a>
        <a href="${l('/legal/reclamacoes/')}">Reclamações e litígios</a>
      </div>
    </div>
  </div>
</footer>`;
}
