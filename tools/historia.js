// Joga a campanha da Sombra de Varro do princípio ao fim: node tools/historia.js
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['rng', 'data', 'gen', 'engine']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx);
const CP = ctx.CP, E = CP.Engine;
const src = fs.readFileSync(__dirname + '/teste.js', 'utf8');
eval(src.slice(src.indexOf('// estratégia simples'), src.indexOf('const res =')));
let fins = 0, falhas = 0;
for (const cls of Object.keys(CP.CLASSES)) for (let c = 0; c < 10; c++) {
  let st = E.novaCampanha('hist' + cls + c, 'Bot', cls); let n = 0;
  while (!st.mundo.campanha.fim && n++ < 40) {
    if (st.mundo.campanha.cena) st = E.act(st, { tipo: 'cena_vista' }).st;
    while (st.hero.niveisPend > 0) { const w = CP.ITENS[st.hero.arma].attr; st = E.act(st, st.hero.attrs[w] < 4 ? { tipo: 'nivel', attr: w } : { tipo: 'talento', id: E.talentosOferta(st)[0] }).st; }
    st = E.act(st, { tipo: 'descansar_aldeia' }).st;
    if (st.hero.ouro > 10 && st.hero.mochila.length < 4) st = E.act(st, { tipo: 'comprar', item: 'pocao' }).st;
    const comp = Object.keys(CP.COMPANHEIROS).find(k => CP.COMPANHEIROS[k].requer && st.mundo.flags[CP.COMPANHEIROS[k].requer]);
    if (comp && st.hero.companheiro !== comp) st = E.act(st, { tipo: 'companheiro', id: comp }).st;
    const m = st.mundo.missoes.find(o => o.historia) || st.mundo.missoes.find(o => o.estado === 'em_curso') || st.mundo.missoes[0];
    st = E.act(st, { tipo: 'partir', mid: m.id }).st;
    let p = 0; while (st.ecra === 'expedicao' && p++ < 500) st = E.act(st, escolher(st, E.acoes(st))).st;
    st = E.act(st, { tipo: 'voltar' }).st;
  }
  if (st.mundo.campanha.fim) fins++; else falhas++;
  if (c === 0) console.log(cls, 'missões:', n, 'ato', st.mundo.campanha.ato, 'sombra', st.mundo.campanha.sombra, 'companheiro', st.hero.companheiro, '\n  ' + (st.mundo.campanha.fim || []).join('\n  '));
}
console.log(`Campanhas terminadas: ${fins}/${fins + falhas}`);
