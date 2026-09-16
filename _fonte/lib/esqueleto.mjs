/* O esqueleto de todas as páginas: cabeça, cabeçalho, menu, rodapé.
 *
 * `data-marca` é escrito no HTML servido, nunca posto por JavaScript: se fosse,
 * a página piscava na cor errada antes de trocar. É também ele que carrega as
 * variáveis todas — cor, forma, tipografia, ritmo.
 *
 * Só há DUAS marcas. A identidade neutra que as páginas partilhadas usavam
 * desapareceu: quem estava na ithos e carregava em «Contactos» aterrava num
 * terceiro sítio, cinzento, e sentia que tinha saído da loja. Agora as páginas
 * partilhadas vestem a marca de onde se veio. */

import { esc } from './util.mjs';
import { icone } from './icones.mjs';

/* O custo da chamada é obrigatório JUNTO A CADA número de telefone (DL 59/2021).
 * Vive aqui, numa constante só: escrito à mão em cada sítio, mais tarde ou mais
 * cedo um deles fica diferente dos outros e ninguém dá por isso. */
export const CUSTO_CHAMADA = '(Chamada para a rede móvel nacional)';

const LOGO = {
  ithos: '/assets/img/marca/ithos.svg',
  cathelier: '/assets/img/marca/cathelier.svg',
};

/** O menu é CURTO de propósito: categorias primeiro, institucional depois, e
 *  nada que não sirva para comprar ou para falar connosco. «Cuidados e
 *  segurança» sai da barra e vive no rodapé e em cada ficha — continua público
 *  e permanente, que é o que a lei exige. */
const MENU = {
  ithos: [
    ['/candeeiros/', 'Candeeiros', 'candeeiros'],
    ['/sobre/', 'O ateliê'],
    ['/contactos/', 'Contactos'],
  ],
  cathelier: [
    ['/cathelier/', 'Ocasiões', 'ocasioes'],
    ['/cathelier/pecas/', 'Peças', 'pecas'],
    ['/cathelier/orcamento/', 'Pedir orçamento'],
    ['/cathelier/atelier/', 'O ateliê'],
  ],
};

/** Só no menu de telemóvel: o que não cabe na barra mas alguém procura. */
const MENU_EXTRA = [['/contactos/#perguntas', 'Perguntas frequentes']];

/* A outra marca aparece sempre com a LETRA dela, a COR dela e uma seta para
 * fora. Uma etiqueta não muda de tipo de letra nem aponta para fora — é o que
 * distingue «isto é um caminho» de «isto é um rótulo». */
const IRMA = {
  ithos: { caminho: '/cathelier/', nome: 'cathelier', nota: 'peças personalizadas' },
  cathelier: { caminho: '/', nome: 'ithos', nota: 'candeeiros de presença' },
};

