# Bateria de browser

Mede o que só o browser sabe: contraste real, alvos de toque, transbordo
lateral, imagens partidas, tipografia carregada. **Conduz** o site em vez de o
ler — ler o código não mostra nada disto.

## Correr

```bash
node _fonte/build.mjs                     # com BASE= e SITE=http://localhost:4310
cp scripts/bateria/bateria.js publico/_bateria.js
cp scripts/bateria/conduzir.html publico/_conduzir.html
```

Depois abrir `http://localhost:4310/_conduzir.html?w=390` (e `?w=768`, `?w=1280`)
e ler `window.__resultados`.

A construção limpa `publico/`, por isso os dois ficheiros têm de ser copiados
outra vez a seguir a cada construção. Não entram no site publicado.

## O que já apanhou

- **31 falhas de contraste que não existiam.** A primeira versão lia a cor com
  uma expressão regular. Um `color-mix()` computado sai como
  `color(srgb 0.98 0.96 0.94)` — números de 0 a 1 — e tratá-los como 0-255 dava
  um fundo quase preto: dizia 2,7:1 onde o real era 7:1. Agora a cor é
  **pintada numa tela e lida de volta**, o que funciona para todas as sintaxes.
- **Três imagens «partidas» que carregam bem.** Numa moldura fora do ecrã o
  browser troca de candidato do `srcset` a meio, e há um instante em que
  `complete` é verdade com `naturalWidth` a zero. A prova de que uma imagem
  falhou é o **estado da resposta**, não o `naturalWidth`.
- **Catorze páginas «sem respiro lateral».** Media a caixa do contentor, que é
  larga de propósito — o respiro vive no seu `padding`. Mede-se o conteúdo.
- **Dez alvos de toque que não têm problema.** Um campo dentro de uma `<label>`
  tem como alvo a etiqueta inteira, e uma ligação no meio de uma frase está
  isenta pela própria norma (WCAG 2.5.8).

E, depois de calibrada, apanhou o que era mesmo verdade: as ligações do menu e
do rodapé com 18 a 21 px de altura, e as palavras do portal a 4,44:1 — seis
centésimas abaixo do mínimo, coisa que não se vê a olho.
