#!/usr/bin/env node
/* Escreve `_indice-teste.json`: o que existe em cada pasta do repositório.
 *
 * Serve um fim só — o ensaio do backoffice
 * (`IthosCathelier-Backoffice/_teste.html`) finge a API do GitHub por cima dos
 * ficheiros verdadeiros deste repositório, e a API do GitHub sabe listar uma
 * pasta enquanto um servidor de ficheiros estático não sabe.
 *
 *     node scripts/indice-de-ensaio.mjs
 *
 * O ficheiro não vai para o repositório (está no .gitignore) nem para o site:
 * o gerador escreve para `publico/` e nunca lê a raiz.
 */

import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

const pastas = [
  'conteudo/ithos', 'conteudo/cathelier/pecas', 'conteudo/cathelier',
  'conteudo/paginas', 'conteudo/definicoes', 'conteudo/legal',
];
for (const base of ['_fonte/originais/ithos', '_fonte/originais/cathelier/pecas']) {
  if (!existsSync(join(RAIZ, base))) continue;
  for (const d of readdirSync(join(RAIZ, base))) {
    if (statSync(join(RAIZ, base, d)).isDirectory()) pastas.push(`${base}/${d}`);
  }
}

const indice = {};
for (const p of pastas) {
  indice[p] = existsSync(join(RAIZ, p))
    ? readdirSync(join(RAIZ, p))
        .filter((n) => !n.startsWith('.') && statSync(join(RAIZ, p, n)).isFile())
        .map((n) => ({ name: n, path: `${p}/${n}` }))
    : [];
}

writeFileSync(join(RAIZ, '_indice-teste.json'), JSON.stringify(indice));
console.log(`_indice-teste.json: ${Object.keys(indice).length} pastas`);