export function pagina(o) {
  const {
    marca = 'ithos', titulo, descricao, caminho, conteudo,
    site, base = '', identidade, imagem, schema = [], contagens = {},
    classeCorpo = '', naoIndexar = false, migalhas = null, estilosExtra = '', previa = false,
  } = o;

  const abs = (p) => `${site}${base}${p}`;
  const l = (p) => `${base}${p}`;
  const canonico = abs(caminho);
  const tema = marca === 'ithos' ? '#FBF5EF' : '#FBFAF7';
  const og = imagem ? (imagem.startsWith('http') ? imagem : abs(imagem)) : abs('/assets/img/partilha.jpg');

  // Dois ficheiros por página: o display da marca e o corpo. A Allura entra
  // sozinha quando é precisa — é decorativa e nunca deve atrasar nada.
  const tipos = marca === 'ithos'
    ? ['fraunces-latin', 'figtree-latin']
    : ['marcellus-latin', 'figtree-latin'];

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
${previa ? '<p class="tarja-previa" role="status">Pré-visualização — o site ainda não abriu. Não é possível comprar, e alguns dados estão por preencher.</p>' : ''}

<!-- Sentinela de 1 px. O cabeçalho encolhe quando ela sai do ecrã, com um
     IntersectionObserver — não com um ouvinte de scroll, que corre a cada
     pixel e faz o logótipo tremer sobre o limiar. -->
<div class="sentinela" aria-hidden="true"></div>

${cabecalho({ marca, l, caminho })}
${migalhas ? migalhasHtml(migalhas, l) : ''}

<main id="conteudo">
${conteudo}
</main>

${menuTelemovel({ marca, l, identidade, contagens })}
${rodape({ marca, identidade, l })}

<!-- O aviso só aparece a quem ainda não respondeu. Fica no HTML para existir
     sem depender de JavaScript; o JavaScript só o esconde. -->
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

/* ------------------------------------------------------------ cabeçalho --- */

function cabecalho({ marca, l, caminho }) {
  const menu = MENU[marca] ?? MENU.ithos;
  const irma = IRMA[marca];
  const casa = marca === 'cathelier' ? '/cathelier/' : '/';

  return `<header class="topo" data-compacto="nao">
  <div class="envolvente topo__barra">
    <button class="abrir-menu" type="button" aria-expanded="false" aria-controls="menu"
            aria-label="Abrir o menu">${icone('menu', 26)}</button>

    <a class="topo__marca" href="${l(casa)}" aria-label="${esc(marca)} — página inicial">
      ${marca === 'ithos'
        ? `<img src="${l(LOGO.ithos)}" alt="ithos — handmade in Portugal" width="130" height="140">`
        : `<img src="${l(LOGO.cathelier)}" alt="cathelier" width="117" height="54">`}
    </a>

    <nav class="topo__menu" aria-label="Menu principal">
      ${menu.map(([h, t]) => `<a href="${l(h)}"${caminho === h ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('\n      ')}
    </nav>

    <div class="topo__accoes">
      ${irma ? `<a class="topo__irma" data-marca-irma="${esc(irma.nome)}" href="${l(irma.caminho)}" data-outra-marca
           aria-label="Ir para a ${esc(irma.nome)}, ${esc(irma.nota)}">
        <span class="topo__irma-nome">${esc(irma.nome)}</span>
        <span aria-hidden="true">↗</span>
      </a>` : ''}
      <a class="cesto" href="${l('/carrinho/')}" aria-label="Carrinho de compras">
        ${icone('carrinho', 22)}<span class="cesto__conta" data-cesto-conta data-vazio="sim"></span>
      </a>
    </div>
  </div>
</header>`;
}

/* ------------------------------------------------------- menu de telemóvel -
   Um <dialog> aberto com showModal(). Dá de graça as três coisas que o
   `aria-modal` promete e não cumpre sozinho: o foco entra, fica preso, e o
   resto da página fica inerte.

   As contagens («Candeeiros 26») vêm dos dados: dizem ao visitante o tamanho
   do que vai encontrar antes de carregar. */

function menuTelemovel({ marca, l, identidade, contagens }) {
  const menu = MENU[marca] ?? MENU.ithos;
  const irma = IRMA[marca];
  const conta = (chave) => (contagens[chave] ? `<span class="gaveta__conta">${contagens[chave]}</span>` : '');
  const instagram = marca === 'cathelier' ? identidade.instagram_cathelier : identidade.instagram_ithos;

  return `<dialog class="gaveta" id="menu" aria-label="Menu">
  <div class="gaveta__topo">
    <button class="fechar-menu" type="button" aria-label="Fechar o menu">${icone('fechar', 26)}</button>
    <img class="gaveta__marca" src="${l(LOGO[marca])}" alt="${esc(marca)}"
         ${marca === 'ithos' ? 'width="130" height="140"' : 'width="117" height="54"'}>
    <a class="cesto" href="${l('/carrinho/')}" aria-label="Carrinho de compras">
      ${icone('carrinho', 22)}<span class="cesto__conta" data-cesto-conta data-vazio="sim"></span>
    </a>
  </div>

  <nav class="gaveta__menu" aria-label="Menu principal">
    ${[...menu, ...MENU_EXTRA].map(([h, t, chave]) => `<a href="${l(h)}">
      <span>${esc(t)}</span>${conta(chave)}<span class="gaveta__seta" aria-hidden="true">→</span>
    </a>`).join('\n    ')}
  </nav>

  ${irma ? `<div class="gaveta__irma">
    <p class="rotulo">A outra marca do mesmo ateliê</p>
    <a class="porta-irma" data-marca-irma="${esc(irma.nome)}" href="${l(irma.caminho)}" data-outra-marca>
      <span class="porta-irma__nome">${esc(irma.nome)}</span>
      <span class="porta-irma__nota">${esc(irma.nota)}</span>
      <span class="porta-irma__seta" aria-hidden="true">↗</span>
    </a>
  </div>` : ''}

  <div class="gaveta__contactos">
    <a class="gaveta__telefone" href="tel:${esc(identidade.telefone)}">${esc(identidade.telefone_texto)}</a>
    <p class="pequeno discreto">${esc(CUSTO_CHAMADA)}</p>
    <p class="gaveta__redes">
      <a href="https://wa.me/${esc(identidade.whatsapp)}" rel="noopener">${icone('whatsapp', 18)} WhatsApp</a>
      <a href="${esc(instagram)}" rel="noopener">${icone('instagram', 18)} Instagram</a>
    </p>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------- migalhas --- */

function migalhasHtml(itens, l) {
  return `<nav class="migalhas envolvente" aria-label="Onde está">
  <ol>${itens.map((it, i) => (i === itens.length - 1
    ? `<li><span aria-current="page">${esc(it.nome)}</span></li>`
    : `<li><a href="${l(it.caminho)}">${esc(it.nome)}</a></li>`)).join('')}</ol>
</nav>`;
}

/* --------------------------------------------------------------- rodapé --- */

function rodape({ marca, identidade, l }) {
  const i = identidade;
  const morada = [i.morada, [i.codigo_postal, i.localidade].filter(Boolean).join(' '), i.pais]
    .filter(Boolean).join(' · ');

  const redes = marca === 'cathelier'
    ? [[i.instagram_cathelier, 'Instagram', 'instagram'], [i.instagram_ithos, 'Instagram da ithos', 'instagram']]
    : [[i.instagram_ithos, 'Instagram', 'instagram'], [i.facebook_ithos, 'Facebook', 'facebook'],
       [i.instagram_cathelier, 'Instagram da cathelier', 'instagram']];

  /* O rodapé em acordeão, que ela pediu para «o final de todas as páginas».
   *
   * `<details>` nativo, e não um botão com `aria-expanded` escrito à mão: o
   * elemento anuncia-se sozinho como divulgação com estado, e o `+`/`−` é o
   * mesmo controlo que este sítio já desenha nas perguntas frequentes — é o da
   * captura que ela mandou, não uma imitação.
   *
   * NASCE ABERTO, e o JavaScript só FECHA, e só abaixo de 60 rem. A inversão é
   * de propósito: se o JavaScript não correr, o que sai é o rodapé de sempre,
   * aberto e inteiro. O modo de falha é o estado actual, não um rodapé mudo.
   *
   * Sem `name=`: um acordeão exclusivo fecha um grupo ao abrir outro, e quem
   * anda à procura do contacto perde o que já tinha aberto. */
  const grupo = (titulo, dentro) => `<details class="rodape__grupo" open>
        <summary><h4>${esc(titulo)}</h4></summary>
        ${dentro}
      </details>`;

  const lista = (itens) => `<ul>${itens.map(([h, t]) => `<li><a href="${l(h)}">${esc(t)}</a></li>`).join('')}</ul>`;

  // «A loja» põe primeiro a marca da página em que se está.
  const daIthos = [['/candeeiros/', 'Todos os candeeiros'], ['/sobre/#como-e-feito', 'Como é feito'],
                   ['/cuidados-e-seguranca/', 'Cuidados e segurança']];
  const daCathelier = [['/cathelier/', 'Ocasiões'], ['/cathelier/pecas/', 'Todas as peças'],
                       ['/cathelier/orcamento/', 'Pedir orçamento']];

  return `<footer class="rodape">
  <div class="envolvente">
    <div class="rodape__grelha">
      ${grupo('Apoio ao cliente', lista([
        ['/contactos/#perguntas', 'Perguntas frequentes'],
        ['/legal/envios-e-devolucoes/', 'Envios e devoluções'],
        ['/legal/garantia/', 'Garantia legal de 3 anos'],
        ['/legal/livre-resolucao/', 'Livre resolução'],
        // Existe, é exigido pela lei e pela guarda de saída, e nunca esteve
        // ligado a partir do rodapé.
        ['/legal/livre-resolucao/formulario/', 'Formulário de livre resolução'],
        ['/cuidados-e-seguranca/', 'Cuidados e segurança'],
      ]))}
      ${grupo('A loja', lista([
        ...(marca === 'cathelier' ? daCathelier : daIthos),
        ['/sobre/', 'O ateliê'],
        ...(marca === 'cathelier' ? daIthos.slice(0, 1) : daCathelier.slice(0, 1)),
      ]))}
      ${grupo('Condições', lista([
        ['/legal/termos/', 'Termos e condições'],
        ['/legal/privacidade/', 'Privacidade'],
        ['/legal/reclamacoes/', 'Reclamações'],
        ['/legal/identificacao/', 'Identificação'],
      ]))}
      ${grupo('Falar connosco', `<ul class="rodape__contactos">
          <li>${icone('email')}<a href="mailto:${esc(i.email)}">${esc(i.email)}</a></li>
          <li>${icone('telefone')}<span><a href="tel:${esc(i.telefone)}">${esc(i.telefone_texto)}</a>
            <small>${esc(CUSTO_CHAMADA)}</small></span></li>
          <li>${icone('whatsapp')}<a href="https://wa.me/${esc(i.whatsapp)}" rel="noopener">WhatsApp</a></li>
          <li>${icone('local')}<span>${esc(i.localidade)}, ${esc(i.pais)}<br>
            <small>Sem loja aberta ao público</small></span></li>
        </ul>`)}
    </div>

    <!-- FORA do acordeão, e de propósito: as redes são o que ela mandou na
         captura sempre à vista, e um grupo fechado não é sítio para elas. -->
    <div class="rodape__redes">
      ${redes.filter(([h]) => h).map(([h, t, ic]) =>
        `<a href="${esc(h)}" rel="noopener" aria-label="${esc(t)}" title="${esc(t)}">${icone(ic, 20)}</a>`).join('\n      ')}
    </div>

    <div class="rodape__fim">
      <p class="rodape__identificacao">${esc(i.nome)} · NIF ${esc(i.nif)}${morada ? ` · ${esc(morada)}` : ''}</p>
      <nav class="rodape__legal" aria-label="Informação legal">
        <a href="${l('/legal/identificacao/')}">Identificação</a>
        <a href="${l('/legal/termos/')}">Termos e condições</a>
        <a href="${l('/legal/privacidade/')}">Privacidade</a>
        <a href="${l('/legal/reclamacoes/')}">Reclamações</a>
        <a class="rodape__livro" href="${esc(i.livro_reclamacoes)}" rel="noopener">
          ${icone('livro', 15)}Livro de Reclamações</a>
        <a class="rodape__gestao" href="${esc(i.backoffice || '#')}" rel="noopener nofollow">Gestão</a>
      </nav>
      <p class="rodape__familia">ithos e cathelier são duas marcas do mesmo ateliê, em ${esc(i.localidade)}.</p>
    </div>
  </div>
</footer>`;
}
