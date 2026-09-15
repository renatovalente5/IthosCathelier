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

const estado = new Map();
async function verificar(u) {
  if (estado.has(u)) return estado.get(u);
  const p = fetch(u, { method: 'GET' }).then((r) => r.status).catch(() => 0);
  estado.set(u, p);
  return p;
}

const problemas = [];
let recursos = 0;
for (const pag of paginas) {
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
