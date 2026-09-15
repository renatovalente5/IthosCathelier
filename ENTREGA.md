# Estado da entrega

Atualizado a 15 de setembro de 2026.

## O que está no ar

| | Endereço | Estado |
|---|---|---|
| Site | <https://renatovalente5.github.io/IthosCathelier/> | **pré-visualização** — fora do índice da Google, sem checkout |
| Backoffice | <https://renatovalente5.github.io/IthosCathelier-Backoffice/> | a funcionar com chave de acesso |
| API | por publicar | o Worker está escrito e testado; falta a conta da Cloudflare |

O site está em pré-visualização porque **faltam dados obrigatórios por lei**
(morada e código postal). Enquanto faltarem, a construção recusa publicar uma
loja a sério — e é assim que deve ser. Ver «O que falta».

---

## O que está feito

**Site.** 59 páginas. Duas marcas com identidades próprias — a ithos quente e
artesanal, a cathelier editorial e delicada — a partilhar um só domínio, um só
carrinho e um só checkout. Logótipos extraídos em vetor dos PDF da cliente,
paleta medida no ficheiro original, tipografia auto-alojada (nenhum pedido a
terceiros, e por isso nenhum aviso de cookies).

**Catálogo ithos.** 33 candeeiros lidos das 28 páginas do portfólio: 26 com
preço, 7 à espera de preço. 90 fotografias preparadas em AVIF e WebP, em quatro
larguras, com tecto de peso por largura.

**cathelier.** 9 ocasiões com páginas próprias e pedido de orçamento. Abre como
montra porque não há preços — e a lei não deixa escrever «sob consulta» sem
dizer como se calcula.

**Loja.** Carrinho em `localStorage`, agrupado por marca (a ithos entrega em 3
dias úteis, a cathelier é por encomenda: um cesto misto transformaria em
silêncio uma entrega de 3 dias numa de 20). País de destino escolhido antes de
pagar. Motor de portes com as cinco zonas feitas, só Portugal ligado.

**API.** Cloudflare Worker que recalcula todos os preços a partir do catálogo
publicado — o browser manda identificadores e opções, nunca preços. Webhook com
assinatura verificada. Emails de encomenda e de confirmação.

**Backoffice.** Aplicação própria. A cliente edita produtos, ocasiões, textos,
prazos, portes, campanhas e os seus dados. As fotografias são reduzidas no
browser antes de subirem. Cada gravação é um commit e uma publicação.

**Conformidade.** Oito páginas legais geradas por marcadores — nenhum contacto
escrito à mão. Identificação do vendedor em todas as páginas, custo da chamada,
Livro de Reclamações, CNIACC, garantia de 3 anos, direito de livre resolução
com a distinção correcta entre peça personalizada e peça de catálogo, bloco de
segurança em cada ficha (Reg. (UE) 2023/988).

**Verificações.** 29 casos do que a cliente pode estragar, 525 medições de
browser em 3 larguras, 58 testes da API. Tudo verde.

---

## O que falta, e a quem

### 1. A cliente tem de dar — sem isto a loja não abre

| O quê | Porquê | Onde se mete |
|---|---|---|
| **Morada e código postal** | Artigo 10.º do DL 7/2004. É também a morada de devolução. | Backoffice → Os seus dados |
| **Decisão fiscal** | Está ou não no regime de isenção do art. 53.º do CIVA? Muda o que se escreve em todas as páginas. | Backoffice → Loja → IVA |
| **Chaves do Stripe** | Sem elas não há pagamentos. | Ver ponto 3 |
| **7 preços em falta** | ovelha, cão, gato, cavalo, panda, preguiça, balão de ar quente | Backoffice → Candeeiros |
| **Fotografias e preços da cathelier** | Metade da loja não tem uma única fotografia. | Backoffice |

### 2. Conformidade do produto — é o maior risco do projeto

Um candeeiro com LED, mesmo a pilhas, é **equipamento elétrico**. Pela RoHS
(DL 79/2013) exige **marcação CE e declaração UE de conformidade**, e o erro
mais comum é exactamente o contrário: «não é brinquedo, logo não precisa de CE».

