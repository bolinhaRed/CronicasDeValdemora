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

  // Teste base: lança o dado do atributo (d4 a d12) e soma o bónus do equipamento.
  // Precisa de 4 ou mais, mais a dificuldade. Com vantagem lança dois e fica o melhor. Um 1 natural falha sempre.
  function teste(st, ev, o) {
    const lados = ladosDe(o.attr ? st.hero.attrs[o.attr] : 0), bonus = o.bonus || 0;
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
        xp: 0, nivel: 1, niveisPend: 0, arma: c.arma, armadura: c.armadura, escudo: null, mochila: clone(c.mochila) },
      mundo: { rep: { corvamonte: 0, pedrafunda: 0 }, flags: {}, missoes: [], historico: [], cont: 0,
        wrng: CP.RNG.estadoDe(semente + '|mundo'), noticias: [] },
      exp: null, resumo: null
    };
    geraMissoes(st);
    return st;
  }

  function wr(st) { return CP.RNG.fromState(st.mundo.wrng); }

  // Mantém três missões no quadro, preferindo modelos diferentes
  function geraMissoes(st) {
    const M = st.mundo;
    const elegiveis = CP.MISSOES.filter(t => !t.requer || M.flags[t.requer]);
    let guarda = 0;
    const tamanho = Math.min(3, elegiveis.length);
    while (M.missoes.filter(m => m.estado !== 'concluida').length < tamanho && guarda++ < 20) {
      const r = wr(st);
      const contagem = t => M.missoes.filter(m => m.tpl === t.id).length;
      const menor = Math.min(...elegiveis.map(contagem));
      const tpl = r.pick(elegiveis.filter(t => contagem(t) === menor));
      const usados = M.missoes.filter(m => m.tpl === tpl.id).map(m => m.vars.nome).concat(M.historico.slice(-6).map(h => h.nome));
      const nome = r.pick(tpl.nomes.filter(n => !usados.includes(n)).concat(usados.length >= tpl.nomes.length ? tpl.nomes : []));
      const m = { id: 'm' + (++M.cont), tpl: tpl.id, var: r.int(0, tpl.variantes.length - 1),
        seed: st.semente + '|missao|' + M.cont + '|' + r.int(0, 1e9), vars: { nome }, estado: 'disponivel', masmorra: null };
      m.titulo = tpl.titulo(m.vars);
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
    return st.mundo.rep.corvamonte >= 2 ? Math.ceil(p * 0.8) : p;
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
      if (s.oculta) ganharXp(st, 2);
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
      if (st.hero.classe === 'explorador') {
        ev.push({ t: 'ok', s: `Reparas numa armadilha (${A.nome}) e contorna-la.` }); ganharXp(st, 1);
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
      ev.push({ t: 'mau', s: s.esgueirado ? `${v[0].nome} continua a dormir.` : `${v[0].nome} dorme encostado à parede. Ainda não te viu.` });
    }

    revelarSaidas(st, s);
    const ts = textoSaidas(st); if (ts) ev.push({ t: 'info', s: ts });
    if (nova && x.novas % 3 === 0 && !x.combate) perigo(st, ev, 1);
  }

  /* ================= Combate ================= */
  function iniciarCombate(st, ev, surpresa) {
    const x = st.exp;
    if (!x.combate) { x.combate = { surpresa, furia: false }; perigo(st, ev, 1); }
  }
  function alvo(st) {
    return vivos(sala(st)).find(m => m.acordado) || (st.exp.combate && st.exp.combate.surpresa ? vivos(sala(st))[0] : null);
  }
  function ferir(st, ev, m, n) {
    m.pv -= n;
    ev.push({ t: 'ok', s: `Acertas em ${m.nome}: ${n} de dano.`, fx: 'hit', n, alvo: m.tipo });
    if (m.pv <= 0) {
      m.pv = 0;
      ev.push({ t: 'ok', s: `${m.nome} cai.`, fx: 'kill' });
      ganharXp(st, m.chefe ? 3 : 1);
      if (m.chefe) objetivoCumprido(st, ev, null);
    }
  }
  function verificarFim(st, ev) {
    if (!st.exp.combate) return true;
    if (!vivos(sala(st)).some(m => m.acordado)) {
      st.exp.combate = null;
      ev.push({ t: 'info', s: 'O combate terminou.' });
      return true;
    }
    return false;
  }
  function contraAtaque(st, ev) {
    const h = st.hero;
    const def = (h.armadura ? CP.ITENS[h.armadura].def : 0) + (h.escudo ? CP.ITENS[h.escudo].def : 0);
    for (const m of vivos(sala(st)).filter(m => m.acordado)) {
      if (m.chefe && st.exp.confronto) continue;
      const r = teste(st, ev, { attr: 'agilidade', bonus: def, dif: m.atk, rotulo: `Defesa contra ${m.nome}` });
      if (r.ok) ev.push({ t: 'ok', s: `Desvias o golpe de ${m.nome}.`, fx: 'block' });
      else dano(st, ev, m.dano, m.nome);
      if (h.pv <= 0) return;
    }
  }
  function acordarTodos(st) { vivos(sala(st)).forEach(m => { if (!(m.chefe && st.exp.confronto)) m.acordado = true; }); }

  function atacar(st, ev) {
    const x = st.exp, h = st.hero, m = alvo(st);
    if (!m) return;
    const w = CP.ITENS[h.arma];
    const surpresa = x.combate.surpresa;
    let r = teste(st, ev, { attr: w.attr, bonus: w.atk, dif: m.def, vant: surpresa, rotulo: `Ataque (${CP.ATRIB[w.attr]})` });
    if (!r.ok && h.classe === 'guerreiro' && !x.combate.furia) {
      x.combate.furia = true;
      ev.push({ t: 'info', s: 'Fúria! Repetes o ataque.' });
      r = teste(st, ev, { attr: w.attr, bonus: w.atk, dif: m.def, rotulo: 'Ataque com fúria' });
    }
    acordarTodos(st);
    x.combate.surpresa = false;
    if (r.ok) {
      let n = w.dano + (r.max ? 1 : 0);
      if (surpresa && h.classe === 'ladrao') { n *= 2; ev.push({ t: 'info', s: 'Ataque furtivo: dano a dobrar.' }); }
      ferir(st, ev, m, n);
    } else ev.push({ t: 'mau', s: 'Falhas o golpe.', fx: 'miss' });
    if (!verificarFim(st, ev) && !surpresa) contraAtaque(st, ev);
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
      const rep = M.rep[tpl.local] || 0;
      const ouro = tpl.recompensa + Math.max(0, rep) * 2;
      h.ouro += ouro; res.ouro += ouro;
      M.rep[tpl.local] = Math.max(-3, Math.min(3, rep + x.resolucao.rep));
      if (x.resolucao.flag) M.flags[x.resolucao.flag] = true;
      ganharXp(st, 5); res.xp = x.xp;
      res.linhas.push(x.resolucao.txt);
      res.linhas.push(`${tpl.cliente} pagam-te ${ouro} moedas.`.replace('O capataz Gonçalo pagam', 'O capataz Gonçalo paga').replace('Frei Anselmo pagam', 'Frei Anselmo paga'));
      res.linhas.push(`Reputação em ${CP.LOCAIS[tpl.local].nome}: ${M.rep[tpl.local] > 0 ? '+' : ''}${M.rep[tpl.local]}.`);
      if (!M.flags.pedrafunda) { M.flags.pedrafunda = true; res.linhas.push('Na taberna fala-se de mineiros desaparecidos em Pedra-Funda. Há trabalho por lá.'); }
      m.estado = 'concluida';
      M.historico.push({ titulo: m.titulo, nome: m.vars.nome, via: x.resolucao.via, flag: x.resolucao.flag });
      M.missoes = M.missoes.filter(o => o.id !== m.id);
      // objetos de missão ficam com o cliente (exceto os que se podem vender)
      h.mochila = h.mochila.filter(i => CP.ITENS[i].tipo !== 'missao' || CP.ITENS[i].valor);
      geraMissoes(st);
    } else {
      m.estado = 'em_curso';
      m.masmorra = x.d; m.pistas = x.pistas; m.objetivo = x.objetivo;
      if (tipo === 'derrota') {
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
    if (h.niveisPend) res.linhas.push(`Subiste ao nível ${h.nivel}! Escolhe a melhoria na aldeia.`);
    st.resumo = res; st.exp = null; st.ecra = 'resumo';
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
      const m = alvo(st);
      L.push({ tipo: 'atacar', rotulo: `Atacar ${m ? m.nome : ''}`, grupo: 'combate' });
      if (rituais && m && m.morto) L.push({ tipo: 'ritual', r: 'banir', rotulo: `Ritual: Banir (${x.rituais})`, grupo: 'combate' });
      if (rituais && h.pv < h.pvMax) L.push({ tipo: 'ritual', r: 'cura', rotulo: `Ritual: Cura (${x.rituais})`, grupo: 'combate' });
      if (temItem(st, 'pocao') && h.pv < h.pvMax) L.push({ tipo: 'usar', item: 'pocao', rotulo: 'Beber poção', grupo: 'combate' });
      if (temItem(st, 'oleo')) L.push({ tipo: 'usar', item: 'oleo', rotulo: 'Atirar óleo a arder', grupo: 'combate' });
      sol.forEach(o => L.push({ tipo: 'solucao', id: o.id, rotulo: o.rotulo, grupo: 'combate' }));
      L.push({ tipo: 'fugir', rotulo: 'Fugir (Agilidade)', grupo: 'combate' });
      return L;
    }
    if (x.confronto) {
      sol.forEach(o => L.push({ tipo: 'solucao', id: o.id, rotulo: o.rotulo, grupo: 'sala' }));
      const c = vivos(s).find(m => m.chefe);
      L.push({ tipo: 'atacar_chefe', rotulo: `Atacar ${c.nome.split(',')[0]}`, grupo: 'combate' });
      if (x.prev !== null) L.push({ tipo: 'recuar', rotulo: 'Recuar em silêncio', grupo: 'mover' });
      return L;
    }
    const dorm = vivos(s).filter(m => !m.acordado);
    if (dorm.length && !s.esgueirado) {
      L.push({ tipo: 'surpresa', rotulo: `Atacar de surpresa`, grupo: 'combate' });
      L.push({ tipo: 'esgueirar', rotulo: 'Esgueirar-te (Agilidade)', grupo: 'sala' });
      if (x.prev !== null) L.push({ tipo: 'recuar', rotulo: 'Recuar', grupo: 'mover' });
      return L;
    }
    if (dorm.length) L.push({ tipo: 'surpresa', rotulo: 'Atacar de surpresa', grupo: 'combate' });
    if (!dorm.length) {
      if (!s.investigada) L.push({ tipo: 'investigar', rotulo: 'Investigar (Astúcia)', grupo: 'sala' });
      if (rituais && !s.investigada) L.push({ tipo: 'ritual', r: 'luz', rotulo: `Ritual: Luz (${x.rituais})`, grupo: 'sala' });
      if (s.inscricao && !s.inscricao.lida) L.push({ tipo: 'ler', rotulo: h.classe === 'mistico' ? 'Ler a inscrição' : 'Ler a inscrição (Astúcia)', grupo: 'sala' });
      if (s.mec && !s.mec.resolvido) CP.SIMBOLOS.filter(sb => !(s.mec.tentados || []).includes(sb)).forEach(sb => L.push({ tipo: 'mecanismo', simbolo: sb, rotulo: `Premir o ${sb}`, grupo: 'sala' }));
      s.itens.forEach((it, i) => L.push({ tipo: 'apanhar', i, rotulo: `Apanhar: ${CP.ITENS[it].nome}`, grupo: 'sala',
        off: h.mochila.length >= CP.MOCHILA, motivo: 'Mochila cheia' }));
      if (!s.descansou && h.pv < h.pvMax) L.push({ tipo: 'descansar', rotulo: 'Descansar (+2 PV, faz barulho)', grupo: 'sala' });
      if (rituais && h.pv < h.pvMax) L.push({ tipo: 'ritual', r: 'cura', rotulo: `Ritual: Cura (${x.rituais})`, grupo: 'sala' });
    }
    for (const { e, o, dir } of saidas(st)) {
      const n = `${dir} · ${nomeSala(o)}`;
      if (e.tipo === 'trancada' && !e.aberta) {
        L.push({ tipo: 'arrombar', e: e.id, rotulo: `Arrombar porta a ${n} (Força)`, grupo: 'mover' });
        if (h.classe === 'ladrao' || temItem(st, 'gazua')) L.push({ tipo: 'fechadura', e: e.id, rotulo: `Abrir fechadura a ${n} (Agilidade)`, grupo: 'mover' });
      } else if (passavel(e)) {
        L.push({ tipo: 'mover', alvo: o.id, rotulo: `${o.estado === 'explorada' ? 'Voltar' : 'Seguir'} para ${n}`, grupo: 'mover' });
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
        const d = m.masmorra || Gen().expedicao(m);
        m.masmorra = null; m.estado = 'em_curso';
        st.exp = { mid: m.id, d, sala: d.inicio, prev: null, perigo: 0, combate: null, confronto: false,
          pistas: m.pistas || [], objetivo: !!m.objetivo, rituais: CP.CLASSES[h.classe].rituais || 0,
          novas: 0, xp: 0, ouro: 0, registo: [] };
        st.ecra = 'expedicao';
        ev.push({ t: 'titulo', s: m.titulo });
        ev.push({ t: 'n', s: primeira ? tpl.intro(m.vars) : 'Regressas à entrada da masmorra.' });
        ev.push({ t: 'info', s: 'Objetivo: ' + tpl.objetivo });
        entrar(st, ev, d.inicio);
        break;
      }
      case 'descansar_aldeia':
        if (h.ouro >= 2) { h.ouro -= 2; h.pv = h.pvMax; ev.push({ t: 'ok', s: 'Dormes na estalagem. Recuperas toda a vida.' }); }
        break;
      case 'comprar': {
        const it = CP.ITENS[a.item], p = precoLoja(st, a.item);
        if (h.ouro < p) break;
        if (it.tipo === 'arma') h.arma = a.item;
        else if (it.tipo === 'armadura') h.armadura = a.item;
        else if (it.tipo === 'escudo') h.escudo = a.item;
        else if (h.mochila.length < CP.MOCHILA) h.mochila.push(a.item); else break;
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
      case 'atacar': atacar(st, ev); break;
      case 'atacar_chefe': {
        x.confronto = false;
        vivos(sala(st)).forEach(m => { m.acordado = true; });
        iniciarCombate(st, ev, false);
        ev.push({ t: 'mau', s: 'O combate começa.' });
        atacar(st, ev);
        break;
      }
      case 'surpresa': iniciarCombate(st, ev, true); x.combate.surpresa = true; atacar(st, ev); break;
      case 'esgueirar': {
        const r = teste(st, ev, { attr: 'agilidade', vant: h.classe === 'ladrao', rotulo: 'Furtividade (Agilidade)' });
        if (r.ok) { sala(st).esgueirado = true; ev.push({ t: 'ok', s: 'Passas nas sombras sem acordar ninguém.' }); }
        else { ev.push({ t: 'mau', s: 'Uma pedra rola sob o teu pé. A criatura acorda!' }); acordarTodos(st); iniciarCombate(st, ev, false); }
        break;
      }
      case 'fugir': {
        const r = teste(st, ev, { attr: 'agilidade', vant: h.classe === 'ladrao', rotulo: 'Fuga (Agilidade)' });
        if (r.ok) {
          x.combate = null;
          ev.push({ t: 'ok', s: 'Foges pelo caminho por onde vieste.' });
          if (x.sala === x.d.inicio || x.prev === null) fimExpedicao(st, ev, 'retirada');
          else entrar(st, ev, x.prev);
        } else { ev.push({ t: 'mau', s: 'Não consegues fugir.' }); contraAtaque(st, ev); }
        break;
      }
      case 'ritual': {
        x.rituais--;
        if (a.r === 'cura') {
          const c = Math.min(3, h.pvMax - h.pv); h.pv += c; ev.push({ t: 'ok', s: `Ritual de Cura: recuperas ${c} PV.`, fx: 'heal', n: c });
          if (x.combate) contraAtaque(st, ev);
        } else if (a.r === 'luz') {
          ev.push({ t: 'ok', s: 'Ritual de Luz: uma claridade fria revela tudo o que está escondido.', fx: 'reveal' });
          sala(st).investigada = true; revelarEscondido(st, ev);
        } else if (a.r === 'banir') {
          const m = alvo(st);
          const r = teste(st, ev, { attr: 'espirito', dif: m.chefe ? 1 : 0, rotulo: 'Banir (Espírito)' });
          if (r.ok) ferir(st, ev, m, 3); else ev.push({ t: 'mau', s: 'A criatura resiste ao ritual.' });
          if (!verificarFim(st, ev)) contraAtaque(st, ev);
        }
        break;
      }
      case 'usar': {
        const i = h.mochila.indexOf(a.item); if (i < 0) break;
        if (a.item === 'pocao') {
          h.mochila.splice(i, 1); const c = Math.min(4, h.pvMax - h.pv); h.pv += c;
          ev.push({ t: 'ok', s: `Bebes a poção: +${c} PV.`, fx: 'heal', n: c });
          if (x && x.combate) contraAtaque(st, ev);
        } else if (a.item === 'oleo' && x && x.combate) {
          h.mochila.splice(i, 1);
          ev.push({ t: 'info', s: 'Partes o frasco e as chamas sobem.', fx: 'fire' });
          ferir(st, ev, alvo(st), 2);
          if (!verificarFim(st, ev)) contraAtaque(st, ev);
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
        if (h.mochila.length >= CP.MOCHILA) break;
        const id = s.itens.splice(a.i, 1)[0];
        h.mochila.push(id); ev.push({ t: 'ok', s: `Guardas ${CP.ITENS[id].nome} na mochila.`, fx: 'pick' });
        break;
      }
      case 'investigar': {
        const s = sala(st); s.investigada = true;
        const r = teste(st, ev, { attr: 'astucia', vant: h.classe === 'explorador', rotulo: 'Investigar (Astúcia)' });
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
        const c = Math.min(2, h.pvMax - h.pv); h.pv += c;
        ev.push({ t: 'ok', s: `Descansas um pouco: +${c} PV.`, fx: 'heal', n: c });
        perigo(st, ev, 2);
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

  CP.Engine = { ladosDe, novaCampanha, acoes, act, info, xpProx, precoLoja, stockLoja, ecosAldeia, nomeSala, podeMover, tplDe, passavel };
})(typeof window !== 'undefined' ? window : globalThis);
