#!/usr/bin/env node
/* O que acontece quando a cliente estraga alguma coisa.
 *
 * Um site pode estar impecável e o backoffice não deixar gravar nada — ou
 * deixar gravar e publicar um site partido. Este ficheiro percorre, uma a uma,
 * as coisas que ela pode mesmo fazer sem querer: apagar um campo, despublicar
 * tudo, pôr um preço a zero, escrever uma palavra proibida, desligar o último
 * país, pedir portes grátis acima de zero.
 *
 * Por cada uma: altera os dados, corre as guardas e a construção, confirma que
 * o resultado é o esperado — e repõe tudo. Nada fica alterado no fim.
 *
 *     node scripts/testar-caminho-da-cliente.mjs
 */

import { readFileSync, writeFileSync, readdirSync, cpSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTEUDO = join(RAIZ, 'conteudo');

// Cópia de segurança do conteúdo inteiro. Repõe-se sempre, mesmo se isto
// rebentar a meio: uma bateria que estraga os dados do projeto é pior do que
// não haver bateria nenhuma.
const guardado = mkdtempSync(join(tmpdir(), 'ic-conteudo-'));
cpSync(CONTEUDO, guardado, { recursive: true });
const repor = () => {
  rmSync(CONTEUDO, { recursive: true, force: true });
  cpSync(guardado, CONTEUDO, { recursive: true });
};
process.on('exit', () => { repor(); rmSync(guardado, { recursive: true, force: true }); });
process.on('SIGINT', () => process.exit(130));

let passou = 0;
let falhou = 0;

function correr(comando, args, ambiente = {}) {
  try {
    const saida = execFileSync(comando, args, {
      cwd: RAIZ, encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, ...ambiente },
    });
    return { ok: true, saida };
  } catch (e) {
    return { ok: false, saida: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const guardas = (amb) => correr('node', ['scripts/guardas.mjs'], amb);
const construir = (amb) => correr('node', ['_fonte/build.mjs'], { PREVISUALIZACAO: 'sim', ...amb });

const lerJson = (p) => JSON.parse(readFileSync(join(CONTEUDO, p), 'utf8'));
const escreverJson = (p, d) => writeFileSync(join(CONTEUDO, p), `${JSON.stringify(d, null, 2)}\n`);

/* A morada ainda não existe — está à espera da cliente — e sem ela TODOS os
 * casos morrem, pelo motivo errado. Isso não testa nada: mediria sempre a mesma
 * coisa e daria seis falhas que nada têm que ver com o que se está a testar.
 *
 * Aqui preenche-se uma morada de ensaio antes de cada caso, para a única
 * variável ser aquilo que a cliente estragou. Nunca sai daqui: os dados são
 * repostos a seguir a cada caso. */
function moradaDeEnsaio() {
  const i = lerJson('definicoes/identidade.json');
  if (!i.morada) { i.morada = 'Rua de Ensaio, 1'; i.codigo_postal = '6000-000'; }
  escreverJson('definicoes/identidade.json', i);
}

/**
 * @param {string} nome        o que a cliente fez
 * @param {Function} estragar  como se estraga
 * @param {'morre'|'publica'} esperado
 * @param {string} [procurar]  texto que a mensagem tem de conter
 */
function caso(nome, estragar, esperado, procurar = '') {
  repor();
  moradaDeEnsaio();
  estragar();
  // Em pré-visualização as guardas perdoam o que espera pela cliente; aqui
  // queremos o comportamento de PRODUÇÃO, que é o que protege a loja.
  const g = guardas({ PREVISUALIZACAO: 'nao' });
  const morreu = !g.ok;
  const certo = (esperado === 'morre') === morreu;
  const temTexto = !procurar || g.saida.includes(procurar);

  if (certo && temTexto) {
    passou++;
    console.log(`  ✓ ${nome} → ${esperado === 'morre' ? 'a construção morre' : 'publica na mesma'}`);
  } else {
    falhou++;
    console.log(`  ✗ ${nome} → esperava «${esperado}», ${morreu ? 'morreu' : 'passou'}`
      + `${!temTexto ? `; sem a mensagem «${procurar}»` : ''}`);
    console.log(`      ${g.saida.split('\n').filter(Boolean).slice(-3).join(' / ')}`);
  }
  repor();
}

console.log('\nO QUE ACONTECE QUANDO A CLIENTE ESTRAGA ALGUMA COISA\n');

console.log('dados obrigatórios por lei');
caso('apaga a morada', () => {
  const i = lerJson('definicoes/identidade.json'); i.morada = ''; escreverJson('definicoes/identidade.json', i);
}, 'morre', 'morada');

caso('apaga o email', () => {
  const i = lerJson('definicoes/identidade.json'); i.email = ''; escreverJson('definicoes/identidade.json', i);
}, 'morre', 'email');

caso('engana-se no NIF', () => {
  const i = lerJson('definicoes/identidade.json'); i.nif = '12345'; escreverJson('definicoes/identidade.json', i);
}, 'morre', 'nove dígitos');

caso('apaga a entidade de resolução de litígios', () => {
  const i = lerJson('definicoes/identidade.json'); i.ral = {}; escreverJson('definicoes/identidade.json', i);
}, 'morre', 'Lei 144/2015');

caso('apaga o Livro de Reclamações', () => {
  const i = lerJson('definicoes/identidade.json'); i.livro_reclamacoes = ''; escreverJson('definicoes/identidade.json', i);
}, 'morre', 'Livro de Reclamações');

console.log('\nprodutos');
caso('publica um candeeiro sem preço', () => {
  const p = lerJson('ithos/raposa.json'); p.preco = null; escreverJson('ithos/raposa.json', p);
}, 'morre', 'sem preço');

caso('põe o preço a zero', () => {
  const p = lerJson('ithos/raposa.json'); p.preco = 0; escreverJson('ithos/raposa.json', p);
}, 'morre', 'sem preço');

caso('apaga o resumo de um candeeiro publicado', () => {
  const p = lerJson('ithos/raposa.json'); p.resumo = ''; escreverJson('ithos/raposa.json', p);
}, 'morre', 'sem resumo');

caso('apaga as fotografias todas', () => {
  const p = lerJson('ithos/raposa.json'); p.fotos = []; escreverJson('ithos/raposa.json', p);
}, 'morre', 'sem uma única fotografia');

caso('deixa uma fotografia na lista que já apagou do disco', () => {
  const p = lerJson('ithos/raposa.json'); p.fotos.push('99'); escreverJson('ithos/raposa.json', p);
}, 'morre', 'não existe em _fonte/originais');

caso('apaga o campo das opções', () => {
  const p = lerJson('ithos/raposa.json'); delete p.opcoes; escreverJson('ithos/raposa.json', p);
}, 'morre', 'desapareceu dos dados');

caso('escolhe um estado que não existe', () => {
  const p = lerJson('ithos/raposa.json'); p.estado = 'talvez'; escreverJson('ithos/raposa.json', p);
}, 'morre', 'desconhecido');

caso('DESPUBLICA um candeeiro sem preço (é o que deve fazer)', () => {
  const p = lerJson('ithos/raposa.json'); p.preco = null; p.publicado = false; escreverJson('ithos/raposa.json', p);
}, 'publica');

caso('despublica um candeeiro qualquer', () => {
  const p = lerJson('ithos/comboio.json'); p.publicado = false; escreverJson('ithos/comboio.json', p);
}, 'publica');

console.log('\nclassificação do produto');
caso('escreve «um brinquedo lindo» na descrição', () => {
  const p = lerJson('ithos/raposa.json'); p.texto += '\n\nUm brinquedo lindo para o quarto.';
  escreverJson('ithos/raposa.json', p);
}, 'morre', 'brinquedo');

caso('escreve «madeira sustentável»', () => {
  const p = lerJson('ithos/raposa.json'); p.texto += '\n\nFeito em madeira sustentável.';
  escreverJson('ithos/raposa.json', p);
}, 'morre', 'ambiental');

caso('escreve «não é um brinquedo» (tem de poder)', () => {
  const p = lerJson('ithos/raposa.json'); p.texto += '\n\nAtenção: não é um brinquedo.';
  escreverJson('ithos/raposa.json', p);
}, 'publica');

caso('marca a cor como personalização', () => {
  const p = lerJson('ithos/raposa.json');
  p.opcoes.find((o) => o.tipo === 'escolha').personaliza = true;
  escreverJson('ithos/raposa.json', p);
}, 'morre', 'não retira o direito de livre resolução');

console.log('\nloja e envios');
caso('desliga o último país', () => {
  const p = lerJson('definicoes/portes.json'); p.ativos = []; escreverJson('definicoes/portes.json', p);
}, 'morre', 'nenhum país ativo');

caso('liga um país que não está em nenhuma zona', () => {
  const p = lerJson('definicoes/portes.json'); p.ativos = ['PT', 'JP']; escreverJson('definicoes/portes.json', p);
}, 'morre', 'não pertence a nenhuma zona');

caso('põe 7 dias de devolução em vez de 14', () => {
  const l = lerJson('definicoes/loja.json'); l.devolucoes.dias_livre_resolucao = 7;
  escreverJson('definicoes/loja.json', l);
}, 'morre', 'inferior a 14 dias');

caso('põe 2 anos de garantia em vez de 3', () => {
  const l = lerJson('definicoes/loja.json'); l.devolucoes.garantia_anos = 2;
  escreverJson('definicoes/loja.json', l);
}, 'morre', 'inferior a 3 anos');

caso('apaga os avisos de segurança', () => {
  const l = lerJson('definicoes/loja.json'); l.avisos_seguranca_ithos = [];
  escreverJson('definicoes/loja.json', l);
}, 'morre', 'avisos de segurança');

caso('liga uma campanha de portes grátis', () => {
  const p = lerJson('definicoes/portes.json');
  p.campanha = { ativa: true, titulo: 'Portes grátis', portes_gratis_acima: 100, paises: [], inicio: '', fim: '' };
  escreverJson('definicoes/portes.json', p);
}, 'publica');

caso('liga a Inglaterra estando no regime de isenção', () => {
  const p = lerJson('definicoes/portes.json'); p.ativos = ['PT', 'GB'];
  escreverJson('definicoes/portes.json', p);
}, 'publica', 'fora da União Europeia');      // avisa, não impede

console.log('\nocasiões da cathelier');
caso('dá o mesmo endereço a duas ocasiões', () => {
  const c = lerJson('cathelier/categorias.json'); c[1].slug = c[0].slug;
  escreverJson('cathelier/categorias.json', c);
}, 'morre', 'aparece duas vezes');

caso('publica uma ocasião sem resumo', () => {
  const c = lerJson('cathelier/categorias.json'); c[0].resumo = '';
  escreverJson('cathelier/categorias.json', c);
}, 'morre', 'publicada sem resumo');

caso('despublica uma ocasião', () => {
  const c = lerJson('cathelier/categorias.json'); c[0].publicado = false;
  escreverJson('cathelier/categorias.json', c);
}, 'publica');

console.log('\ne o site construído continua inteiro?');
{
  repor();
  moradaDeEnsaio();
  const b = construir();
  const v = correr('node', ['scripts/verificar-saida.mjs'], { PREVISUALIZACAO: 'sim' });
  if (b.ok && v.ok) { passou++; console.log('  ✓ com os dados repostos, constrói e verifica'); }
  else {
    falhou++;
    console.log('  ✗ com os dados repostos, alguma coisa falha');
    console.log(`      ${(b.ok ? v.saida : b.saida).split('\n').filter(Boolean).slice(-4).join(' / ')}`);
  }
}

console.log(`\n${passou} passaram · ${falhou} falharam\n`);
process.exitCode = falhou ? 1 : 0;
