// Testes automáticos: node tools/teste.js
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['rng', 'data', 'gen', 'engine']) vm.runInContext(fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8'), ctx);
const CP = ctx.CP, E = CP.Engine;
let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log('FALHA:', m); } };

// 1) Reprodutibilidade
const a = CP.Gen.masmorra('abc'), b = CP.Gen.masmorra('abc');
ok(JSON.stringify(a) === JSON.stringify(b), 'mesma semente deve dar o mesmo mapa');

// 2) Geração e validação em massa
let n = 0, salasTot = 0;
for (const tpl of CP.MISSOES) tpl.variantes.forEach((v, vi) => {
  for (let i = 0; i < 300; i++) {
    const m = { tpl: tpl.id, var: vi, seed: 's' + i + tpl.id + vi };
    const d = CP.Gen.expedicao(m);
    const e = CP.Gen.validar(d, tpl, v);
    ok(e.length === 0, m.seed + ' ' + e.join(','));
    salasTot += d.salas.length; n++;
  }
});
console.log(`Masmorras geradas e validadas: ${n} (média ${(salasTot / n).toFixed(1)} salas)`);

// 3) Jogador automático: completa expedições do princípio ao fim
// estratégia simples de combate: melhor dado no ataque, dados mínimos que defendem, habilidade se servir
function estrategia(st) {
  const c = st.exp.combate, h = st.hero, dados = c.dados.map((d, i) => ({ ...d, i })).filter(d => !d.perdido);
  const w = CP.ITENS[h.arma], m = E.alvo(st), P = E.perfil(m);
  const val = d => d.v + (d.attr === w.attr ? w.atk : -1) + (d.attr === P.fraco ? 2 : 0);
  const livres = dados.slice().sort((a, b) => val(b) - val(a));
  const at = { ataque: [], defesa: [] };
  at.ataque.push(livres.shift().i);
  const usar = i => { const k = livres.findIndex(d => d.i === i); if (k >= 0) livres.splice(k, 1); };
  for (const mm of E.inimigos(st).filter(mm => E.ataca(mm.intencao))) {
    const ord = livres.slice().sort((a, b) => a.v - b.v);
    let escolhido = null;
    for (const d of ord) { const t = { ...at, defesa: [...at.defesa, d.i] }; const p = E.previsao(st, t); if (p.defesa[at.defesa.length] && p.defesa[at.defesa.length].ok) { escolhido = d; break; } }
    if (!escolhido && ord.length) escolhido = ord[ord.length - 1];
    if (escolhido) { at.defesa.push(escolhido.i); usar(escolhido.i); }
  }
  for (const d of livres) { const t = { ...at, hab: d.i }; const p = E.previsao(st, t); if (p.hab && p.hab.ok) { at.hab = d.i; break; } }
  return at;
}
function escolher(st, L) {
  if (L.find(a => a.tipo === 'combate')) {
    const sol = L.find(a => a.tipo === 'solucao'); if (sol) return sol;
    const po = L.find(a => a.tipo === 'usar' && a.item === 'pocao'); if (po && st.hero.pv <= 2) return po;
    return { tipo: 'ronda', at: estrategia(st) };
  }
  const evt = L.find(a => a.tipo === 'evento'); if (evt) return evt;
  const pri = ['solucao', 'atacar', 'atacar_chefe', 'surpresa', 'apanhar', 'mecanismo', 'ler', 'investigar', 'regressar'];
  for (const t of pri) { const a = L.find(a => a.tipo === t && !a.off); if (a) return a; }
  const novas = L.filter(a => a.tipo === 'mover' && st.exp.d.salas[a.alvo].estado !== 'explorada');
  if (novas.length) return novas[0];
  const portas = L.filter(a => a.tipo === 'arrombar' || a.tipo === 'fechadura'); if (portas.length) return portas[0];
  // ir para uma sala por explorar com caminho livre, ou até uma porta trancada
  const d = st.exp.d;
  for (const s of d.salas.filter(s => s.estado === 'descoberta')) {
    const r = E.act(st, { tipo: 'mover', alvo: s.id });
    if (r.st.exp && r.st.exp.sala !== st.exp.sala) return { tipo: 'mover', alvo: s.id };
  }
  const tranc = d.arestas.find(e => e.tipo === 'trancada' && !e.aberta && e.conhecida);
  if (tranc) {
    const lado = d.salas[tranc.a].estado === 'explorada' ? tranc.a : tranc.b;
    if (lado !== st.exp.sala) return { tipo: 'mover', alvo: lado };
  }
  return L.find(a => a.tipo === 'mover') || L[0];
}
const res = { sucesso: 0, derrota: 0, retirada: 0, presa: 0 }; let passosTot = 0, pazTot = 0;
for (const cls of Object.keys(CP.CLASSES)) for (let i = 0; i < 60; i++) {
  let st = E.novaCampanha('bot' + cls + i, 'Bot', cls);
  st.hero.pvMax = st.hero.pv = 99; // imortal: testa só a completude
  const m = st.mundo.missoes[i % st.mundo.missoes.length];
  st = E.act(st, { tipo: 'partir', mid: m.id }).st;
  let passos = 0;
  while (st.ecra === 'expedicao' && passos < 400) {
    const L = E.acoes(st);
    if (!L.length) { res.presa++; break; }
    const r = E.act(st, escolher(st, L)); st = r.st; passos++;
    // persistência: o estado sobrevive a JSON
    if (passos % 25 === 0) st = JSON.parse(JSON.stringify(st));
  }
  if (st.ecra === 'resumo') { res[st.resumo.tipo]++; passosTot += passos; }
  else { res.presa++; console.log('presa', cls, i, passos); }
  if (st.mundo.historico.length && st.mundo.historico[0].via === 'paz') pazTot++;
}
console.log('Jogador automático:', JSON.stringify(res), 'média de ações:', (passosTot / 240).toFixed(1), 'resolvidas sem combate:', pazTot);
ok(res.presa === 0, 'nenhuma expedição deve ficar bloqueada');

