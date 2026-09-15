# ithos · cathelier — plano mestre

Loja em <https://ithos-cathelier.pt/> com duas marcas que parecem dois sítios diferentes.
Titular: **Cathia Carine Pontes**, empresária em nome individual, NIF 244156450,
Castelo Branco. Sem loja física. Alojamento: GitHub Pages. Pagamentos: Stripe.
Transporte: MRW.

Este documento é a fonte da verdade do projeto. Quando uma decisão mudar, muda aqui.

---

## 0. Decisões fechadas

| # | Decisão | Porquê |
|---|---|---|
| D1 | **Um domínio, duas marcas em subpastas** — `/ithos/` e `/cathelier/`, raiz com conteúdo próprio | O `localStorage` é por origem: subdomínios dariam dois carrinhos. As transições entre documentos exigem a mesma origem. O GitHub Pages guarda um domínio por repositório. |
| D2 | **Gerador próprio em Node ESM, sem dependências** | Sem `npm install` no CI, sem risco de um major partir o site. O Eleventy mudou de dono em março de 2026 com a v4 em alfa; o Astro lançou dois majors em 2026; o Jekyll não tem versão desde janeiro de 2025. |
| D3 | **Backoffice próprio**, aplicação nossa em repositório separado | Evita as armadilhas conhecidas do Pages CMS: apaga campos que não declara, teto de ~3,4 MB por fotografia sem aviso, erros de versão, listas sem nome. Redimensiona as fotografias no browser antes de enviar. |
| D4 | **Conteúdo dentro do repositório do site** (`conteudo/`), não num terceiro repositório | Cada gravação do backoffice dispara a publicação sozinha. Um repositório de conteúdos separado obrigaria a um *token* que expira em silêncio — a cliente gravava e o site não mudava. |
| D5 | **Carrinho agrupado por marca**, país de destino escolhido antes do pagamento | A ithos entrega em 3 dias úteis; a cathelier é por encomenda. Um cesto misto transformaria 3 dias em 20 sem ninguém dizer nada. E a página da Stripe não suporta portes dinâmicos: sem escolher o país antes, alguém paga 5 € e manda para a Alemanha. |
| D6 | **Stripe Checkout alojado**, sessão criada por um Cloudflare Worker | 0 € de custos fixos. O `stripe.js` nunca toca no nosso domínio, portanto não há cookie `__stripe_mid` — e sem cookies não essenciais não há aviso de cookies. |
| D7 | **Nada de preço vem do browser** | O browser envia `{id, quantidade, opções, país, hash do catálogo}`. O Worker recalcula tudo a partir do catálogo gerado. |
| D8 | **cathelier abre como montra com pedido de orçamento** | Não há preços. A lei não deixa pôr «sob consulta» sem indicar o modo de cálculo (art. 4.º n.º 1 f) do DL 24/2014). A venda direta liga-se com um campo quando os preços existirem. |
| D9 | **Motor de portes completo, só Portugal ligado** | As cinco zonas nascem feitas; a lista de países ativos está no backoffice. Vender para fora da UE faria a titular perder a isenção do art. 53.º do CIVA na primeira venda. |
| D10 | **Só português na v1** | A estrutura nasce com prefixo de língua e `hreflang`. O inglês é ligar uma pasta — mas cada texto novo passaria a ser dois, e quem escreve é a cliente. |
| D11 | **O botão de encomendar vive no nosso site** | O TJUE (C-249/21, *Fuhrmann-2*) decidiu que só conta a menção escrita **dentro** do botão. «Encomendar com obrigação de pagar» numa página nossa; a Stripe é o passo seguinte. |

---

## 1. Repositórios

