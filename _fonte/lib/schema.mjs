/* Dados estruturados schema.org.
 *
 * Duas marcas num domínio é um caso que o schema.org resolve mal se se for pela
 * intuição. A forma correta: UMA `Organization` (a pessoa que vende, com o NIF e
 * a morada) que declara `brand` com as duas `Brand`. Cada produto aponta a sua
 * marca pelo `brand`, não por uma segunda Organization — duas Organizations no
 * mesmo domínio confundem a Google sobre quem é a entidade.
 *
 * `hasMerchantReturnPolicy` e `shippingDetails` deixaram de ser opcionais na
 * prática: sem eles a Google mostra o produto sem o selo de devoluções e sem os
 * portes, e os concorrentes que os têm ficam por cima. */

export function organizacao({ identidade, site, base }) {
  const abs = (p) => `${site}${base}${p}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${site}${base}/#loja`,
    name: 'ithos · cathelier',
    url: abs('/'),
    email: identidade.email,
    telephone: identidade.telefone,
    vatID: `PT${identidade.nif}`,
    taxID: identidade.nif,
    founder: { '@type': 'Person', name: identidade.nome },
    address: {
      '@type': 'PostalAddress',
      streetAddress: identidade.morada || undefined,
      postalCode: identidade.codigo_postal || undefined,
      addressLocality: identidade.localidade,
      addressCountry: 'PT',
    },
    brand: [
      { '@type': 'Brand', '@id': `${site}${base}/#marca-ithos`, name: 'ithos', url: abs('/'),
        logo: abs('/assets/img/marca/ithos.svg'),
        description: 'Candeeiros de presença em madeira de pinho, feitos à mão em Portugal.' },
      { '@type': 'Brand', '@id': `${site}${base}/#marca-cathelier`, name: 'cathelier', url: abs('/cathelier/'),
        logo: abs('/assets/img/marca/cathelier.svg'),
        description: 'Peças personalizadas cortadas e gravadas a laser: lembranças, troféus, decoração.' },
    ],
    sameAs: [identidade.instagram_ithos, identidade.facebook_ithos, identidade.instagram_cathelier].filter(Boolean),
  };
}

export function migalhas(itens, { site, base }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nome,
      // O `item` é obrigatório em todos os degraus menos no último. Faltar um dá
      // «Missing field item» na Search Console, e a migalha inteira é ignorada.
      ...(i === itens.length - 1 ? {} : { item: `${site}${base}${it.caminho}` }),
    })),
  };
}

export function produto(p, { site, base, identidade, portes, loja, imagens, personalizacao }) {
  const abs = (x) => `${site}${base}${x}`;
  const zonaPt = portes.zonas.find((z) => z.id === 'pt');

  const devolucao = personalizacao === 'sempre'
    ? {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'PT',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      }
    : {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'PT',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: loja.devolucoes.dias_livre_resolucao,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      };

  const disponibilidade = {
    em_stock: 'https://schema.org/InStock',
    por_encomenda: 'https://schema.org/BackOrder',
    esgotado: 'https://schema.org/OutOfStock',
  }[p.estado] ?? 'https://schema.org/BackOrder';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    description: p.resumo,
    image: imagens.map(abs),
    url: abs(p.caminho),
    sku: p.gpsr?.tipo || p.slug,
    brand: { '@id': `${site}${base}/#marca-${p.marca}` },
    manufacturer: { '@type': 'Person', name: identidade.nome, address: { '@type': 'PostalAddress', addressCountry: 'PT' } },
    countryOfOrigin: 'PT',
    material: p.marca === 'ithos' ? 'Madeira de pinho' : materialDaPeca(p),
    ...(p.medidas?.altura ? { height: { '@type': 'QuantitativeValue', value: p.medidas.altura, unitCode: 'CMT' } } : {}),
    ...(p.medidas?.largura ? { width: { '@type': 'QuantitativeValue', value: p.medidas.largura, unitCode: 'CMT' } } : {}),
    offers: {
      '@type': 'Offer',
      price: p.preco,
      priceCurrency: 'EUR',
      availability: disponibilidade,
      itemCondition: 'https://schema.org/NewCondition',
      url: abs(p.caminho),
      seller: { '@id': `${site}${base}/#loja` },
      hasMerchantReturnPolicy: devolucao,
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: zonaPt?.preco ?? 5, currency: 'EUR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PT' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: p.estado === 'em_stock' ? loja.prazos.expedicao_em_stock_dias : loja.prazos.producao_dias,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: zonaPt?.dias_min ?? 1,
            maxValue: zonaPt?.dias_max ?? 5,
            unitCode: 'DAY',
          },
        },
      },
    },
  };
}

export function perguntas(lista) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: lista.map((q) => ({
      '@type': 'Question',
      name: q.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: q.resposta },
    })),
  };
}

/* O material declarado tem de ser o material verdadeiro.
 *
 * A ithos é sempre pinho. As peças da cathelier saem da opção «material» que o
 * comprador escolhe — e escrever «madeira de pinho» numa peça de acrílico é uma
 * indicação falsa sobre a característica principal do bem (art. 7.º, n.º 1,
 * al. b) do DL 57/2008). */
function materialDaPeca(p) {
  const opcao = (p.opcoes ?? []).find((o) => o.id === 'material');
  const valores = (opcao?.valores ?? []).map((v) => v.nome ?? v);
  return valores.length ? valores.join(', ') : 'Madeira de bétula';
}

/* Uma lista de produtos numa página de catálogo.
 *
 * Sem isto a Google vê 26 candeeiros e não sabe que são uma lista; com isto
 * pode mostrar o carrossel de produtos, que é metade do espaço do resultado.
 * Cada entrada é um `ListItem` com `url` — não um Product repetido, que
 * duplicaria as 26 fichas que já existem. */
export function listaDeProdutos(produtos, { site, base, nome }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nome,
    numberOfItems: produtos.length,
    itemListElement: produtos.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nome,
      url: `${site}${base}${p.caminho}`,
    })),
  };
}
