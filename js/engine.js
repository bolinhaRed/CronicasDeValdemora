/* Crónicas de Valdemora — motor de regras.
   Não toca na interface. API:
     Engine.novaCampanha(semente, nome, classe) -> estado
     Engine.acoes(estado) -> lista de ações possíveis (com rótulos)
     Engine.act(estado, acao) -> { st: novo estado, ev: eventos para mostrar }
   Eventos: {t:'titulo'|'n'|'ok'|'mau'|'pista'|'info'|'d', s, ...}  ('d' = lançamento de dado) */
(function (G) {
  const CP = G.CP = G.CP || {};
  const Gen = () => CP.Gen;
  const clone = o => JSON.parse(JSON.stringify(o));
  const tplDe = m => CP.MISSOES.find(t => t.id === m.tpl);
  const varDe = m => tplDe(m).variantes[m.var];

  /* ================= Dados e testes ================= */
  function dN(st, n) { const r = CP.RNG.fromState(st.rng); const v = r.int(1, n); st.rng = r.s; return v; }
  const ladosDe = v => CP.DADOS[Math.max(0, Math.min(4, v))];
  // atributo efetivo: cada ferimento desce o dado desse atributo
  function attrEf(st, a) { return Math.max(0, st.hero.attrs[a] - (st.hero.ferimentos || []).filter(f => CP.FERIMENTOS[f].attr === a).length); }

  // Teste base: lança o dado do atributo (d4 a d12) e soma o bónus do equipamento.
  // Precisa de 4 ou mais, mais a dificuldade. Com vantagem lança dois e fica o melhor. Um 1 natural falha sempre.
  function teste(st, ev, o) {
    const lados = ladosDe(o.attr ? attrEf(st, o.attr) : 0), bonus = o.bonus || 0;
    const alvo = Math.max(2, 4 + (o.dif || 0));
    const dados = [dN(st, lados)];
    if (o.vant) dados.push(dN(st, lados));
    const nat = Math.max(...dados), v = nat + bonus, ok = nat > 1 && v >= alvo;
    ev.push({ t: 'd', s: o.rotulo, dados, lados, bonus, alvo, v, nat, ok, max: nat === lados, vant: !!o.vant });
    return { ok, v, max: nat === lados };
  }

  /* ================= Campanha e mundo ================= */
  function novaCampanha(semente, nome, classe) {
    const c = CP.CLASSES[classe];
    const st = {
      v: 1, semente: String(semente), rng: CP.RNG.estadoDe(semente + '|dados'), ecra: 'aldeia',
      hero: { nome: nome || 'Sem Nome', classe, pvMax: c.pv, pv: c.pv, attrs: clone(c.attrs), ouro: 10,
        xp: 0, nivel: 1, niveisPend: 0, arma: c.arma, armadura: c.armadura, escudo: null, mochila: clone(c.mochila), reliquias: [], talentos: [], companheiro: null, ferimentos: [] },
      mundo: { rep: { corvamonte: 0, pedrafunda: 0 }, flags: {}, missoes: [], historico: [], cont: 0,
        wrng: CP.RNG.estadoDe(semente + '|mundo'), noticias: [], bestiario: {}, melhorias: {}, campanha: { ato: 1, sucessos: 0, fragmentos: [], feitos: [], sombra: 0, cena: null, fim: null } },
      exp: null, resumo: null
    };
    geraMissoes(st);
    return st;
  }

  function wr(st) { return CP.RNG.fromState(st.mundo.wrng); }

  // Mantém três missões no quadro, preferindo modelos diferentes
  function geraMissoes(st) {
    const M = st.mundo;
    const elegiveis = CP.MISSOES.filter(t => !t.historia && (!t.requer || M.flags[t.requer]));
    const C = M.campanha;
    // missões de história do ato atual
    if (C && !C.fim) CP.MISSOES.filter(t => t.historia && t.ato === C.ato && !C.feitos.includes(t.id) && !M.missoes.some(m => m.tpl === t.id)).forEach(t => {
      M.cont++;
      const m = { id: 'm' + M.cont, tpl: t.id, var: 0, seed: st.semente + '|historia|' + t.id + '|' + M.cont, vars: { nome: t.nomes[0] }, estado: 'disponivel', masmorra: null, historia: true };
      m.titulo = t.titulo(m.vars); m.ameaca = t.ato >= 3 ? 3 : Math.max(2, Math.min(3, 1 + Math.floor((st.hero.nivel - 1) / 2)));
      m.recompensa = t.recompensa;
      M.missoes.unshift(m);
    });
    let guarda = 0;
    const tamanho = Math.min(3, elegiveis.length);
    while (M.missoes.filter(m => m.estado !== 'concluida' && !m.historia).length < tamanho && guarda++ < 20) {
      const r = wr(st);
      const contagem = t => M.missoes.filter(m => m.tpl === t.id).length;
      const menor = Math.min(...elegiveis.map(contagem));
      const tpl = r.pick(elegiveis.filter(t => contagem(t) === menor));
      const usados = M.missoes.filter(m => m.tpl === tpl.id).map(m => m.vars.nome).concat(M.historico.slice(-6).map(h => h.nome));
      const nome = r.pick(tpl.nomes.filter(n => !usados.includes(n)).concat(usados.length >= tpl.nomes.length ? tpl.nomes : []));
      const m = { id: 'm' + (++M.cont), tpl: tpl.id, var: r.int(0, tpl.variantes.length - 1),
        seed: st.semente + '|missao|' + M.cont + '|' + r.int(0, 1e9), vars: { nome }, estado: 'disponivel', masmorra: null };
      m.titulo = tpl.titulo(m.vars);
      const base = Math.min(3, 1 + Math.floor((st.hero.nivel - 1) / 2));
      m.ameaca = Math.max(1, Math.min(3, base + (r.chance(0.3) ? 1 : 0) - (r.chance(0.2) ? 1 : 0) + ((C && C.sombra >= 4) ? 1 : 0)));
      m.recompensa = Math.round(tpl.recompensa * (1 + 0.4 * (m.ameaca - 1)));
      M.wrng = r.s;
      M.missoes.push(m);
    }
  }

  function xpProx(n) { return 6 * n * (n + 1); }
  function ganharXp(st, n) {
    const h = st.hero; h.xp += n;
    if (st.exp) st.exp.xp += n;
    while (h.xp >= xpProx(h.nivel)) { h.nivel++; h.niveisPend++; }
  }

  function precoLoja(st, id) {
    const p = CP.ITENS[id].preco;
    return (st.mundo.rep.corvamonte >= 2 || (st.mundo.melhorias && st.mundo.melhorias.mercado >= 1)) ? Math.ceil(p * 0.8) : p;
  }
  function capMochila(st) { return CP.MOCHILA + ((st.hero.talentos || []).includes('bolsos') ? 1 : 0); }
  function reliquiaLoja(st) {
    if (!(st.mundo.melhorias && st.mundo.melhorias.mercado >= 1) || st.mundo.reliquiaVendida === st.mundo.cont) return null;
    const livres = Object.keys(CP.RELIQUIAS).filter(k => !(st.hero.reliquias || []).includes(k));
    if (!livres.length) return null;
    return livres[(st.mundo.cont * 7 + st.hero.nivel) % livres.length];
  }
  function talentosOferta(st) {
    const h = st.hero;
    const l = Object.keys(CP.TALENTOS).filter(k => (!CP.TALENTOS[k].classe || CP.TALENTOS[k].classe === h.classe) && !(h.talentos || []).includes(k));
    const r = new CP.RNG(st.semente + '|talento|' + h.nivel + '|' + h.niveisPend);
    return r.shuffle(l).slice(0, 2);
  }
  function stockLoja(st) {
    const l = CP.LOJA.slice();
    if (st.mundo.flags.cassio_poupado) l.push('cajadorunico');
    return l;
  }

  /* ================= Expedição: auxiliares ================= */
  const sala = st => st.exp.d.salas[st.exp.sala];
  const vivos = s => s.monstros.filter(m => m.pv > 0);
  const temItem = (st, id) => st.hero.mochila.includes(id);

  function passavel(e) {
    if (e.tipo === 'arco' || e.tipo === 'porta') return true;
    if (e.tipo === 'trancada') return e.aberta;
    if (e.tipo === 'secreta') return e.mec ? e.aberta : e.encontrada;
    return false;
  }
  function direcao(a, b) {
    if (b.c > a.c) return 'este'; if (b.c < a.c) return 'oeste';
    if (b.l > a.l) return 'sul'; return 'norte';
  }
  function nomeSala(s) { const c = Gen().centro(s); return Gen().coord(c.x, c.y); }

  // Saídas que o herói conhece a partir da sala atual
  function saidas(st) {
    const d = st.exp.d, s = sala(st);
    return d.arestas.filter(e => (e.a === s.id || e.b === s.id) && e.conhecida).map(e => {
      const o = d.salas[e.a === s.id ? e.b : e.a];
      return { e, o, dir: direcao(s, o) };
    });
  }

  // O que se percebe do outro lado de uma porta
  function pressentir(st, o) {
    if (o.estado === 'explorada') return '';
    const x = st.exp, v = vivos(o);
    if (o.id === x.d.objetivo && !x.objetivo) return tplDe(missao(st)).ambiente;
    if (v.some(m => m.acordado)) return 'ouves movimento';
    if (v.length && st.hero.classe === 'explorador') return 'algo respira do outro lado';
    return '';
  }

  function revelarSaidas(st, s) {
    const d = st.exp.d;
    for (const e of d.arestas) {
      if (e.a !== s.id && e.b !== s.id) continue;
      if (e.tipo === 'secreta' && !passavel(e)) continue;
      e.conhecida = true;
      const o = d.salas[e.a === s.id ? e.b : e.a];
      if (o.estado === 'desconhecida') o.estado = 'descoberta';
    }
  }

  function textoSaidas(st) {
    const L = saidas(st).map(({ e, o, dir }) => {
      const tipo = e.tipo === 'arco' ? 'arco' : e.tipo === 'trancada' && !e.aberta ? 'porta trancada' : e.tipo === 'secreta' ? 'passagem secreta' : 'porta';
      const p = pressentir(st, o);
      return `${tipo} a ${dir} (${nomeSala(o)})${p ? ': ' + p : ''}`;
    });
    return L.length ? 'Saídas: ' + L.join('; ') + '.' : '';
  }

  function missao(st) { return st.mundo.missoes.find(m => m.id === st.exp.mid); }

  function dano(st, ev, n, origem) {
    const h = st.hero;
    h.pv = Math.max(0, h.pv - n);
    ev.push({ t: 'mau', s: `${origem ? origem + ': ' : ''}perdes ${n} PV.`, fx: 'hurt', n });
  }

  function perigo(st, ev, n) {
    const x = st.exp;
    for (let i = 0; i < n; i++) {
      x.perigo++;
      if (x.perigo === 3) ev.push({ t: 'mau', s: CP.TIPOS[x.d.tipo].presagio, fx: 'omen' });
      if (x.perigo >= 6) { x.perigo = 0; errante(st, ev); }
    }
  }

  function errante(st, ev) {
    const T = CP.TIPOS[st.exp.d.tipo];
    const r = CP.RNG.fromState(st.rng); const tipo = r.pick(T.monstros); st.rng = r.s;
    const m = Gen().monstro(tipo, { acordado: true, errante: true });
    const am = (missao(st).ameaca || 1); m.pv += am - 1; m.pvMax = m.pv; if (am >= 3) m.atk++;
    sala(st).monstros.push(m);
    ev.push({ t: 'mau', s: `Um ${m.nome.toLowerCase()} errante encontra-te!`, fx: 'growl' });
    if (!st.exp.combate) iniciarCombate(st, ev, false);
  }

  /* ================= Entrar numa sala ================= */
  function entrar(st, ev, id) {
    const x = st.exp, d = x.d, s = d.salas[id];
    if (x.sala !== id) { x.prev = x.sala; x.sala = id; }
    const nova = s.estado !== 'explorada';
    s.estado = 'explorada';
    ev.push({ t: 'titulo', s: `${s.nome} · ${nomeSala(s)}`, fx: nova ? 'step' : null });
    if (nova) {
      ev.push({ t: 'n', s: s.desc });
      x.novas++;
      if (s.oculta) { ganharXp(st, 2); if (s.reliquia) { s.reliquia = false; darReliquia(st, ev, 'Num pedestal coberto de pó…'); } }
      if (s.evento && !s.evento.feito) ev.push({ t: 'mau', s: CP.EVENTOS[s.evento.id].titulo + '. ' + CP.EVENTOS[s.evento.id].txt });
      if (s.pista !== undefined) {
        const txt = varDe(missao(st)).pistas[s.pista];
        ev.push({ t: 'pista', s: txt, fx: 'reveal' }); x.pistas.push(txt); ganharXp(st, 1);
      }
      if (s.itemTxt) ev.push({ t: 'n', s: s.itemTxt });
      if (s.restos) {
        ev.push({ t: 'n', s: `Restos de um aventureiro. Um bilhete na mão: ${s.restos.nota}` });
        if (s.restos.saque) s.itens.push(s.restos.saque);
        s.ouro += s.restos.ouro;
      }
      if (s.inscricao) ev.push({ t: 'n', s: 'Há uma inscrição gravada na parede.' });
      if (s.mec) ev.push({ t: 'n', s: 'Numa parede, três símbolos em relevo: Sol, Lua e Corvo. Parecem botões.' });
      if (s.itens.length && !s.itemTxt) ev.push({ t: 'n', s: 'Vês algo no chão: ' + s.itens.map(i => CP.ITENS[i].nome.toLowerCase()).join(', ') + '.' });
    } else {
      ev.push({ t: 'n', s: 'Já conheces esta sala.' });
    }
    if (s.ouro > 0) { st.hero.ouro += s.ouro; x.ouro += s.ouro; ev.push({ t: 'ok', s: `Apanhas ${s.ouro} moeda${s.ouro > 1 ? 's' : ''}.`, fx: 'coin', n: s.ouro }); s.ouro = 0; }

    // armadilha
    if (s.armadilha && !s.armadilha.gasta) {
      const A = CP.TIPOS[d.tipo].armadilha;
      s.armadilha.gasta = true;
      if (st.hero.classe === 'explorador' || st.hero.companheiro === 'tome') {
        ev.push({ t: 'ok', s: `${st.hero.companheiro === 'tome' && st.hero.classe !== 'explorador' ? 'Tomé repara' : 'Reparas'} numa armadilha (${A.nome}) e contornam-na.` }); ganharXp(st, 1);
      } else {
        ev.push({ t: 'n', s: A.txt, fx: 'trap' });
        const r = teste(st, ev, { attr: 'agilidade', vant: st.hero.classe === 'ladrao', rotulo: 'Reflexos (Agilidade)' });
        if (r.ok) ev.push({ t: 'ok', s: 'Saltas a tempo.' });
        else { dano(st, ev, A.dano, 'Armadilha'); perigo(st, ev, 1); }
        if (st.hero.pv <= 0) return;
      }
    }

    // criaturas
    const v = vivos(s);
    if (s.chefe && !x.objetivo && v.some(m => m.chefe)) {
      x.confronto = true;
      v.forEach(m => { if (m.chefe) m.acordado = false; });
      ev.push({ t: 'mau', s: varDe(missao(st)).encontro, fx: 'boss' });
    } else if (v.some(m => m.acordado)) {
      ev.push({ t: 'mau', s: v.filter(m => m.acordado).map(m => m.nome).join(' e ') + ' ataca!', fx: 'growl' });
      iniciarCombate(st, ev, false);
    } else if (v.length) {
      v.forEach(m => verBestiario(st, m));
      ev.push({ t: 'mau', s: s.esgueirado ? `${v[0].nome} continua a dormir.` : `${v[0].nome} dorme encostado à parede. Ainda não te viu.` });
    }

    revelarSaidas(st, s);
    const ts = textoSaidas(st); if (ts) ev.push({ t: 'info', s: ts });
    if (nova && x.novas % 3 === 0 && !x.combate) perigo(st, ev, 1);
  }

  /* ================= Combate por rondas de dados =================
     No início de cada ronda lanças os teus quatro dados (um por atributo) e cada criatura anuncia a intenção.
     Depois distribuis os dados: ataque, defesa (um dado por criatura que ataca), habilidade da classe, banir ou fuga.
     O resultado é conhecido antes de confirmares; a sorte está no lançamento, a decisão é tua. */
  const ATRIBS = ['forca', 'agilidade', 'astucia', 'espirito'];
  const temR = (st, id) => (st.hero.reliquias || []).includes(id);
  const temT = (st, id) => (st.hero.talentos || []).includes(id);
  const perfil = m => CP.MONSTROS[m.tipo];
  const rnd = st => { const r = CP.RNG.fromState(st.rng); return { r, fim: () => { st.rng = r.s; } }; };

  function conhecerFraqueza(st, m) {
    if (temR(st, 'olho') || temT(st, 'batedor')) return true;
    const b = st.mundo.bestiario[m.tipo]; if (b && b.derrotados > 0) return true;
    return !!(st.exp && st.exp.fraquezas && st.exp.fraquezas[m.tipo]);
  }
  function verBestiario(st, m) { const B = st.mundo.bestiario; B[m.tipo] = B[m.tipo] || { visto: true, derrotados: 0 }; }

  function escolherIntencao(st, m, R) {
    const P = perfil(m), tabela = (m.fase2 && P.fase2 && P.fase2.int) || P.int;
    let opcoes = Object.entries(tabela).filter(([k]) => !(k === 'chamar' && (m.chamou || !P.aliado)) && !(k === 'fugir' && m.pv > 1) && !(k === 'curar' && m.pv >= m.pvMax));
    if (!opcoes.length) opcoes = [['golpe', 1]];
    const total = opcoes.reduce((a, [, p]) => a + p, 0);
    let x = R.next() * total, tipo = opcoes[0][0];
    for (const [k, p] of opcoes) { if ((x -= p) < 0) { tipo = k; break; } }
    const extra = (m.fase2 && P.fase2 && P.fase2.dano) || 0;
    const I = { tipo };
    if (tipo === 'golpe') Object.assign(I, { forca: 4 + m.atk, dano: m.dano + extra });
    if (tipo === 'forte') Object.assign(I, { forca: 6 + m.atk, dano: m.dano + 1 + extra });
    if (tipo === 'drenar') Object.assign(I, { forca: 4 + m.atk, dano: Math.max(1, m.dano - 1) + extra });
    if (tipo === 'feitico') Object.assign(I, { forca: 5 + m.atk, dano: Math.max(1, 2 + extra - (m.tipo === 'varro' && st.mundo.flags.reliquia_devolvida ? 1 : 0)) });
    if (tipo === 'teia') Object.assign(I, { forca: 5 + m.atk, dano: 0 });
    if (tipo === 'curar') Object.assign(I, { cura: 2 });
    return I;
  }
  const ataca = I => I && ['golpe', 'forte', 'drenar', 'feitico', 'teia'].includes(I.tipo);

  function textoIntencao(I) {
    if (!I) return 'Atordoado';
    return {
      golpe: `Golpe: precisas de ${I.forca} para defender · ${I.dano} de dano`,
      forte: `Golpe forte: precisas de ${I.forca} · ${I.dano} de dano`,
      drenar: `Mordida: precisas de ${I.forca} · ${I.dano} de dano e cura-se`,
      feitico: `Feitiço: precisas de ${I.forca} · ${I.dano} de dano · a armadura não conta`,
      teia: `Prender: precisas de ${I.forca} · se falhar perdes um dado`,
      defender: 'Defende-se: +2 à defesa nesta ronda',
      chamar: 'Vai chamar ajuda',
      fugir: 'Prepara-se para fugir',
      curar: 'Vai recuperar 2 de vida',
      atordoado: 'Atordoado: não age nesta ronda'
    }[I.tipo];
  }

  function novaRonda(st, ev) {
    const x = st.exp, c = x.combate, h = st.hero, { r, fim } = rnd(st);
    c.ronda++;
    c.dados = ATRIBS.map(a => ({ attr: a, lados: ladosDe(attrEf(st, a)), v: r.int(1, ladosDe(attrEf(st, a))) }));
    if (h.companheiro) { const Cp = CP.COMPANHEIROS[h.companheiro], L = CP.DADOS[Cp.dado]; c.dados.push({ attr: 'comp', comp: h.companheiro, lados: L, v: r.int(1, L) }); }
    if (c.preso) {   // teia ou areia: perde o dado mais alto
      let mi = 0; c.dados.forEach((d, i) => { if (d.v > c.dados[mi].v) mi = i; });
      c.dados[mi].perdido = true; c.preso = false;
      ev.push({ t: 'mau', s: `Estás preso: perdes o dado de ${CP.ATRIB[c.dados[mi].attr]} nesta ronda.` });
    }
    const primeira = c.ronda === 1 && (c.surpresa || temT(st, 'sombra'));
    vivos(sala(st)).filter(m => m.acordado || m.chefe).forEach(m => {
      verBestiario(st, m);
      m.intencao = primeira ? { tipo: 'atordoado' } : escolherIntencao(st, m, r);
    });
    fim();
    ev.push({ t: 'info', s: `Ronda ${c.ronda}. Lançaste: ` + c.dados.filter(d => !d.perdido).map(d => `${d.comp ? CP.COMPANHEIROS[d.comp].nome.split(',')[0] : CP.ATRIB[d.attr]} ${d.v}`).join(', ') + '.', fx: 'dice' });
  }

  function iniciarCombate(st, ev, surpresa) {
    const x = st.exp;
    if (x.combate) return;
    acordarTodos(st);
    x.confronto = false;
    x.combate = { ronda: 0, surpresa: !!surpresa, relancesGratis: temR(st, 'moeda') ? 1 : 0, primeiroGolpe: true };
    perigo(st, ev, 1);
    if (!st.exp || !st.exp.combate) return;
    novaRonda(st, ev);
  }
  function alvo(st) { return vivos(sala(st)).find(m => m.acordado) || vivos(sala(st))[0] || null; }
  function inimigos(st) { return vivos(sala(st)).filter(m => m.acordado); }

  // calcula o efeito de uma distribuição de dados (usado para a pré-visualização e para resolver)
  function previsao(st, at) {
    const x = st.exp, c = x.combate, h = st.hero; if (!c) return null;
    const D = i => (i != null && c.dados[i] && !c.dados[i].perdido) ? c.dados[i] : null;
    const w = CP.ITENS[h.arma], m = alvo(st), P = m && perfil(m);
    const melh = st.mundo.melhorias || {};
    const res = { ataque: null, defesa: [], hab: null, banir: null, fuga: null };
    const atk = (at.ataque || []).map(D).filter(Boolean);
    // habilidade
    const dh = D(at.hab), cls = h.classe;
    let investida = 0, somar = 0;
    if (dh) {
      if (cls === 'guerreiro') { res.hab = { ok: dh.v >= 4, txt: dh.v >= 4 ? '+2 de dano no ataque' : 'Precisa de 4+' }; if (dh.v >= 4) investida = 2; }
      if (cls === 'ladrao') { const lim = temT(st, 'golpe_duplo') ? 4 : 3; const ok = dh.v <= lim && atk.length > 0; res.hab = { ok, txt: ok ? `+${dh.v} ao dado de ataque` : (dh.v > lim ? `Só dados até ${lim}` : 'Precisa de um dado no ataque') }; if (ok) somar = dh.v; }
      if (cls === 'explorador') { const ok = dh.v >= 5 && !!m; res.hab = { ok, txt: ok ? `${m.nome} fica atordoado` : 'Precisa de 5+' }; }
      if (cls === 'mistico') { const cura = temT(st, 'luz_interior') ? dh.v : Math.ceil(dh.v / 2); res.hab = { ok: true, txt: `Cura ${Math.min(cura, h.pvMax - h.pv)} PV` , cura }; }
    }
    // ataque
    if (atk.length && m) {
      const defM = 4 + m.def + (m.intencao && m.intencao.tipo === 'defender' ? 2 : 0);
      let total = 0, maximo = false, fraco = false;
      atk.forEach((d, k) => {
        let v = d.v + (d.attr === w.attr ? w.atk + (melh.ferreiro >= 1 ? 1 : 0) : d.attr === 'comp' ? 0 : -1) + (k === 0 ? somar : 0);
        if (d.attr === P.fraco) fraco = true;
        if (d.v === d.lados) maximo = true;
        total = Math.max(total, v); d._v = v;
      });
      const acertos = atk.filter(d => d._v >= (d.attr === P.fraco ? defM - 2 : defM) && d.v > 1);
      let dano = 0;
      acertos.forEach((d, k) => {
        let n = w.dano + (d.v === d.lados ? 1 : 0);
        if (k === 0) n += investida + (c.primeiroGolpe && temR(st, 'pedra_amolar') ? 1 : 0);
        if (d.attr === P.fraco) n += 1;
        if (P.fam === 'fera' && (temR(st, 'dente_lobo') || temT(st, 'cacador') || h.companheiro === 'brigida')) n += 1;
        if (P.fam === 'morto' && (temR(st, 'rosario') || temT(st, 'exorcista') || h.companheiro === 'cassio')) n += 1;
        if (k === 0 && c.surpresa && c.ronda === 1 && cls === 'ladrao') n *= 2;
        dano += n;
      });
      res.ataque = { ok: acertos.length > 0, dano, valor: Math.max(...atk.map(d => d._v)), alvo: defM, fraco, txt: acertos.length ? `Acertas: ${dano} de dano` : `Falha (precisas de ${defM}${fraco ? `, ${defM - 2} com o dado da fraqueza` : ''})` };
    }
    // banir (místico, com ritual)
    const db = D(at.banir);
    if (db && m) { const ok = P.fam === 'morto' && db.v >= 4 + (m.chefe ? 1 : 0); res.banir = { ok, dano: ok ? 3 + (temT(st, 'exorcista') ? 1 : 0) : 0, txt: P.fam !== 'morto' ? 'Só contra mortos-vivos' : ok ? 'Bane: 3 de dano' : `Precisa de ${4 + (m.chefe ? 1 : 0)}+` }; }
    // fuga
    const df = D(at.fuga);
    if (df) { const alvoF = 4 + inimigos(st).length - 1, v = df.v + (cls === 'ladrao' ? 2 : 0) + (temR(st, 'botas') ? 2 : 0); res.fuga = { ok: v >= alvoF, txt: v >= alvoF ? 'Foges antes de te atingirem' : `Precisas de ${alvoF}` }; }
    // defesa
    const atacantes = inimigos(st).filter(mm => ataca(mm.intencao) && !(res.hab && cls === 'explorador' && res.hab.ok && mm === m));
    const arm = (h.armadura ? CP.ITENS[h.armadura].def : 0) + (h.escudo ? CP.ITENS[h.escudo].def : 0) + (melh.ferreiro >= 2 ? 1 : 0) + (temR(st, 'escudo_vime') ? 1 : 0) + (temT(st, 'couraca') ? 1 : 0);
    const defs = (at.defesa || []).map(D).filter(Boolean);
    atacantes.forEach((mm, k) => {
      const d = defs[k], I = mm.intencao;
      if (!d) { res.defesa.push({ m: mm, ok: false, dano: I.dano, txt: `${mm.nome}: sofres ${I.dano}` }); return; }
      const v = d.v + (I.tipo === 'feitico' ? (d.attr === 'espirito' ? 2 : 0) : arm);
      const ok = v >= I.forca;
      res.defesa.push({ m: mm, ok, dano: ok ? 0 : I.dano, valor: v, contra: ok && d.v === d.lados && temT(st, 'contra_ataque'), txt: ok ? `${mm.nome}: defendes (${v} contra ${I.forca})` : `${mm.nome}: falhas (${v} contra ${I.forca}) e sofres ${I.dano}` });
    });
    return res;
  }

  // espaços onde podes pôr dados nesta ronda
  function slotsCombate(st) {
    const x = st.exp, h = st.hero, m = alvo(st), H = CP.HABILIDADES[h.classe];
    const L = [{ id: 'ataque', nome: 'Atacar', desc: `${m ? m.nome : ''}`, max: temT(st, 'mestre_armas') ? 2 : 1 },
      { id: 'defesa', nome: 'Defender', desc: 'Um dado por cada ataque anunciado', max: Math.max(1, inimigos(st).filter(mm => ataca(mm.intencao)).length) },
      { id: 'hab', nome: H.nome, desc: H.desc, max: 1 }];
    if (h.classe === 'mistico' && x.rituais > 0 && m && perfil(m).fam === 'morto') L.push({ id: 'banir', nome: `Banir (${x.rituais})`, desc: 'Dado 4+ contra mortos-vivos: 3 de dano', max: 1 });
    L.push({ id: 'fuga', nome: 'Fugir', desc: 'Dado ' + (4 + inimigos(st).length - 1) + '+' + (h.classe === 'ladrao' ? ' (+2 por seres ladrão)' : ''), max: 1 });
    return L;
  }

  function ronda(st, ev, at) {
    const x = st.exp, c = x.combate, h = st.hero; if (!c) return;
    const p = previsao(st, at), m = alvo(st);
    // fuga primeiro
    if (p.fuga) {
      ev.push({ t: 'd', s: 'Fuga', dados: [c.dados[at.fuga].v], lados: c.dados[at.fuga].lados, bonus: 0, alvo: 0, v: c.dados[at.fuga].v, nat: c.dados[at.fuga].v, ok: p.fuga.ok, max: false, vant: false, combate: true });
      if (p.fuga.ok) {
        x.combate = null; vivos(sala(st)).forEach(mm => { mm.intencao = null; });
        ev.push({ t: 'ok', s: 'Foges pelo caminho por onde vieste.' });
        if (x.sala === x.d.inicio || x.prev === null) fimExpedicao(st, ev, 'retirada');
        else entrar(st, ev, x.prev);
        return;
      }
      ev.push({ t: 'mau', s: 'Tentas fugir, mas cortam-te o caminho.' });
    }
    // habilidade
    if (p.hab) {
      if (h.classe === 'mistico') { const n = Math.min(p.hab.cura, h.pvMax - h.pv); h.pv += n; ev.push({ t: 'ok', s: `Prece: recuperas ${n} PV.`, fx: 'heal', n }); }
      if (h.classe === 'explorador' && p.hab.ok && m) { m.intencao = { tipo: 'atordoado' }; ev.push({ t: 'ok', s: `Rasteira! ${m.nome} cai e fica atordoado.`, fx: 'block' }); }
      if (h.classe === 'guerreiro' && p.hab.ok) ev.push({ t: 'info', s: 'Investida!' });
      if (h.classe === 'ladrao' && p.hab.ok) ev.push({ t: 'info', s: 'Golpe baixo!' });
    }
    // banir
    if (p.banir && m) {
      x.rituais--;
      if (p.banir.ok) { ev.push({ t: 'ok', s: 'Ritual de Banir: a criatura arde em luz.', fx: 'reveal' }); ferir(st, ev, m, p.banir.dano); }
      else ev.push({ t: 'mau', s: 'O ritual de Banir não tem efeito.' });
    }
    // ataque
    if (p.ataque && alvo(st)) {
      const atk = at.ataque.map(i => c.dados[i]);
      ev.push({ t: 'd', s: 'Ataque', dados: atk.map(d => d.v), lados: atk[0].lados, bonus: 0, alvo: p.ataque.alvo, v: p.ataque.valor, nat: Math.max(...atk.map(d => d.v)), ok: p.ataque.ok, max: atk.some(d => d.v === d.lados), vant: false, combate: true });
      if (p.ataque.ok) { if (p.ataque.fraco) ev.push({ t: 'info', s: 'Atacas a fraqueza!' }); ferir(st, ev, alvo(st), p.ataque.dano); c.primeiroGolpe = false; }
      else ev.push({ t: 'mau', s: 'Falhas o golpe.', fx: 'miss' });
    }
    if (!x.combate || verificarFim(st, ev)) return;
    // as criaturas agem
    let k = 0;
    for (const mm of vivos(sala(st)).filter(o => o.acordado)) {
      const I = mm.intencao; if (!I || I.tipo === 'atordoado') continue;
      if (ataca(I)) {
        const d = p.defesa.find(o => o.m === mm) || { ok: false, dano: I.dano };
        k++;
        if (d.ok) {
          ev.push({ t: 'ok', s: `Defendes o ataque de ${mm.nome}.`, fx: 'block' });
          if (d.contra) { ev.push({ t: 'ok', s: 'Contra-ataque!' }); ferir(st, ev, mm, 1); }
        } else {
          if (I.tipo === 'teia') { c.preso = true; ev.push({ t: 'mau', s: `${mm.nome} prende-te. Na próxima ronda tens menos um dado.`, fx: 'trap' }); }
          if (I.dano) dano(st, ev, I.dano, mm.nome);
          if (I.tipo === 'drenar' && mm.pv > 0) { mm.pv = Math.min(mm.pvMax, mm.pv + 1); }
        }
        if (h.pv <= 0) return;
      } else if (I.tipo === 'chamar') {
        const P = perfil(mm); mm.chamou = true;
        const novo = Gen().monstro(P.aliado, { acordado: true, errante: true }); sala(st).monstros.push(novo);
        ev.push({ t: 'mau', s: `${mm.nome} chama ajuda: chega ${novo.nome.toLowerCase()}!`, fx: 'growl' });
      } else if (I.tipo === 'fugir') {
        mm.pv = 0; mm.fugiu = true; ev.push({ t: 'info', s: `${mm.nome} foge pela escuridão.` });
      } else if (I.tipo === 'curar') {
        mm.pv = Math.min(mm.pvMax, mm.pv + I.cura); ev.push({ t: 'mau', s: `${mm.nome} recupera ${I.cura} de vida.` });
      } else if (I.tipo === 'defender') {
        ev.push({ t: 'info', s: `${mm.nome} mantém a guarda.` });
      }
    }
    if (!verificarFim(st, ev)) novaRonda(st, ev);
  }

  function ferir(st, ev, m, n) {
    m.pv -= n;
    ev.push({ t: 'ok', s: `Acertas em ${m.nome}: ${n} de dano.`, fx: 'hit', n, alvo: m.tipo });
    const P = perfil(m);
    if (m.pv > 0 && m.chefe && P.fase2 && !m.fase2 && m.pv <= Math.ceil(m.pvMax / 2)) {
      m.fase2 = true;
      ev.push({ t: 'mau', s: P.fase2.txt, fx: 'boss' });
      if (P.fase2.chama) { const novo = Gen().monstro(P.fase2.chama, { acordado: true, errante: true }); sala(st).monstros.push(novo); }
    }
    if (m.pv <= 0) {
      m.pv = 0;
      ev.push({ t: 'ok', s: `${m.nome} cai.`, fx: 'kill' });
      ganharXp(st, m.chefe ? 3 : 1);
      const B = st.mundo.bestiario; B[m.tipo] = B[m.tipo] || { visto: true, derrotados: 0 }; B[m.tipo].derrotados++;
      if (m.chefe) {
        objetivoCumprido(st, ev, null);
        const am = (missao(st).ameaca || 1), { r, fim } = rnd(st); const sorte = r.next(); fim();
        if (sorte < 0.25 * am) darReliquia(st, ev, `${m.nome} deixa cair algo.`);
      }
    }
  }
  function verificarFim(st, ev) {
    if (!st.exp.combate) return true;
    if (!vivos(sala(st)).some(m => m.acordado)) {
      st.exp.combate = null;
      vivos(sala(st)).forEach(m => { m.intencao = null; });
      ev.push({ t: 'info', s: 'O combate terminou.' });
      return true;
    }
    return false;
  }
  function acordarTodos(st) { vivos(sala(st)).forEach(m => { m.acordado = true; }); }

  function darReliquia(st, ev, frase) {
    const h = st.hero; h.reliquias = h.reliquias || [];
    const livres = Object.keys(CP.RELIQUIAS).filter(k => !h.reliquias.includes(k));
    if (!livres.length) { h.ouro += 15; ev.push({ t: 'ok', s: `${frase} Uma peça valiosa: 15 moedas.`, fx: 'coin', n: 15 }); return; }
    const { r, fim } = rnd(st); const id = r.pick(livres); fim();
    h.reliquias.push(id);
    if (id === 'coracao') { h.pvMax += 3; h.pv += 3; }
    if (id === 'amuleto' && st.exp) st.exp.folego++;
    ev.push({ t: 'pista', s: `${frase} Relíquia: ${CP.RELIQUIAS[id].nome}. ${CP.RELIQUIAS[id].desc}`, fx: 'relic', reliquia: id });
  }

  /* ================= Objetivo e fim ================= */
  function objetivoCumprido(st, ev, sol) {
    const x = st.exp, v = varDe(missao(st));
    x.objetivo = true; x.confronto = false;
    if (sol) {
      ev.push({ t: 'ok', s: sol.txt, fx: 'peace' });
      x.resolucao = { rep: sol.rep, flag: sol.flag, via: 'paz', txt: sol.txt };
      vivos(sala(st)).filter(m => m.chefe).forEach(m => { m.pv = 0; m.pacificado = true; });
      if (sol.requer && CP.ITENS[sol.requer].tipo !== 'ferramenta') {
        const i = st.hero.mochila.indexOf(sol.requer); if (i >= 0) st.hero.mochila.splice(i, 1);
      }
      ganharXp(st, 3);
    } else {
      ev.push({ t: 'ok', s: v.vitoria });
      x.resolucao = { rep: v.repVitoria, flag: v.flagVitoria, via: 'combate', txt: v.vitoria };
    }
    ev.push({ t: 'info', s: 'Objetivo cumprido. Podes continuar a explorar ou regressar à aldeia.', fx: 'win' });
    if (x.combate) verificarFim(st, ev);
  }

  function fimExpedicao(st, ev, tipo) {
    const x = st.exp, m = missao(st), tpl = tplDe(m), h = st.hero, M = st.mundo;
    const res = { tipo, titulo: m.titulo, ouro: x.ouro, xp: x.xp, linhas: [] };
    if (tipo === 'sucesso') {
      const v0 = varDe(m);
      x.resolucao = x.resolucao || { rep: v0.repVitoria, flag: v0.flagVitoria, via: 'combate', txt: v0.vitoria };
      const rep = M.rep[tpl.local] || 0;
      const ouro = (m.recompensa || tpl.recompensa) + Math.max(0, rep) * 2;
      h.ouro += ouro; res.ouro += ouro;
      M.rep[tpl.local] = Math.max(-3, Math.min(3, rep + x.resolucao.rep + (x.prisioneiro || x.ferido ? 1 : 0)));
      if (x.prisioneiro || x.ferido) res.linhas.push('Quem ajudaste lá em baixo espalhou o teu nome pela aldeia.');
      if (x.resolucao.flag) M.flags[x.resolucao.flag] = true;
      ganharXp(st, 5); res.xp = x.xp;
      res.linhas.push(x.resolucao.txt);
      res.linhas.push(`${tpl.cliente} pagam-te ${ouro} moedas.`.replace('O capataz Gonçalo pagam', 'O capataz Gonçalo paga').replace('Frei Anselmo pagam', 'Frei Anselmo paga'));
      res.linhas.push(`Reputação em ${CP.LOCAIS[tpl.local].nome}: ${M.rep[tpl.local] > 0 ? '+' : ''}${M.rep[tpl.local]}.`);
      if (!M.flags.pedrafunda) { M.flags.pedrafunda = true; res.linhas.push('Na taberna fala-se de mineiros desaparecidos em Pedra-Funda. Há trabalho por lá.'); }
      campanhaAvanca(st, tpl, res);
      m.estado = 'concluida';
      M.historico.push({ titulo: m.titulo, nome: m.vars.nome, via: x.resolucao.via, flag: x.resolucao.flag });
      M.missoes = M.missoes.filter(o => o.id !== m.id);
      // objetos de missão ficam com o cliente (exceto os que se podem vender)
      h.mochila = h.mochila.filter(i => CP.ITENS[i].tipo !== 'missao' || CP.ITENS[i].valor);
      geraMissoes(st);
    } else {
      m.estado = 'em_curso';
      m.masmorra = x.d; m.pistas = x.pistas; m.objetivo = x.objetivo; m.resolucao = x.resolucao || null;
      if (tipo === 'derrota' && (M.melhorias.templo || 0) >= 2) {
        h.pv = Math.max(1, Math.floor(h.pvMax / 2));
        res.linhas.push('Os irmãos da capela foram buscar-te. Não perdeste nada.');
      } else if (tipo === 'derrota') {
        const livresF = Object.keys(CP.FERIMENTOS).filter(f => !h.ferimentos.includes(f));
        if (livresF.length) {
          const { r, fim } = rnd(st); const f = r.pick(livresF); fim();
          h.ferimentos.push(f); if (CP.FERIMENTOS[f].pv) { h.pvMax -= CP.FERIMENTOS[f].pv; }
          res.linhas.push(`Ficaste com uma mazela: ${CP.FERIMENTOS[f].nome}. ${CP.FERIMENTOS[f].desc} A capela pode tratar-te.`);
        }
        const perdidos = h.mochila.filter(i => CP.ITENS[i].tipo === 'tesouro');
        h.mochila = h.mochila.filter(i => CP.ITENS[i].tipo !== 'tesouro');
        const perdeu = Math.floor(h.ouro / 2); h.ouro -= perdeu;
        h.pv = Math.max(1, Math.floor(h.pvMax / 2));
        res.linhas.push(`Um pastor encontra-te à entrada e leva-te para ${CP.LOCAIS[tpl.local].nome}.`);
        res.linhas.push(`Perdeste ${perdeu} moedas${perdidos.length ? ' e os tesouros que levavas' : ''}.`);
        res.linhas.push('A missão continua por cumprir. A masmorra fica como a deixaste.');
      } else {
        res.linhas.push('Saíste a tempo. A masmorra fica como a deixaste e podes voltar quando quiseres.');
      }
    }
    if (tipo !== 'sucesso' && M.campanha) { M.campanha.sombra = Math.min(10, M.campanha.sombra + 1); res.linhas.push('A Sombra sobre Valdemora cresce um pouco.'); }
    if (h.niveisPend) res.linhas.push(`Subiste ao nível ${h.nivel}! Escolhe a melhoria na aldeia.`);
    st.resumo = res; st.exp = null; st.ecra = 'resumo';
  }

  /* ================= Eventos com escolhas ================= */
  function revelarFraquezaChefe(st, ev) {
    const d = st.exp.d, chefe = d.salas[d.objetivo].monstros.find(m => m.chefe);
    if (!chefe) return;
    st.exp.fraquezas = st.exp.fraquezas || {}; st.exp.fraquezas[chefe.tipo] = true;
    const P = perfil(chefe);
    ev.push({ t: 'pista', s: `Ficas a saber: ${chefe.nome} é fraco contra ${CP.ATRIB[P.fraco]}. Atacar com esse dado é mais fácil e causa +1 de dano.`, fx: 'reveal' });
  }
  function resolverEvento(st, ev, op) {
    const x = st.exp, h = st.hero, s = sala(st), E = s.evento; if (!E || E.feito) return;
    const { r, fim } = rnd(st); const sorte = r.next(); fim();
    E.feito = true;
    switch (E.id + ':' + op) {
      case 'altar:rezar': {
        const t = teste(st, ev, { attr: 'espirito', rotulo: 'Rezar (Espírito)' });
        if (t.ok) { x.folego++; ev.push({ t: 'ok', s: 'Uma calma estranha enche-te o peito. +1 de fôlego.', fx: 'heal', n: 0 }); if (sorte < .3) darReliquia(st, ev, 'Debaixo da taça encontras uma oferenda antiga.'); }
        else ev.push({ t: 'info', s: 'Nada acontece. O silêncio pesa.' });
        break;
      }
      case 'altar:profanar': {
        const n = 6 + Math.floor(sorte * 7); h.ouro += n; x.ouro += n;
        ev.push({ t: 'ok', s: `A taça vale ${n} moedas.`, fx: 'coin', n });
        if (sorte < .45) { x.folego = Math.max(0, x.folego - 1); ev.push({ t: 'mau', s: 'Um frio percorre-te as costas. Perdes 1 de fôlego.', fx: 'omen' }); }
        perigo(st, ev, 2);
        break;
      }
      case 'pocao:beber': {
        if (sorte < .4) { const c = h.pvMax - h.pv; h.pv = h.pvMax; ev.push({ t: 'ok', s: `Sabe a mel. Recuperas toda a vida (+${c}).`, fx: 'heal', n: c }); }
        else if (sorte < .7) { x.folego++; ev.push({ t: 'ok', s: 'O coração acelera. +1 de fôlego.', fx: 'heal', n: 0 }); }
        else dano(st, ev, 2, 'Veneno');
        break;
      }
      case 'prisioneiro:libertar': {
        const ok = temItem(st, 'gazua') || h.classe === 'ladrao' || teste(st, ev, { attr: 'forca', rotulo: 'Partir as correntes (Força)' }).ok;
        if (ok) {
          x.d.salas.forEach(o => { if (o.estado === 'desconhecida' && !o.oculta) o.estado = 'descoberta'; });
          x.d.arestas.forEach(e => { if (e.tipo !== 'secreta') e.conhecida = true; });
          x.prisioneiro = true;
          ev.push({ t: 'ok', s: '«Obrigado!» Desenha-te o mapa no pó antes de fugir. Ficas a conhecer todas as salas.', fx: 'reveal' });
          ganharXp(st, 2);
        } else { ev.push({ t: 'mau', s: 'As correntes não cedem e o barulho ecoa.' }); perigo(st, ev, 1); }
        break;
      }
      case 'prisioneiro:interrogar': ev.push({ t: 'n', s: '«O que manda aqui? Sei o ponto fraco dele…»' }); revelarFraquezaChefe(st, ev); break;
      case 'bau:examinar': {
        const t = teste(st, ev, { attr: 'astucia', vant: temT(st, 'olho_atento'), rotulo: 'Examinar (Astúcia)' });
        if (t.ok && E.mimico) { ev.push({ t: 'ok', s: 'A tampa respira. É um mímico! Afastas-te e ele não te persegue.' }); ganharXp(st, 1); }
        else if (t.ok) { E.feito = false; E.seguro = true; ev.push({ t: 'ok', s: 'É um baú normal, só bem conservado. Podes abri-lo sem medo.' }); }
        else { E.feito = false; ev.push({ t: 'info', s: 'Não consegues perceber nada de especial.' }); E.examinado = true; }
        break;
      }
      case 'bau:abrir': {
        if (E.mimico) {
          const mm = Gen().monstro('mimico', { acordado: true }); mm.pv += (missao(st).ameaca || 1) - 1; mm.pvMax = mm.pv; s.monstros.push(mm);
          ev.push({ t: 'mau', s: 'O baú abre uma boca cheia de dentes!', fx: 'growl' });
          iniciarCombate(st, ev, false);
        } else {
          const n = 5 + Math.floor(sorte * 8); h.ouro += n; x.ouro += n; ev.push({ t: 'ok', s: `Lá dentro: ${n} moedas.`, fx: 'coin', n });
          if (sorte < .3) darReliquia(st, ev, 'No fundo do baú, embrulhada num pano…');
        }
        break;
      }
      case 'fonte:beber': {
        const c = Math.min(3, h.pvMax - h.pv); h.pv += c; ev.push({ t: 'ok', s: `A água é gelada. +${c} PV.`, fx: 'heal', n: c });
        if (sorte < .3) { ev.push({ t: 'mau', s: 'O murmúrio transforma-se num grito.', fx: 'omen' }); perigo(st, ev, 2); }
        break;
      }
      case 'fonte:moeda': {
        if (h.ouro > 0) { h.ouro--; x.folego++; ev.push({ t: 'ok', s: 'A moeda brilha no fundo. +1 de fôlego.', fx: 'coin', n: 0 }); }
        else { E.feito = false; ev.push({ t: 'info', s: 'Não tens moedas.' }); }
        break;
      }
      case 'ferido:pocao': {
        const i = h.mochila.indexOf('pocao');
        if (i < 0) { E.feito = false; ev.push({ t: 'info', s: 'Não tens nenhuma poção.' }); break; }
        h.mochila.splice(i, 1); ganharXp(st, 2); x.ferido = true;
        ev.push({ t: 'ok', s: '«Devo-te a vida.» Antes de partir, conta-te o que viu.', fx: 'heal', n: 0 });
        revelarFraquezaChefe(st, ev);
        darReliquia(st, ev, 'Dá-te um amuleto que trazia ao pescoço.');
        break;
      }
      case 'ferido:ouvir': ev.push({ t: 'n', s: '«Lá ao fundo… ouve bem.»' }); revelarFraquezaChefe(st, ev); break;
      case 'livro:ler': {
        const t = teste(st, ev, { attr: 'astucia', vant: h.classe === 'mistico', rotulo: 'Ler (Astúcia)' });
        if (t.ok) { ganharXp(st, 3); ev.push({ t: 'ok', s: 'Entre maldições, uma página útil.', fx: 'reveal' }); revelarFraquezaChefe(st, ev); }
        else { dano(st, ev, 2, 'As letras queimam-te os olhos'); perigo(st, ev, 1); }
        break;
      }
      case 'livro:queimar': x.folego++; ev.push({ t: 'ok', s: 'O livro arde com uma chama verde. Sentes-te mais leve. +1 de fôlego.', fx: 'fire' }); break;
      case 'vagoneta:empurrar': {
        const t = teste(st, ev, { attr: 'forca', rotulo: 'Levantar (Força)' });
        if (t.ok) { const n = 6 + Math.floor(sorte * 8); h.ouro += n; x.ouro += n; ev.push({ t: 'ok', s: `Debaixo da vagoneta, um saco com ${n} moedas.`, fx: 'coin', n }); }
        else dano(st, ev, 1, 'A vagoneta escorrega');
        break;
      }
      default: ev.push({ t: 'info', s: 'Segues em frente.' });
    }
  }

  /* ================= Campanha: A Sombra de Varro ================= */
  function campanhaAvanca(st, tpl, res) {
    const M = st.mundo, C = M.campanha; if (!C || C.fim) return;
    if (tpl.historia) {
      C.feitos.push(tpl.id); C.sombra = Math.max(0, C.sombra - 2);
      res.linhas.push('A Sombra sobre Valdemora recua.');
      if (C.ato === 2 && ['negrume', 'abadia'].every(k => C.feitos.includes(k))) { C.ato = 3; C.cena = 'ato3'; res.linhas.push('Capítulo III: a Torre do Corvo espera-te.'); }
      if (tpl.id === 'torre') { C.fim = epilogo(st); C.cena = 'fim'; C.sombra = 0; M.flags.valdemora_livre = true; res.linhas.push('A campanha da Sombra de Varro terminou. Valdemora continua a precisar de ti.'); }
      return;
    }
    C.sucessos++;
    if (C.ato === 1) {
      const frag = CP.FRAGMENTOS[tpl.id] && !C.fragmentos.includes(CP.FRAGMENTOS[tpl.id]) ? CP.FRAGMENTOS[tpl.id] : 'Mais um corvo pintado, mais um sino calado. Alguém anda a preparar alguma coisa em Valdemora.';
      C.fragmentos.push(frag); res.linhas.push('Fragmento da verdade: ' + frag);
      C.sombra = Math.max(0, C.sombra - 1);
      if (C.sucessos >= 3) { C.ato = 2; C.cena = 'ato2'; M.flags.negrume = true; res.linhas.push('Capítulo II: a Sombra de Varro revela-se.'); }
    } else { C.sombra = Math.min(10, C.sombra + 1); res.linhas.push('Enquanto tratas de outros assuntos, a Sombra cresce.'); }
  }
  function epilogo(st) {
    const F = st.mundo.flags, L = [];
    L.push(F.valdemora_livre && st.mundo.historico.length ? 'O Sino Negro calou-se e os mortos de Valdemora voltaram a dormir.' : '');
    L.push(F.cassio_poupado ? 'Cássio ficou com o Livro dos Sinos e passou o resto da vida a tocar sinos de festa em Corvamonte. Ninguém lhe chamou necromante outra vez.'
      : 'Do aprendiz Cássio só ficou um círculo de giz na cripta, que a chuva foi apagando.');
    L.push(F.brigida_salva ? 'Brígida voltou a caçar no Negrume. Diz a quem a quiser ouvir que foste tu que a desamarraste.' : '');
    L.push(F.reliquia_devolvida ? 'O relicário de Santa Ilda continua na capela, e há quem jure que brilhou na noite em que a torre se calou.' : 'O relicário de Santa Ilda nunca voltou. A capela parece mais escura sem ele.');
    L.push(F.mineiros_salvos ? 'Em Pedra-Funda, os mineiros que salvaste deram o teu nome à galeria nova.' : 'Pedra-Funda continua a contar os mineiros que a mina levou.');
    const rep = Object.values(st.mundo.rep).reduce((a, b) => a + b, 0);
    L.push(rep >= 4 ? 'Em todas as aldeias do vale há uma cadeira guardada para ti à lareira.' : rep >= 1 ? 'O vale lembra-se de ti com gratidão, ainda que nem todos saibam o teu nome.' : 'Poucos sabem o que fizeste. Talvez seja melhor assim.');
    return L.filter(Boolean);
  }

  /* ================= Movimento ================= */
  function caminho(st, destino) {
    // percurso por salas exploradas e sem criaturas vivas (exceto o destino)
    const d = st.exp.d, de = st.exp.sala;
    const prev = { [de]: null }, fila = [de];
    while (fila.length) {
      const id = fila.shift();
      if (id === destino) break;
      for (const e of d.arestas) {
        if ((e.a !== id && e.b !== id) || !e.conhecida || !passavel(e)) continue;
        const o = e.a === id ? e.b : e.a;
        if (prev[o] !== undefined) continue;
        const so = d.salas[o];
        if (o !== destino && (so.estado !== 'explorada' || vivos(so).length)) continue;
        prev[o] = id; fila.push(o);
      }
    }
    if (prev[destino] === undefined) return null;
    const p = []; for (let c = destino; c !== de; c = prev[c]) p.unshift(c);
    return p;
  }

  function podeMover(st) {
    const x = st.exp, s = sala(st);
    if (!x || x.combate || x.confronto) return false;
    const dorm = vivos(s).filter(m => !m.acordado);
    return !(dorm.length && !s.esgueirado);
  }

  function mover(st, ev, destino) {
    if (!podeMover(st)) { ev.push({ t: 'info', s: 'Agora não podes sair daqui.' }); return; }
    const p = caminho(st, destino);
    if (!p) { ev.push({ t: 'info', s: 'Não conheces um caminho livre até lá.' }); return; }
    for (let i = 0; i < p.length; i++) {
      const id = p[i];
      if (i < p.length - 1) { st.exp.prev = st.exp.sala; st.exp.sala = id; continue; } // salas já exploradas e vazias: passa direto
      entrar(st, ev, id);
      const x = st.exp;
      if (st.hero.pv <= 0 || x.combate || x.confronto) break;
    }
  }

  /* ================= Ações disponíveis ================= */
  function acoes(st) {
    const L = [];
    if (st.ecra !== 'expedicao' || !st.exp) return L;
    const x = st.exp, h = st.hero, s = sala(st), sol = solucoes(st);
    const rituais = h.classe === 'mistico' && x.rituais > 0;

    if (x.combate) {
      L.push({ tipo: 'combate', grupo: 'combate' });
      if (temItem(st, 'pocao') && h.pv < h.pvMax) L.push({ tipo: 'usar', item: 'pocao', rotulo: 'Beber poção', grupo: 'item' });
      if (temItem(st, 'oleo')) L.push({ tipo: 'usar', item: 'oleo', rotulo: 'Atirar óleo a arder', grupo: 'item' });
      sol.forEach(o => L.push({ tipo: 'solucao', id: o.id, rotulo: o.rotulo, grupo: 'combate' }));
      return L;
    }
    if (x.confronto) {
      sol.forEach(o => L.push({ tipo: 'solucao', id: o.id, rotulo: o.rotulo, grupo: 'sala' }));
      const c = vivos(s).find(m => m.chefe);
      L.push({ tipo: 'atacar_chefe', rotulo: `Atacar ${c.nome.split(',')[0]}`, grupo: 'combate' });
      if (x.prev !== null) L.push({ tipo: 'recuar', rotulo: 'Recuar em silêncio', grupo: 'mover', dir: direcao(s, x.d.salas[x.prev]) });
      return L;
    }
    const dorm = vivos(s).filter(m => !m.acordado);
    if (dorm.length && !s.esgueirado) {
      L.push({ tipo: 'surpresa', rotulo: `Atacar de surpresa`, grupo: 'combate' });
      L.push({ tipo: 'esgueirar', rotulo: 'Esgueirar-te (Agilidade)', grupo: 'sala' });
      if (x.prev !== null) L.push({ tipo: 'recuar', rotulo: 'Recuar', grupo: 'mover', dir: direcao(s, x.d.salas[x.prev]) });
      return L;
    }
    if (dorm.length) L.push({ tipo: 'surpresa', rotulo: 'Atacar de surpresa', grupo: 'combate' });
    if (!dorm.length && s.evento && !s.evento.feito) {
      const E = s.evento, D = CP.EVENTOS[E.id];
      D.op.forEach(([id, rot]) => {
        if (E.id === 'bau' && id === 'examinar' && (E.examinado || E.seguro)) return;
        L.push({ tipo: 'evento', op: id, rotulo: E.id === 'bau' && id === 'abrir' && E.seguro ? 'Abrir o baú' : rot, grupo: 'evento' });
      });
    }
    if (!dorm.length) {
      if (!s.investigada) L.push({ tipo: 'investigar', rotulo: 'Investigar (Astúcia)', grupo: 'sala' });
      if (rituais && !s.investigada) L.push({ tipo: 'ritual', r: 'luz', rotulo: `Ritual: Luz (${x.rituais})`, grupo: 'sala' });
      if (s.inscricao && !s.inscricao.lida) L.push({ tipo: 'ler', rotulo: h.classe === 'mistico' ? 'Ler a inscrição' : 'Ler a inscrição (Astúcia)', grupo: 'sala' });
      if (s.mec && !s.mec.resolvido) CP.SIMBOLOS.filter(sb => !(s.mec.tentados || []).includes(sb)).forEach(sb => L.push({ tipo: 'mecanismo', simbolo: sb, rotulo: `Premir o ${sb}`, grupo: 'sala' }));
      s.itens.forEach((it, i) => L.push({ tipo: 'apanhar', i, rotulo: `Apanhar: ${CP.ITENS[it].nome}`, grupo: 'sala',
        off: h.mochila.length >= capMochila(st), motivo: 'Mochila cheia' }));
      if (!s.descansou && h.pv < h.pvMax) L.push({ tipo: 'descansar', rotulo: 'Descansar (+PV e +1 fôlego, faz barulho)', grupo: 'sala' });
      if (rituais && h.pv < h.pvMax) L.push({ tipo: 'ritual', r: 'cura', rotulo: `Ritual: Cura (${x.rituais})`, grupo: 'sala' });
      if (x.folego < 6 && !s.descansou && h.pv >= h.pvMax) { /* descansar também devolve fôlego */ L.push({ tipo: 'descansar', rotulo: 'Descansar (+1 fôlego, faz barulho)', grupo: 'sala' }); }
    }
    for (const { e, o, dir } of saidas(st)) {
      const n = `${dir} · ${nomeSala(o)}`;
      if (e.tipo === 'trancada' && !e.aberta) {
        L.push({ tipo: 'arrombar', e: e.id, dir, nova: o.estado !== 'explorada', rotulo: `Arrombar porta a ${n} (Força)`, grupo: 'mover' });
        if (h.classe === 'ladrao' || temItem(st, 'gazua')) L.push({ tipo: 'fechadura', e: e.id, dir, nova: o.estado !== 'explorada', rotulo: `Abrir fechadura a ${n} (Agilidade)`, grupo: 'mover' });
      } else if (passavel(e)) {
        L.push({ tipo: 'mover', alvo: o.id, dir, nova: o.estado !== 'explorada', porta: e.tipo, rotulo: `${o.estado === 'explorada' ? 'Voltar' : 'Seguir'} para ${n}`, grupo: 'mover' });
      }
    }
    if (x.objetivo) L.push({ tipo: 'regressar', rotulo: 'Regressar à aldeia', grupo: 'fim' });
    else if (s.id === x.d.inicio) L.push({ tipo: 'sair', rotulo: 'Sair da masmorra (retirada)', grupo: 'fim' });
    return L;
  }

  function solucoes(st) {
    const x = st.exp, s = sala(st);
    if (x.objetivo || !s.chefe || !vivos(s).some(m => m.chefe)) return [];
    return varDe(missao(st)).solucoes.filter(o => !o.requer || temItem(st, o.requer));
  }

  /* ================= Executar ação ================= */
  function act(st0, a) {
    const st = clone(st0), ev = [], h = st.hero;
    const x = st.exp;
    switch (a.tipo) {
      /* ---- aldeia ---- */
      case 'partir': {
        const m = st.mundo.missoes.find(o => o.id === a.mid);
        const tpl = tplDe(m);
        const primeira = !m.masmorra;
        if (h.companheiro === 'bras') {
          if (h.ouro >= 15) { h.ouro -= 15; ev.push({ t: 'info', s: 'Pagas 15 moedas ao Brás.' }); }
          else { h.companheiro = null; ev.push({ t: 'mau', s: 'Não tens com que pagar ao Brás. Partes sozinho.' }); }
        }
        const d = m.masmorra || Gen().expedicao(m);
        m.masmorra = null; m.estado = 'em_curso';
        st.exp = { mid: m.id, d, sala: d.inicio, prev: null, perigo: 0, combate: null, confronto: false,
          pistas: m.pistas || [], objetivo: !!m.objetivo, resolucao: m.resolucao || null, rituais: (CP.CLASSES[h.classe].rituais || 0) + (temT(st, 'fe') ? 1 : 0),
          folego: 3 + (temR(st, 'amuleto') ? 1 : 0) + (temT(st, 'folego_longo') ? 1 : 0) + ((st.mundo.melhorias.templo || 0) >= 1 ? 1 : 0), fraquezas: {},
          novas: 0, xp: 0, ouro: 0, registo: [] };
        st.ecra = 'expedicao';
        if ((st.mundo.melhorias.estalagem || 0) >= 2 && h.mochila.length < capMochila(st)) { h.mochila.push('pocao'); ev.push({ t: 'info', s: 'O estalajadeiro meteu-te uma poção na mochila.' }); }
        const C = st.mundo.campanha;
        st.exp.perigo = Math.min(4, Math.floor((C ? C.sombra : 0) / 3));
        ev.push({ t: 'titulo', s: m.titulo });
        ev.push({ t: 'n', s: primeira ? tpl.intro(m.vars) : 'Regressas à entrada da masmorra.' });
        if (h.companheiro) ev.push({ t: 'info', s: `${CP.COMPANHEIROS[h.companheiro].nome} vai contigo.` });
        if (tpl.id === 'torre' && primeira) {
          const F = st.mundo.flags, chefe = d.salas[d.objetivo].monstros.find(o => o.chefe);
          if (F.mineiros_salvos) { d.salas.forEach(o => { if (o.estado === 'desconhecida' && !o.oculta) o.estado = 'descoberta'; }); d.arestas.forEach(e => { if (e.tipo !== 'secreta') e.conhecida = true; }); ev.push({ t: 'ok', s: 'Os mineiros de Pedra-Funda escavaram-te um túnel e desenharam-te a planta da torre.', fx: 'reveal' }); }
          if (F.cassio_poupado && chefe) { chefe.pv -= 4; ev.push({ t: 'ok', s: 'Cássio subiu à torre antes de ti e partiu metade dos selos do mestre. Varro está mais fraco.', fx: 'reveal' }); }
          if (F.reliquia_devolvida) ev.push({ t: 'ok', s: 'Levas a bênção de Santa Ilda: os feitiços de Varro vão doer menos.' });
        }
        ev.push({ t: 'info', s: 'Objetivo: ' + tpl.objetivo });
        entrar(st, ev, d.inicio);
        break;
      }
      case 'descansar_aldeia':
        if ((st.mundo.melhorias.estalagem || 0) >= 1 || h.ouro >= 2) { if (!((st.mundo.melhorias.estalagem || 0) >= 1)) h.ouro -= 2; h.pv = h.pvMax; ev.push({ t: 'ok', s: 'Dormes na estalagem. Recuperas toda a vida.' }); }
        break;
      case 'comprar': {
        const it = CP.ITENS[a.item], p = precoLoja(st, a.item);
        if (h.ouro < p) break;
        if (it.tipo === 'arma') h.arma = a.item;
        else if (it.tipo === 'armadura') h.armadura = a.item;
        else if (it.tipo === 'escudo') h.escudo = a.item;
        else if (h.mochila.length < capMochila(st)) h.mochila.push(a.item); else break;
        h.ouro -= p; ev.push({ t: 'ok', s: `Compraste: ${it.nome}.` });
        break;
      }
      case 'vender': {
        const id = h.mochila[a.i], it = CP.ITENS[id];
        const val = it.valor || Math.floor((it.preco || 0) / 2);
        h.mochila.splice(a.i, 1); h.ouro += val;
        ev.push({ t: 'ok', s: `Vendeste ${it.nome} por ${val} moedas.` });
        break;
      }
      case 'nivel':
        if (h.niveisPend > 0 && h.attrs[a.attr] < 4) {
          h.attrs[a.attr]++; h.pvMax += 2; h.pv += 2; h.niveisPend--;
          ev.push({ t: 'ok', s: `${CP.ATRIB[a.attr]} passa a d${ladosDe(h.attrs[a.attr])}. Vida máxima +2.`, fx: 'heal' });
        }
        break;
      case 'abandonar': {
        const m = st.mundo.missoes.find(o => o.id === a.mid), tpl = tplDe(m);
        st.mundo.missoes = st.mundo.missoes.filter(o => o.id !== a.mid);
        st.mundo.rep[tpl.local] = Math.max(-3, (st.mundo.rep[tpl.local] || 0) - 1);
        if (st.mundo.campanha) st.mundo.campanha.sombra = Math.min(10, st.mundo.campanha.sombra + 1);
        geraMissoes(st);
        ev.push({ t: 'mau', s: `Desististe de ${m.titulo}. A tua reputação em ${CP.LOCAIS[tpl.local].nome} desce.` });
        break;
      }
      case 'voltar': st.resumo = null; st.ecra = 'aldeia'; break;
      case 'desistir': {
        if (!st.exp) break;
        const m = missao(st), tpl = tplDe(m);
        st.mundo.missoes = st.mundo.missoes.filter(o => o.id !== m.id);
        st.mundo.rep[tpl.local] = Math.max(-3, (st.mundo.rep[tpl.local] || 0) - 1);
        h.mochila = h.mochila.filter(i => CP.ITENS[i].tipo !== 'missao' || CP.ITENS[i].valor);
        st.exp = null; st.ecra = 'aldeia';
        geraMissoes(st);
        ev.push({ t: 'mau', s: `Desististe de ${m.titulo} e voltaste à aldeia. Guardas o que encontraste, mas a tua reputação em ${CP.LOCAIS[tpl.local].nome} desce.` });
        break;
      }

      /* ---- expedição ---- */
      case 'mover': mover(st, ev, a.alvo); break;
      case 'recuar': {
        const p = x.prev; x.confronto = false;
        const s = sala(st); if (s.chefe) vivos(s).forEach(m => { if (m.chefe) m.acordado = false; });
        if (p !== null) entrar(st, ev, p);
        break;
      }
      case 'atacar_chefe': iniciarCombate(st, ev, false); ev.push({ t: 'mau', s: 'O combate começa.' }); break;
      case 'surpresa': ev.push({ t: 'ok', s: 'Apanhas a criatura desprevenida! Na primeira ronda não reage.' }); iniciarCombate(st, ev, true); break;
      case 'ronda': ronda(st, ev, a.at || {}); break;
      case 'relancar': {
        const c = x && x.combate, d = c && c.dados[a.i]; if (!d || d.perdido) break;
        if (c.relancesGratis > 0) c.relancesGratis--; else if (x.folego > 0) x.folego--; else break;
        const { r, fim } = rnd(st); d.v = r.int(1, d.lados); fim();
        ev.push({ t: 'info', s: `Relanças ${d.comp ? CP.COMPANHEIROS[d.comp].nome.split(',')[0] : CP.ATRIB[d.attr]}: ${d.v}.`, fx: 'dice' });
        break;
      }
      case 'evento': resolverEvento(st, ev, a.op); break;
      case 'companheiro': {
        const Cp = a.id && CP.COMPANHEIROS[a.id];
        if (a.id && (!Cp || (Cp.requer && !st.mundo.flags[Cp.requer]))) break;
        h.companheiro = a.id || null;
        ev.push({ t: 'ok', s: a.id ? `${Cp.nome} junta-se a ti.` : 'Partes sozinho na próxima expedição.' });
        break;
      }
      case 'curar_ferimento': {
        const i = h.ferimentos.indexOf(a.id); if (i < 0 || h.ouro < 10) break;
        h.ouro -= 10; h.ferimentos.splice(i, 1); if (CP.FERIMENTOS[a.id].pv) { h.pvMax += CP.FERIMENTOS[a.id].pv; }
        ev.push({ t: 'ok', s: `Os irmãos da capela trataram-te: ${CP.FERIMENTOS[a.id].nome} curado.`, fx: 'heal', n: 0 });
        break;
      }
      case 'cena_vista': if (st.mundo.campanha) { st.mundo.campanha.cena = null; geraMissoes(st); } break;
      case 'talento': {
        if (h.niveisPend <= 0 || h.talentos.includes(a.id) || !talentosOferta(st).includes(a.id)) break;
        h.talentos.push(a.id); h.niveisPend--;
        if (a.id === 'pele_dura') { h.pvMax += 3; h.pv += 3; }
        ev.push({ t: 'ok', s: `Novo talento: ${CP.TALENTOS[a.id].nome}.`, fx: 'reveal' });
        break;
      }
      case 'melhorar': {
        const M = st.mundo.melhorias, n = M[a.id] || 0, def = CP.MELHORIAS[a.id], niv = def && def.niveis[n];
        if (!niv || h.ouro < niv.custo) break;
        h.ouro -= niv.custo; M[a.id] = n + 1;
        ev.push({ t: 'ok', s: `${def.nome} melhorado: ${niv.desc}`, fx: 'coin', n: 0 });
        break;
      }
      case 'comprar_reliquia': {
        const id = reliquiaLoja(st); if (!id || h.ouro < 40) break;
        h.ouro -= 40; h.reliquias.push(id); if (id === 'coracao') { h.pvMax += 3; h.pv += 3; }
        st.mundo.reliquiaVendida = st.mundo.cont;
        ev.push({ t: 'ok', s: `Compraste: ${CP.RELIQUIAS[id].nome}.`, fx: 'reveal' });
        break;
      }
      case 'esgueirar': {
        const r = teste(st, ev, { attr: 'agilidade', bonus: temR(st, 'botas') ? 2 : 0, vant: h.classe === 'ladrao', rotulo: 'Furtividade (Agilidade)' });
        if (r.ok) { sala(st).esgueirado = true; ev.push({ t: 'ok', s: 'Passas nas sombras sem acordar ninguém.' }); }
        else { ev.push({ t: 'mau', s: 'Uma pedra rola sob o teu pé. A criatura acorda!' }); acordarTodos(st); iniciarCombate(st, ev, false); }
        break;
      }
      case 'ritual': {
        x.rituais--;
        if (a.r === 'cura') {
          const c = Math.min(3, h.pvMax - h.pv); h.pv += c; ev.push({ t: 'ok', s: `Ritual de Cura: recuperas ${c} PV.`, fx: 'heal', n: c });
        } else if (a.r === 'luz') {
          ev.push({ t: 'ok', s: 'Ritual de Luz: uma claridade fria revela tudo o que está escondido.', fx: 'reveal' });
          sala(st).investigada = true; revelarEscondido(st, ev);
        }
        break;
      }
      case 'usar': {
        const i = h.mochila.indexOf(a.item); if (i < 0) break;
        if (a.item === 'pocao') {
          h.mochila.splice(i, 1); const c = Math.min(4 + (temT(st, 'maos_rapidas') ? 2 : 0), h.pvMax - h.pv); h.pv += c;
          ev.push({ t: 'ok', s: `Bebes a poção: +${c} PV.`, fx: 'heal', n: c });
        } else if (a.item === 'oleo' && x && x.combate) {
          h.mochila.splice(i, 1);
          const m = alvo(st), fera = perfil(m).fam === 'fera';
          ev.push({ t: 'info', s: fera ? 'Partes o frasco. As feras temem o fogo!' : 'Partes o frasco e as chamas sobem.', fx: 'fire' });
          ferir(st, ev, m, fera ? 4 : 2);
          verificarFim(st, ev);
        }
        break;
      }
      case 'largar': {
        const id = h.mochila.splice(a.i, 1)[0];
        if (x) { sala(st).itens.push(id); ev.push({ t: 'info', s: `Deixas ${CP.ITENS[id].nome} no chão.` }); }
        else ev.push({ t: 'info', s: `Deitaste fora: ${CP.ITENS[id].nome}.` });
        break;
      }
      case 'apanhar': {
        const s = sala(st);
        if (h.mochila.length >= capMochila(st)) break;
        const id = s.itens.splice(a.i, 1)[0];
        h.mochila.push(id); ev.push({ t: 'ok', s: `Guardas ${CP.ITENS[id].nome} na mochila.`, fx: 'pick' });
        break;
      }
      case 'investigar': {
        const s = sala(st); s.investigada = true;
        const r = teste(st, ev, { attr: 'astucia', vant: h.classe === 'explorador' || temT(st, 'olho_atento') || h.companheiro === 'tome', rotulo: 'Investigar (Astúcia)' });
        if (r.ok) revelarEscondido(st, ev);
        else { ev.push({ t: 'mau', s: 'Procuras às apalpadelas e perdes tempo.' }); perigo(st, ev, 1); }
        break;
      }
      case 'ler': {
        const s = sala(st), ins = s.inscricao; ins.lida = true;
        let ok = h.classe === 'mistico';
        if (!ok) ok = teste(st, ev, { attr: 'astucia', rotulo: 'Decifrar (Astúcia)' }).ok;
        if (ok) { ev.push({ t: ins.simbolo ? 'pista' : 'n', s: ins.txt }); if (ins.simbolo) { x.pistas.push(ins.txt); ganharXp(st, 1); } }
        else ev.push({ t: 'mau', s: 'As letras estão demasiado gastas para as decifrares.' });
        break;
      }
      case 'mecanismo': {
        const s = sala(st), mec = s.mec;
        if (a.simbolo === mec.simbolo) {
          mec.resolvido = true;
          const e = x.d.arestas[mec.aresta]; e.aberta = true; e.encontrada = true; e.conhecida = true;
          const o = x.d.salas[e.a === s.id ? e.b : e.a]; if (o.estado === 'desconhecida') o.estado = 'descoberta';
          ev.push({ t: 'ok', s: `O ${a.simbolo} afunda-se com um estalido. Uma parede desliza e abre uma passagem.`, fx: 'door' });
          ganharXp(st, 1);
          ev.push({ t: 'info', s: textoSaidas(st) });
        } else {
          (mec.tentados = mec.tentados || []).push(a.simbolo);
          ev.push({ t: 'mau', s: `O ${a.simbolo} afunda-se… e saltam agulhas da parede. O símbolo fica preso.` });
          const r = teste(st, ev, { attr: 'agilidade', vant: h.classe === 'ladrao', rotulo: 'Reflexos (Agilidade)' });
          if (!r.ok) dano(st, ev, 1, 'Agulhas');
          perigo(st, ev, 1);
        }
        break;
      }
      case 'descansar': {
        const s = sala(st); s.descansou = true;
        const c = Math.min(2 + (temR(st, 'calice') ? 2 : 0) + (temT(st, 'sobrevivente') ? 2 : 0), h.pvMax - h.pv); h.pv += c;
        x.folego = Math.min(6, x.folego + 1);
        ev.push({ t: 'ok', s: `Descansas um pouco: +${c} PV e +1 de fôlego.`, fx: 'heal', n: c });
        perigo(st, ev, temT(st, 'sobrevivente') ? 1 : 2);
        break;
      }
      case 'arrombar': {
        const e = x.d.arestas[a.e];
        const r = teste(st, ev, { attr: 'forca', rotulo: 'Arrombar (Força)' });
        if (r.ok) { e.aberta = true; ev.push({ t: 'ok', s: 'A porta cede com estrondo.', fx: 'door' }); }
        else ev.push({ t: 'mau', s: 'A porta aguenta. O barulho ecoa pelos corredores.', fx: 'thud' });
        perigo(st, ev, 1);
        break;
      }
      case 'fechadura': {
        const e = x.d.arestas[a.e];
        const r = teste(st, ev, { attr: 'agilidade', vant: h.classe === 'ladrao', rotulo: 'Fechadura (Agilidade)' });
        if (r.ok) { e.aberta = true; ev.push({ t: 'ok', s: 'Clique. A fechadura cede.', fx: 'door' }); }
        else { ev.push({ t: 'mau', s: 'As gazuas raspam sem resultado.' }); perigo(st, ev, 1); }
        break;
      }
      case 'solucao': {
        const o = solucoes(st).find(o => o.id === a.id);
        if (o) objetivoCumprido(st, ev, o);
        break;
      }
      case 'regressar': fimExpedicao(st, ev, 'sucesso'); break;
      case 'sair': fimExpedicao(st, ev, 'retirada'); break;
    }
    // derrota
    if (st.exp && st.hero.pv <= 0) {
      ev.push({ t: 'mau', s: 'Tudo fica escuro…', fx: 'lose' });
      fimExpedicao(st, ev, 'derrota');
    }
    // registo da expedição
    if (st.exp) {
      st.exp.registo.push(...ev.filter(e => e.t !== 'd').map(e => ({ t: e.t, s: e.s })));
      if (st.exp.registo.length > 300) st.exp.registo.splice(0, st.exp.registo.length - 300);
    }
    return { st, ev };
  }

  function revelarEscondido(st, ev) {
    const s = sala(st), x = st.exp;
    if (!s.escondido.length) { ev.push({ t: 'info', s: 'Procuras com cuidado. Não há nada escondido aqui.' }); return; }
    for (const e of s.escondido) {
      if (e.k === 'tesouro') { s.itens.push(e.item); ev.push({ t: 'ok', s: `Encontras um esconderijo: ${CP.ITENS[e.item].nome}.`, fx: 'reveal' }); }
      else if (e.k === 'ouro') { st.hero.ouro += e.n; x.ouro += e.n; ev.push({ t: 'ok', s: `Encontras ${e.n} moedas escondidas.`, fx: 'coin', n: e.n }); }
      else if (e.k === 'secreta') {
        const a = x.d.arestas[e.e];
        if (a.encontrada) continue;
        a.encontrada = true; a.conhecida = true;
        const o = x.d.salas[a.a === s.id ? a.b : a.a]; if (o.estado === 'desconhecida') o.estado = 'descoberta';
        ev.push({ t: 'ok', s: `Encontras uma passagem secreta para ${nomeSala(o)}.`, fx: 'reveal' });
        // a outra ponta também fica descoberta
        x.d.salas[o.id].escondido = x.d.salas[o.id].escondido.filter(h => h.e !== e.e);
      }
      ganharXp(st, 1);
    }
    s.escondido = [];
  }

  /* ================= Informação para a interface ================= */
  function info(st) {
    if (!st.exp) return null;
    const m = missao(st), tpl = tplDe(m);
    return { titulo: m.titulo, objetivo: tpl.objetivo, emCombate: !!st.exp.combate, inimigo: st.exp.combate ? alvo(st) : null };
  }
  function ecosAldeia(st, local) {
    const L = CP.LOCAIS[local];
    return Object.keys(L.ecos).filter(f => st.mundo.flags[f]).map(f => L.ecos[f]);
  }

  CP.Engine = { attrEf, slotsCombate, previsao, textoIntencao, conhecerFraqueza, perfil, capMochila, talentosOferta, reliquiaLoja, inimigos, alvo, ataca, ladosDe, novaCampanha, acoes, act, info, xpProx, precoLoja, stockLoja, ecosAldeia, nomeSala, podeMover, tplDe, passavel };
})(typeof window !== 'undefined' ? window : globalThis);
