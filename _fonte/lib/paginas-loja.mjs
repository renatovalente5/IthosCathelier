/* Carrinho, encomenda e confirmação.
 *
 * O carrinho vive no `localStorage` e só guarda IDENTIFICADORES, quantidades e
 * opções — nunca preços. Os preços vêm do catálogo gerado pela construção, e
 * quem cobra é o Worker, que volta a calcular tudo do zero. Se o browser
 * mandasse preços, mandava os que quisesse.
 *
 * O botão que conclui a encomenda vive AQUI e não na página da Stripe: o TJUE
 * (C-249/21, Fuhrmann-2) decidiu que a menção «obrigação de pagar» tem de estar
 * escrita DENTRO do botão, e a sanção de não estar é o contrato não vincular o
 * consumidor. */

import { esc, euros } from './util.mjs';

export function carrinho(d, ctx) {
  const { l } = ctx;
  return `
<section class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:60rem">
  <h1>Carrinho</h1>

  <div data-carrinho-vazio hidden class="painel centrado" style="margin-top:var(--e5)">
    <p>Ainda não tem nada no carrinho.</p>
    <p style="margin-top:var(--e3)">
      <a class="botao" href="${l('/ithos/candeeiros/')}">Ver os candeeiros</a>
      <a class="botao botao--vazio" href="${l('/cathelier/')}" data-outra-marca>Ver a cathelier</a>
    </p>
  </div>

  <div data-carrinho-cheio hidden>
    <div class="carrinho">
      <div data-carrinho-grupos></div>

      <aside class="carrinho__resumo painel">
        <h2 style="font-size:1.1rem">Resumo</h2>

        <div class="campo" style="margin-block:var(--e3)">
          <label for="pais">Enviar para</label>
          <select id="pais" data-pais>
            ${paisesAtivos(d).map((p) => `<option value="${esc(p.codigo)}">${esc(p.nome)}</option>`).join('\n            ')}
          </select>
          <p class="campo__ajuda">Os portes dependem do destino. Escolha antes de continuar.</p>
        </div>

        <dl class="contas">
          <div><dt>Artigos</dt><dd data-conta-artigos>—</dd></div>
          <div data-linha-portes><dt>Portes (<span data-conta-zona>—</span>)</dt><dd data-conta-portes>—</dd></div>
          <div data-linha-poupanca hidden><dt>Portes grátis</dt><dd data-conta-poupanca>—</dd></div>
          <div class="contas__total"><dt>Total</dt><dd data-conta-total>—</dd></div>
        </dl>

        <p class="pequeno discreto">${d.fiscal.regime === 'isento_art53'
          ? 'Preços finais. Sem IVA — regime de isenção, artigo 53.º do CIVA.'
          : 'Preços finais, com IVA incluído.'}</p>

        <a class="botao botao--largo" href="${l('/encomenda/')}" data-ir-encomenda style="margin-top:var(--e3)">Continuar</a>
        <p class="pequeno discreto centrado" style="margin-top:var(--e2)">
          <a class="ligacao" href="${l('/legal/envios-e-devolucoes/')}">Portes e prazos</a>
        </p>
      </aside>
    </div>
  </div>
</section>
`;
}