| Repositório | Visibilidade | O que tem | Publica |
|---|---|---|---|
| `IthosCathelier` | público | gerador, modelos, estilos, **conteúdo**, imagens derivadas | GitHub Actions → Pages → `ithos-cathelier.pt` |
| `IthosCathelier-Backoffice` | público | a aplicação que a cliente usa | GitHub Actions → Pages |
| `IthosCathelier-API` | **privado** | Cloudflare Worker: checkout, webhook, orçamentos, autenticação | `wrangler deploy` |

Os originais fotográficos a 4000×6000 nunca entram em repositório nenhum: ficam em
`/Users/renatovalente/Websites/Ithos-Cathelier/`, e o que se versiona são as derivadas.

---

## 2. Endereços

```
/                                  Portal — o ateliê, a história, contactos
/sobre/                            A Cathia e o processo
/ithos/                            Casa da marca
/ithos/candeeiros/                 Catálogo com filtros
/ithos/candeeiros/<modelo>/        Ficha: opções, segurança, prazos, devolução
/ithos/como-e-feito/               Do pinho ao LED
/ithos/cuidados-e-seguranca/       Instruções e remoção de pilhas (endereço fixo, exigido por lei)
/cathelier/                        Casa da marca
/cathelier/<categoria>/            casamento · batizado · comunhao · nascimento ·
                                   aniversario · decoracao · trofeus · sinaletica ·
                                   nomes · topos-de-bolo · reguas-de-crescimento ·
                                   grinaldas · natal · datas
/cathelier/<categoria>/<peca>/     Ficha + pedido de orçamento
/cathelier/orcamento/              Formulário
/carrinho/                         Agrupado por marca, país, portes visíveis
/encomenda/                        Resumo + «Encomendar com obrigação de pagar»
/obrigado/                         Confirmação
/legal/identificacao/              DL 7/2004 art. 10.º
/legal/termos/                     Condições gerais de venda
/legal/privacidade/                RGPD arts. 13.º e 14.º
/legal/envios-e-devolucoes/
/legal/livre-resolucao/            + formulário do anexo B
/legal/garantia/                   DL 84/2021 — 3 anos
/legal/reclamacoes/                Livro eletrónico + CNIACC
/dados/catalogo.<hash>.json        Fonte única de preços, lida pelo Worker
/dados/catalogo-atual.txt          Ponteiro
```

---

## 3. Passos

### Fase 1 — Fundações

1. **Repositórios e esqueleto** — pastas, git, GitHub, README, `.gitignore`.
2. **Marca** — logótipos em vetor extraídos dos PDF da cliente, paleta medida, tipografia auto-alojada, favicons por marca.
3. **Imagens** — originais → AVIF + WebP em 400/800/1200/1600 px, cartões de partilha, `srcset` montado só a partir de variantes que existem.
4. **Dados** — `conteudo/definicoes/*.json`, 33 produtos ithos, categorias cathelier.

### Fase 2 — Site

5. **Gerador** — rotas, modelos, tokens de marca, `data-marca` no HTML servido.
6. **Portal e casas das marcas** — `/`, `/ithos/`, `/cathelier/`.
7. **Catálogo e fichas ithos** — listagem com filtros, 33 fichas com opções e segurança.
8. **cathelier** — categorias, fichas, pedido de orçamento.
9. **Páginas legais** — nove páginas geradas por marcadores (`{{NIF}}`, `{{MORADA}}`, `{{RAL}}`), nunca escritas à mão.
10. **SEO** — schema.org, migalhas de pão, sitemaps com `lastmod` do git, robots, cartões de partilha.

### Fase 3 — Loja

11. **Carrinho** — `localStorage`, agrupado por marca, país de destino, portes e prazos visíveis.
12. **Encomenda** — repetição da informação pré-contratual, aceitação do prazo de produção, botão legal.
13. **Worker** — `/checkout` com repreçário integral, `/sessao`, `/webhook`, `/orcamento`, `/auth`.
14. **Emails** — folha de produção para a Cathia, confirmação em suporte duradouro para o comprador.

### Fase 4 — Backoffice

