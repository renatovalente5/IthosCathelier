/* Ícones desenhados à linha, no traço da casa.
 *
 * Inline no HTML e não como ficheiros: são poucos bytes, herdam a cor do texto
 * (`currentColor`) e não custam um pedido de rede cada. `aria-hidden` sempre —
 * o significado vive no texto ao lado, nunca no desenho.
 */

const D = {
  email: '<path d="M3 6.5h18v11H3z"/><path d="m3 7 9 6 9-6"/>',
  telefone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.8 8.4c.3-.7.6-.7 1-.7h.7c.2 0 .5 0 .8.6l.8 2c.1.3 0 .5-.1.7l-.5.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3.3 2.9c.3.1.5 0 .7-.1l.7-.8c.2-.2.4-.2.6-.1l2 1c.3.1.4.3.4.5 0 1-.7 2-1.6 2.2-.8.2-1.8.3-4.8-1a11 11 0 0 1-4.4-4.4c-.3-.6-.8-1.8-.8-3 0-1 .4-1.6.6-1.9Z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14.5 21.5v-8h2.7l.4-3.2h-3.1V8.2c0-.9.3-1.6 1.6-1.6h1.7V3.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H8.4v3.2h2.7v8Z"/>',
  local: '<path d="M12 21.5s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10.4" r="2.7"/>',
  livro: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4"/><path d="M8.5 12h7M8.5 15.5h7M8.5 8.5h3"/>',
  chave: '<circle cx="8.5" cy="12" r="4"/><path d="M12.5 12h8M18 12v3M15.5 12v2.2"/>',
  carrinho: '<path d="M4 7h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
};

/** @param {number} tamanho  em pixels */
export function icone(nome, tamanho = 18) {
  const corpo = D[nome];
  if (!corpo) return '';
  return `<svg class="icone" viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" fill="none" `
    + `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${corpo}</svg>`;
}

export const iconesConhecidos = Object.keys(D);