- **Não é brinquedo** — o Anexo I, ponto 17 da Diretiva 2009/48/CE exclui as
  luminárias apelativas a crianças. Mas a utilização razoavelmente previsível
  prevalece sobre a declaração do fabricante: se o texto de venda o tratar como
  brinquedo, a classificação cai. Há uma guarda de construção que procura
  «brinquedo», «brincar» e afins e **mata a publicação**.
- **A versão com comando**: se o comando for de **rádio** (433 MHz ou 2,4 GHz)
  entra a Diretiva RED, que custa milhares de euros em ensaios.
  **Exigir infravermelhos ao fornecedor.** Enquanto não estiver esclarecido,
  publicar só a versão a pilhas.
- **Tintas**: a frase «tinta de água segura para crianças» só pode ir para o
  site com a declaração do fornecedor de conformidade com a EN 71-3.
- **Registos**: produtor de equipamento elétrico e de pilhas no SILiAmb, e
  entidade gestora de resíduos.

### 3. Stripe

1. A cliente cria a conta em <https://dashboard.stripe.com/register> e faz a
   verificação de identidade (empresário em nome individual é aceite).
2. Ativa o **MB WAY**. O **Multibanco fica desligado** na v1: custa quase o
   dobro e o `checkout.session.completed` chega com `payment_status: unpaid`,
   o que é um convite a enviar sem receber.
3. Cria uma **chave restrita** (`rk_live_`) com escrita em Checkout Sessions e
   leitura em PaymentIntents, Charges e Refunds. Nunca a chave secreta completa.
4. Cria o webhook para `https://api.ithos-cathelier.pt/webhook` com os eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` e
   `checkout.session.async_payment_failed`.

Enquanto não houver chaves reais, o checkout pode ser testado inteiro com as
chaves de teste do Stripe — o código não muda.

### 4. Publicar a API

```bash
cd IthosCathelier-API
npm install
./scripts/segredo.sh STRIPE_SECRET
./scripts/segredo.sh STRIPE_WEBHOOK_SECRET
npx wrangler deploy
```

O `scripts/segredo.sh` valida o formato antes de instalar: o `wrangler secret
put` recebe o **nome** como argumento e o valor pelo stdin, e trocar a ordem
cria um segredo cujo nome é a própria chave.

### 5. Domínio

`ithos-cathelier.pt` **não está registado** (verificado a 15/09/2026 no registo
.PT). `ithos.pt` e `cathelier.pt` também estão livres — vale a pena registar os
três, porque a cliente já anuncia o domínio no Instagram.

Depois de registado:
1. Zona na Cloudflare.
2. **Apex e `www` em DNS-only** (nuvem cinzenta) a apontar ao GitHub Pages. A
   nuvem laranja no apex impede o GitHub de emitir o certificado de origem.
3. `api.ithos-cathelier.pt` proxiado para o Worker.
4. Escrever `ithos-cathelier.pt` no ficheiro `CNAME` deste repositório — o
   `BASE` e o `SITE` saem dele automaticamente.
5. Apagar o ficheiro `PREVISUALIZACAO`.

### 6. Entrada da cliente no backoffice

Hoje entra com uma chave de acesso pessoal do GitHub, que ela cola uma vez. Para
ficar um botão «Entrar com o GitHub»:

1. Criar uma OAuth App em <https://github.com/settings/developers>, com callback
   `https://renatovalente5.github.io/IthosCathelier-Backoffice/`.
2. Pôr o *client id* em `config.json` do repositório do backoffice.
3. `./scripts/segredo.sh GITHUB_CLIENT_SECRET` no repositório da API.

---

## Como correr

```bash
node _fonte/build.mjs                        # constrói para publico/
node scripts/guardas.mjs                     # o que a cliente pode estragar
node scripts/verificar-saida.mjs             # o que vai mesmo para o ar
node scripts/testar-caminho-da-cliente.mjs   # 29 casos, repõe tudo no fim
python3 scripts/imagens.py                   # derivadas em falta
```