export function encomenda(d, ctx) {
  const { l } = ctx;
  const i = d.identidade;
  return `
<section class="envolvente" style="padding-block:var(--e5) var(--e7);max-width:56rem">
  <h1>A sua encomenda</h1>
  <p class="discreto medida">Confirme tudo antes de pagar. Depois de carregar no botão, segue para a página de pagamento segura da Stripe.</p>

  <div data-encomenda-vazia hidden class="painel centrado" style="margin-top:var(--e5)">
    <p>O carrinho está vazio.</p>
    <p style="margin-top:var(--e3)"><a class="botao" href="${l('/ithos/candeeiros/')}">Ver os candeeiros</a></p>
  </div>

  <div data-encomenda-cheia hidden style="margin-top:var(--e5)">
    <!-- Repetição da informação pré-contratual imediatamente antes de encomendar:
         artigo 5.º n.º 2 do Decreto-Lei 24/2014. Não é um resumo bonito — é o
         que a lei manda repetir aqui. -->
    <div class="painel">
      <h2 style="font-size:1.05rem">O que vai encomendar</h2>
      <div data-resumo-linhas style="margin-top:var(--e3)"></div>
      <dl class="contas" style="margin-top:var(--e4)">
        <div><dt>Artigos</dt><dd data-conta-artigos>—</dd></div>
        <div><dt>Portes para <span data-conta-pais>—</span></dt><dd data-conta-portes>—</dd></div>
        <div class="contas__total"><dt>Total a pagar</dt><dd data-conta-total>—</dd></div>
      </dl>
      <p class="pequeno discreto" style="margin-top:var(--e2)">${d.fiscal.regime === 'isento_art53'
        ? 'Preço final. Sem IVA — regime de isenção, artigo 53.º do CIVA.'
        : 'Preço final, com IVA incluído.'}</p>
    </div>

    <div class="painel" style="margin-top:var(--e4)">
      <h2 style="font-size:1.05rem">Prazo de entrega</h2>
      <p data-prazo-texto class="discreto">—</p>
      <label class="aceitar">
        <input type="checkbox" data-aceita-prazo required>
        <span data-prazo-aceitacao>Aceito o prazo de produção e de entrega indicado.</span>
      </label>
    </div>

    <div class="painel" style="margin-top:var(--e4)" data-bloco-personalizadas hidden>
      <h2 style="font-size:1.05rem">Peças personalizadas</h2>
      <p class="discreto">Estas peças são feitas segundo as suas indicações e, por isso, <strong>não têm direito de livre resolução de ${d.loja.devolucoes.dias_livre_resolucao} dias</strong> (artigo 17.º n.º 1 alínea c) do Decreto-Lei 24/2014). A garantia legal de ${d.loja.devolucoes.garantia_anos} anos mantém-se.</p>
      <ul data-lista-personalizadas class="pequeno"></ul>
      <label class="aceitar">
        <input type="checkbox" data-aceita-personalizacao required>
        <span>Compreendo que estas peças não podem ser devolvidas por arrependimento.</span>
      </label>
    </div>

    <div class="painel" style="margin-top:var(--e4)">
      <h2 style="font-size:1.05rem">Antes de pagar</h2>
      <ul class="pequeno discreto" style="padding-left:var(--e4)">
        <li>Vendedor: ${esc(i.nome)}, NIF ${esc(i.nif)}${i.morada ? `, ${esc(i.morada)}, ${esc(i.codigo_postal)} ${esc(i.localidade)}` : ''}.</li>
        <li>Pagamento por cartão ou MB WAY, na página segura da Stripe. Não guardamos dados do seu cartão.</li>
        <li>Recebe a confirmação da encomenda por email, com todas as condições.</li>
        <li>Garantia legal de conformidade de ${d.loja.devolucoes.garantia_anos} anos (Decreto-Lei 84/2021).</li>
        <li><a class="ligacao" href="${l('/legal/livre-resolucao/')}">Direito de livre resolução</a> · <a class="ligacao" href="${l('/legal/termos/')}">Termos e condições</a> · <a class="ligacao" href="${l('/legal/privacidade/')}">Privacidade</a></li>
      </ul>
      <label class="aceitar">
        <input type="checkbox" data-aceita-termos required>
        <span>Li e aceito os <a class="ligacao" href="${l('/legal/termos/')}">termos e condições</a> e a <a class="ligacao" href="${l('/legal/privacidade/')}">política de privacidade</a>.</span>
      </label>
    </div>

    <p class="campo__erro" data-erro-encomenda hidden></p>

    <!-- A menção tem de estar DENTRO do botão. Texto ao lado não serve: acórdão
         do TJUE de 07/04/2022, processo C-249/21. -->
    <button class="botao botao--largo" type="button" data-pagar style="margin-top:var(--e5);font-size:1.05rem">
      Encomendar com obrigação de pagar
    </button>
    <p class="pequeno discreto centrado" style="margin-top:var(--e2)">Segue para a página de pagamento da Stripe.</p>
  </div>
</section>
`;
}

export function obrigado(d, ctx) {
  const { l } = ctx;
  return `
<section class="envolvente centrado" style="padding-block:var(--e7);max-width:44rem">
  <span class="sobrescrito">Obrigada</span>
  <h1>A encomenda está feita</h1>
  <div data-obrigado-detalhe class="painel" style="margin-top:var(--e5);text-align:left">
    <p class="discreto">A confirmar o pagamento…</p>
  </div>
  <div class="pilha" style="margin-top:var(--e5)">
    <p class="discreto">Vai receber um email com a confirmação e todas as condições da compra. Se não chegar em poucos minutos, veja no lixo eletrónico ou escreva-nos para <a class="ligacao" href="mailto:${esc(d.identidade.email)}">${esc(d.identidade.email)}</a>.</p>
    <p><a class="botao botao--vazio" href="${l('/')}">Voltar ao início</a></p>
  </div>
</section>
`;
}