15. **Aplicação** — entrada por GitHub, produtos, fotografias com redução no browser, definições, campanhas, textos, estados de stock.

### Fase 5 — Qualidade

16. **Guardas de construção** — falta um dado legal, um preço, um prazo ou uma variante de imagem, a publicação morre.
17. **Bateria de browser** — conduzir o site, não o ler.
18. **Responsividade e contraste** — medidos, não olhados.
19. **Publicação.**

---

## 4. O que está à espera da cliente

| Falta | Bloqueia | Como se constrói à volta |
|---|---|---|
| Registo de `ithos-cathelier.pt` | Domínio próprio | O site publica em `renatovalente5.github.io/IthosCathelier` e o `BASE` sai do CNAME. |
| Chaves do Stripe | Pagamentos reais | O Stripe dá chaves de *sandbox* sem conta: o checkout constrói-se e testa-se todo hoje. |
| Morada a publicar | Rodapé, legais, devoluções | Sai de `identidade.json`. Enquanto estiver vazia, **a construção morre**. |
| Decisão fiscal (art. 53.º) | Preços com ou sem IVA | `fiscal.json` com o regime. Mudar é um campo. |
| Declaração de conformidade CE | Publicar os candeeiros | Campos obrigatórios na guarda. A cathelier pode abrir antes. |
| Preços e fotografias cathelier | Vender a cathelier | Montra com orçamento (D8). |
| 7 preços ithos em falta | ovelha, cão, gato, cavalo, panda, preguiça, balão | Ficam por publicar até ela preencher. |

---

## 5. Conformidade — o que o site tem de ter

Resumo; o detalhe está em `_fonte/lib/legal.mjs` e nas páginas geradas.

- **DL 7/2004 art. 10.º** — nome, morada, email, NIF sempre acessíveis.
- **DL 24/2014** — informação pré-contratual completa; repetição antes de encomendar;
  botão com a menção dentro dele; confirmação em suporte duradouro; entrega em 30 dias.
- **DL 24/2014 art. 17.º n.º 1 c)** — sem livre resolução em bens **manifestamente
  personalizados**. Escolher uma cor de catálogo **não** é personalização: esses mantêm
  os 14 dias. Três estados por produto.
- **DL 84/2021** — garantia de 3 anos.
- **DL 156/2005 art. 5.º-B** — Livro de Reclamações eletrónico, link destacado.
- **Lei 144/2015 art. 18.º** — RAL: **CNIACC**, competente no distrito de Castelo Branco.
- **Nunca mencionar a plataforma ODR** — revogada pelo Reg. (UE) 2024/3228, desligada
  em 20/07/2025.
- **Reg. (UE) 2023/988 (GPSR) art. 19.º** — em cada ficha: fabricante, morada, email,
  tipo/lote, avisos de segurança.
- **Marcação CE** — obrigatória por via da RoHS (DL 79/2013), que abrange equipamento
  elétrico até 1000 V, incluindo o alimentado a pilhas.
- **Reg. (UE) 2023/1542 art. 11.º** — instruções de remoção de pilhas num endereço
  público permanente, desde 18/02/2027.
- **DL 70/2007** — em campanhas, o preço mais baixo dos últimos 30 dias é **calculado**
  a partir de histórico, não escrito à mão.
- **DL 59/2021** — «(chamada para a rede móvel nacional)» junto ao número.
- **Dir. (UE) 2024/825**, aplicável a 27/09/2026 — sem alegações ambientais genéricas.
  Campos de durabilidade e reparabilidade já no modelo de produto.

O produto **não é brinquedo** (Anexo I, ponto 17 da Dir. 2009/48/CE exclui as luminárias
apelativas a crianças) — e por isso o site nunca pode escrever «brinquedo», «brincar» ou
«companheiro de brincadeiras», nem mostrar uma criança a agarrar a peça. Há uma guarda
de construção que procura essas expressões e falha.
