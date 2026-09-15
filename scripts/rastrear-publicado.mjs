/* Rastreia o sítio PUBLICADO: segue o sitemap, abre cada página, e confirma
 * que cada endereço interno — ligações, imagens, folhas de estilo, tipos de
 * letra — devolve 200 no servidor verdadeiro.
 *
 * Porquê contra o servidor e não contra `publico/`: a construção local corre
 * com BASE vazio, e um prefixo em falta é invisível aí. Já aconteceu: as
 * fotografias todas deram 404 depois de publicar e nada local o mostrava.
 */
const ORIGEM = process.argv[2] ?? 'https://renatovalente5.github.io/IthosCathelier';
const raiz = new URL(ORIGEM).origin;

const sitemap = await (await fetch(`${ORIGEM}/sitemap.xml`)).text();
const paginas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`${paginas.length} páginas no sitemap`);

/* Um 503 não é uma ligação partida.
 *
 * O GitHub Pages trava pedidos a mais e devolve 503 a um pedido no meio de
 * três mil e quinhentos. Um rastreio que acusa isso como defeito passa a ser
 * ignorado ao fim da segunda vez — e um CI que se ignora não serve para nada.
 * Só depois de três tentativas, com espera a crescer, é que o endereço conta
 * como partido. O 404 e o 403 não se repetem: esses são respostas a sério. */
const TRANSITORIO = new Set([0, 408, 425, 429, 500, 502, 503, 504]);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const estado = new Map();
async function verificar(u) {
  if (estado.has(u)) return estado.get(u);
  const p = (async () => {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      if (i) await dormir(400 * 2 ** i);
      s = await fetch(u).then((r) => r.status).catch(() => 0);
      if (!TRANSITORIO.has(s)) return s;
    }
    return s;
  })();
  estado.set(u, p);
  return p;
}

const problemas = [];
let recursos = 0;
for (const pag of paginas) {
  const s = await verificar(pag);
  if (s !== 200) { problemas.push(`${pag} → ${s}`); continue; }
  const r = await fetch(pag);
  if (!r.ok) { problemas.push(`${pag} → ${r.status}`); continue; }
  const html = await r.text();
  const alvos = new Set();
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) alvos.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const parte of m[1].split(',')) {
      const u = parte.trim().split(/\s+/)[0];
      if (u.startsWith('/')) alvos.add(u);
    }
  }
  for (const a of alvos) {
    if (a.startsWith('//')) continue;
    const u = raiz + a.split('#')[0];
    recursos++;
    const s = await verificar(u);
    if (s !== 200) problemas.push(`${pag}\n     → ${a} devolveu ${s}`);
  }
}

console.log(`${recursos} endereços seguidos, ${estado.size} distintos`);
if (problemas.length) {
  console.log(`\n${problemas.length} PROBLEMA(S):`);
  for (const p of problemas.slice(0, 40)) console.log('  ·', p);
  process.exit(1);
}
console.log('nada partido no sítio publicado');
