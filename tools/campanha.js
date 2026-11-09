// Simula campanhas completas para ver o equilíbrio: node tools/campanha.js
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['rng', 'data', 'gen', 'engine']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx);
const CP = ctx.CP, E = CP.Engine;
const src = fs.readFileSync(__dirname + '/teste.js', 'utf8');
eval(src.slice(src.indexOf('// estratégia simples'), src.indexOf('const res =')).replace(/\nconst res[\s\S]*/, ''));
const stats = {}; const est = (k) => stats[k] = stats[k] || { n: 0, ok: 0, morte: 0 };
for (const cls of Object.keys(CP.CLASSES)) for (let c = 0; c < 25; c++) {
  let st = E.novaCampanha('camp' + cls + c, 'Bot', cls);
  for (let mi = 0; mi < 12; mi++) {
    // aldeia: subir de nível, dormir, comprar poções
    while (st.hero.niveisPend > 0) {
      const w = CP.ITENS[st.hero.arma].attr;
      const ofer = E.talentosOferta(st);
      st = E.act(st, (mi % 2 && ofer.length) ? { tipo: 'talento', id: ofer[0] } : { tipo: 'nivel', attr: st.hero.attrs[w] < 4 ? w : 'agilidade' }).st;
      if (st.hero.niveisPend > 0 && st.hero.attrs.agilidade >= 4 && st.hero.attrs[w] >= 4) st = E.act(st, { tipo: 'talento', id: E.talentosOferta(st)[0] }).st;
    }
    st = E.act(st, { tipo: 'descansar_aldeia' }).st;
    for (let k = 0; k < 2; k++) if (st.hero.ouro > 12) st = E.act(st, { tipo: 'comprar', item: 'pocao' }).st;
    const m = st.mundo.missoes.find(o => o.estado === 'em_curso') || st.mundo.missoes[0];
    const am = m.ameaca, nv = st.hero.nivel;
    st = E.act(st, { tipo: 'partir', mid: m.id }).st;
    let p = 0;
    while (st.ecra === 'expedicao' && p++ < 500) st = E.act(st, escolher(st, E.acoes(st))).st;
    const k = `nível ${Math.min(nv, 5)} · ameaça ${am}`; const S = est(k); S.n++;
    if (st.resumo && st.resumo.tipo === 'sucesso') S.ok++; if (st.resumo && st.resumo.tipo === 'derrota') S.morte++;
    st = E.act(st, { tipo: 'voltar' }).st;
  }
}
Object.keys(stats).sort().forEach(k => console.log(k.padEnd(22), `vitórias ${Math.round(100 * stats[k].ok / stats[k].n)}%  derrotas ${Math.round(100 * stats[k].morte / stats[k].n)}%  (${stats[k].n})`));