export function cancelada(d, ctx) {
  const { l } = ctx;
  return `
<section class="envolvente centrado" style="padding-block:var(--e7);max-width:40rem">
  <h1>Pagamento não concluído</h1>
  <p class="discreto">Não foi cobrado nada. O carrinho continua como estava.</p>
  <p style="margin-top:var(--e4)">
    <a class="botao" href="${l('/carrinho/')}">Voltar ao carrinho</a>
  </p>
</section>
`;
}

export function orcamento(d, ctx) {
  const { l } = ctx;
  return `
<section class="envolvente orcamento">
  <div>
    <hr class="fio--curto">
    <h1>Pedir orçamento</h1>
    <p class="discreto">Conte-nos o que precisa. Respondemos em dois dias úteis com uma proposta e uma maqueta, antes de cortar seja o que for.</p>
    <div class="pilha" style="margin-top:var(--e5)">
      <p class="pequeno discreto">Também pode falar connosco por
        <a class="ligacao" href="https://wa.me/${esc(d.identidade.whatsapp)}" rel="noopener">WhatsApp</a>,
        <a class="ligacao" href="${esc(d.identidade.instagram_cathelier)}" rel="noopener">Instagram</a>
        ou <a class="ligacao" href="mailto:${esc(d.identidade.email)}">email</a>.</p>
    </div>
  </div>

  <form data-form-orcamento novalidate>
    <div class="orcamento__par">
      <div class="campo">
        <label for="o-nome">Nome</label>
        <input type="text" id="o-nome" name="nome" required autocomplete="name">
      </div>
      <div class="campo">
        <label for="o-email">Email</label>
        <input type="email" id="o-email" name="email" required autocomplete="email">
      </div>
    </div>
    <div class="orcamento__par">
      <div class="campo">
        <label for="o-ocasiao">Ocasião</label>
        <select id="o-ocasiao" name="ocasiao">
          <option value="">Escolher…</option>
          ${d.categorias.filter((c) => c.publicado).map((c) => `<option value="${esc(c.slug)}">${esc(c.nome)}</option>`).join('\n          ')}
          <option value="outra">Outra</option>
        </select>
      </div>
      <div class="campo">
        <label for="o-data">Para quando</label>
        <input type="date" id="o-data" name="data">
      </div>
    </div>
    <div class="campo">
      <label for="o-quantidade">Quantidade aproximada</label>
      <input type="text" id="o-quantidade" name="quantidade" placeholder="Por exemplo: 80 lembranças">
    </div>
    <div class="campo">
      <label for="o-mensagem">O que precisa</label>
      <textarea id="o-mensagem" name="mensagem" required
        placeholder="Descreva a peça, os nomes ou as frases a gravar, cores, se já tem uma imagem de referência…"></textarea>
    </div>
    <label class="aceitar">
      <input type="checkbox" name="consentimento" required>
      <span class="pequeno">Autorizo o tratamento dos meus dados para responder a este pedido, nos termos da <a class="ligacao" href="${l('/legal/privacidade/')}">política de privacidade</a>.</span>
    </label>
    <p class="campo__erro" data-erro-orcamento hidden></p>
    <button class="botao" type="submit">Enviar pedido</button>
    <p class="pequeno discreto" data-estado-orcamento hidden role="status"></p>
  </form>
</section>
`;
}

function paisesAtivos(d) {
  const nomes = {
    PT: 'Portugal (continente)', 'PT-20': 'Açores', 'PT-30': 'Madeira',
    ES: 'Espanha', FR: 'França', GB: 'Reino Unido', DE: 'Alemanha', CH: 'Suíça',
    AT: 'Áustria', BE: 'Bélgica', NL: 'Países Baixos', LU: 'Luxemburgo', IT: 'Itália',
    IE: 'Irlanda', DK: 'Dinamarca', SE: 'Suécia', FI: 'Finlândia', PL: 'Polónia',
    CZ: 'Chéquia', SK: 'Eslováquia', HU: 'Hungria', SI: 'Eslovénia', HR: 'Croácia',
    RO: 'Roménia', BG: 'Bulgária', GR: 'Grécia', EE: 'Estónia', LV: 'Letónia',
    LT: 'Lituânia', MT: 'Malta', CY: 'Chipre', NO: 'Noruega',
  };
  const saida = [];
  for (const z of d.portes.zonas) {
    for (const p of z.paises) {
      if (!d.portes.ativos.includes(p.slice(0, 2))) continue;
      saida.push({ codigo: p, nome: nomes[p] ?? p, zona: z.id });
    }
  }
  return saida;
}