// 4) Equilíbrio aproximado com vida real
const bal = {};
for (const cls of Object.keys(CP.CLASSES)) {
  let ganhos = 0;
  for (let i = 0; i < 200; i++) {
    let st = E.novaCampanha('bal' + cls + i, 'Bot', cls);
    st = E.act(st, { tipo: 'partir', mid: st.mundo.missoes[0].id }).st;
    let p = 0;
    while (st.ecra === 'expedicao' && p++ < 400) {
      const L = E.acoes(st);
      const fraco = st.hero.pv <= 3 && !L.find(a => a.tipo === 'combate') && L.find(a => a.tipo === 'usar' || (a.tipo === 'ritual' && a.r === 'cura'));
      st = E.act(st, fraco || escolher(st, L)).st;
    }
    if (st.resumo && st.resumo.tipo === 'sucesso') ganhos++;
  }
  bal[cls] = Math.round(ganhos / 2) + '%';
}
console.log('Vitórias à primeira tentativa (bot simples, sem fugir):', JSON.stringify(bal));

// 5) Mundo: depois de um sucesso abre Pedra-Funda
{
  let st = E.novaCampanha('mundo1', 'Bot', 'guerreiro'); st.hero.pv = st.hero.pvMax = 99;
  st = E.act(st, { tipo: 'partir', mid: st.mundo.missoes[0].id }).st;
  let p = 0; while (st.ecra === 'expedicao' && p++ < 400) st = E.act(st, escolher(st, E.acoes(st))).st;
  ok(st.mundo.flags.pedrafunda, 'Pedra-Funda deve abrir após um sucesso');
  st = E.act(st, { tipo: 'voltar' }).st;
  ok(st.mundo.missoes.length === 3, 'o quadro deve ter 3 missões após abrir Pedra-Funda');
  console.log('Missões após o 1.º sucesso:', st.mundo.missoes.map(m => m.titulo).join(' | '));
}
// 6) Retirada guarda a masmorra
{
  let st = E.novaCampanha('ret', 'Bot', 'ladrao');
  const mid = st.mundo.missoes[0].id;
  st = E.act(st, { tipo: 'partir', mid }).st;
  const mapa = JSON.stringify(st.exp.d.salas.map(s => [s.x, s.y]));
  st = E.act(st, { tipo: 'sair' }).st;
  ok(st.resumo.tipo === 'retirada', 'retirada');
  st = E.act(E.act(st, { tipo: 'voltar' }).st, { tipo: 'partir', mid }).st;
  ok(JSON.stringify(st.exp.d.salas.map(s => [s.x, s.y])) === mapa, 'a masmorra deve ser a mesma ao voltar');
}
console.log(falhas ? `${falhas} falhas` : 'Todos os testes passaram.');
// 7) Desistir a meio da masmorra
{
  let st = E.novaCampanha('des', 'Bot', 'mistico');
  const mid = st.mundo.missoes[0].id;
  st = E.act(st, { tipo: 'partir', mid }).st;
  st = E.act(st, { tipo: 'desistir' }).st;
  ok(st.ecra === 'aldeia' && !st.exp && !st.mundo.missoes.some(m => m.id === mid), 'desistir volta à aldeia e retira a missão');
  ok(st.mundo.missoes.length === 2, 'o quadro volta a ter missões');
  console.log(falhas ? `${falhas} falhas` : 'Teste de desistência passou.');
}
