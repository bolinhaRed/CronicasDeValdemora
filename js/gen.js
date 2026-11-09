/* Crónicas de Valdemora — geração procedural.
   1) gera o mapa (grelha de 3x5 blocos de 8x8 casas, uma sala por bloco ocupado);
   2) coloca a missão (objetivo, pistas, objeto-chave) e o resto do conteúdo;
   3) valida que tudo é alcançável. Se falhar, tenta outra sub-semente. */
(function (G) {
  const CP = G.CP = G.CP || {};
  const S = 8, MC = 3, MR = 5;          // tamanho do bloco e grelha de blocos
  const W = MC * S, H = MR * S;          // 24 x 40 casas (A–X, 1–40)

  const letra = x => String.fromCharCode(65 + x);
  const coord = (x, y) => letra(x) + (y + 1);
  const centro = s => ({ x: s.x + Math.floor(s.w / 2), y: s.y + Math.floor(s.h / 2) });

  /* ---------- Mapa ---------- */
  function masmorra(semente) {
    const r = new CP.RNG(semente);
    const blocos = {};
    const salas = [], arestas = [];
    const k = (c, l) => c + ',' + l;

    function novaSala(c, l, extra) {
      const w = r.int(3, 6), h = r.int(3, 6);
      const x = c * S + 1 + r.int(0, 6 - w), y = l * S + 1 + r.int(0, 6 - h);
      const s = Object.assign({ id: salas.length, c, l, x, y, w, h, estado: 'desconhecida',
        itens: [], monstros: [], escondido: [], ouro: 0 }, extra || {});
      salas.push(s); blocos[k(c, l)] = s.id; return s.id;
    }

    // Corredor entre salas de blocos vizinhos. Fica sempre nas margens dos
    // blocos, por isso nunca atravessa outra sala.
    function novaAresta(a, b, tipo) {
      let A = salas[a], B = salas[b];
      const cel = [], portas = [];
      const add = (x, y) => { if (!cel.some(p => p[0] === x && p[1] === y)) cel.push([x, y]); };
      if (A.l === B.l) {                                   // horizontal
        const L = A.c < B.c ? A : B, R = L === A ? B : A;
        const yA = r.int(L.y, L.y + L.h - 1), yB = r.int(R.y, R.y + R.h - 1), xm = (L.c + 1) * S - 1;
        for (let x = L.x + L.w; x <= xm; x++) add(x, yA);
        for (let y = Math.min(yA, yB); y <= Math.max(yA, yB); y++) add(xm, y);
        for (let x = xm; x <= R.x - 1; x++) add(x, yB);
        portas.push({ x: L.x + L.w, y: yA, lado: 'w', sala: L.id }, { x: R.x - 1, y: yB, lado: 'e', sala: R.id });
      } else {                                             // vertical
        const T = A.l < B.l ? A : B, Bo = T === A ? B : A;
        const xA = r.int(T.x, T.x + T.w - 1), xB = r.int(Bo.x, Bo.x + Bo.w - 1), ym = (T.l + 1) * S - 1;
        for (let y = T.y + T.h; y <= ym; y++) add(xA, y);
        for (let x = Math.min(xA, xB); x <= Math.max(xA, xB); x++) add(x, ym);
        for (let y = ym; y <= Bo.y - 1; y++) add(xB, y);
        portas.push({ x: xA, y: T.y + T.h, lado: 'n', sala: T.id }, { x: xB, y: Bo.y - 1, lado: 's', sala: Bo.id });
      }
      const e = { id: arestas.length, a, b, tipo, cel, portas, conhecida: false, aberta: false, encontrada: false, mec: false };
      arestas.push(e); return e;
    }

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const inicio = novaSala(r.int(0, MC - 1), MR - 1);
    const alvo = r.int(8, 10);
    let guarda = 0;
    while (salas.length < alvo && guarda++ < 600) {
      const de = salas[r.int(0, salas.length - 1)];
      const d = r.pick(dirs), nc = de.c + d[0], nl = de.l + d[1];
      if (nc < 0 || nc >= MC || nl < 0 || nl >= MR || blocos[k(nc, nl)] !== undefined) continue;
      const id = novaSala(nc, nl);
      const t = r.next();
      novaAresta(de.id, id, t < 0.35 ? 'arco' : t < 0.87 ? 'porta' : 'trancada');
    }

    // Câmara oculta: só se chega lá por uma passagem secreta (opcional)
    let oculta = null;
    for (const s of r.shuffle(salas.filter(s => s.id !== inicio))) {
      const livre = r.shuffle(dirs).map(d => [s.c + d[0], s.l + d[1]])
        .find(([c, l]) => c >= 0 && c < MC && l >= 0 && l < MR && blocos[k(c, l)] === undefined);
      if (livre) {
        oculta = novaSala(livre[0], livre[1], { oculta: true });
        const e = novaAresta(s.id, oculta, 'secreta'); e.mec = true;
        break;
      }
    }

    // Ligações extra (caminhos alternativos e passagens secretas)
    for (const s of salas) {
      if (s.oculta) continue;
      for (const d of [[1, 0], [0, 1]]) {
        const o = blocos[k(s.c + d[0], s.l + d[1])];
        if (o === undefined || salas[o].oculta) continue;
        if (arestas.some(e => (e.a === s.id && e.b === o) || (e.a === o && e.b === s.id))) continue;
        if (r.chance(0.3)) novaAresta(s.id, o, r.chance(0.4) ? 'secreta' : 'porta');
      }
    }
    return { W, H, salas, arestas, inicio, oculta };
  }

  /* ---------- Grafo ---------- */
  function vizinhos(d, id, incluiSecretas) {
    return d.arestas.filter(e => (e.a === id || e.b === id) && (incluiSecretas || e.tipo !== 'secreta'))
      .map(e => ({ e, o: e.a === id ? e.b : e.a }));
  }
  // Distâncias a partir de "de", sem passar por "evitar"
  function bfs(d, de, evitar) {
    const dist = { [de]: 0 }, fila = [de];
    while (fila.length) {
      const id = fila.shift();
      for (const { o } of vizinhos(d, id, false)) {
        if (o === evitar || dist[o] !== undefined) continue;
        dist[o] = dist[id] + 1; fila.push(o);
      }
    }
    return dist;
  }

  function monstro(tipo, extra) {
    const m = CP.MONSTROS[tipo];
    return Object.assign({ tipo, nome: m.nome, pv: m.pv, pvMax: m.pv, atk: m.atk, def: m.def, dano: m.dano,
      morto: !!m.morto, acordado: false }, extra || {});
  }

  /* ---------- Povoar ---------- */
  function povoar(d, tpl, v, r, m) {
    const T = CP.TIPOS[tpl.tipo];
    const dist = bfs(d, d.inicio, null);
    const normais = d.salas.filter(s => !s.oculta);
    if (normais.some(s => dist[s.id] === undefined)) return false;
    const obj = normais.reduce((a, s) => (dist[s.id] > dist[a.id] ? s : a), normais[0]);
    if (dist[obj.id] < 3) return false;
    d.objetivo = obj.id;

    const antes = bfs(d, d.inicio, obj.id);   // salas alcançáveis sem passar pelo objetivo
    const cand = r.shuffle(Object.keys(antes).map(Number).filter(id => id !== d.inicio && id !== obj.id && !d.salas[id].oculta));
    if (cand.length < 4) return false;

    // nomes e descrições
    const nomes = r.shuffle(T.salas), descs = r.shuffle(T.descs);
    d.salas.forEach((s, i) => { s.nome = nomes[i % nomes.length]; s.desc = descs[i % descs.length]; });
    const ini = d.salas[d.inicio];
    ini.nome = 'Entrada'; ini.desc = 'Degraus de pedra descem da superfície. A luz do dia fica para trás.';

    // objetivo
    obj.monstros.push(monstro(v.chefe, { chefe: true }));
    obj.chefe = true;

    // objeto-chave e pistas
    const usadas = new Set();
    const salaItem = d.salas[cand[0]]; usadas.add(cand[0]);
    salaItem.itens.push(v.item); salaItem.itemTxt = v.itemTxt;
    v.pistas.forEach((_, i) => { const s = d.salas[cand[1 + i]]; s.pista = i; usadas.add(s.id); });

    // mecanismo da câmara oculta
    const em = d.arestas.find(e => e.mec);
    if (em) {
      const viz = em.a === d.oculta ? em.b : em.a;
      const oc = d.salas[d.oculta];
      oc.nome = 'Câmara oculta'; oc.desc = 'Uma sala selada há séculos. O pó cobre tudo por igual.';
      oc.itens.push(r.pick(['anel', 'idolo', 'calice'])); oc.ouro = r.int(4, 9);
      if (r.chance(0.6)) oc.reliquia = true;
      if (viz === obj.id || viz === d.inicio) {
        em.mec = false;                                    // passa a ser só uma passagem secreta
        d.salas[viz].escondido.push({ k: 'secreta', e: em.id });
      } else {
        const s = d.salas[viz];
        s.mec = { simbolo: r.pick(CP.SIMBOLOS), aresta: em.id, resolvido: false };
        const sala = cand.find(id => id !== viz && !d.salas[id].inscricao);
        d.salas[sala].inscricao = { txt: `Uma gravura gasta mostra três símbolos. Só o ${s.mec.simbolo} tem a pedra polida pelo uso de muitas mãos.`, simbolo: true, lida: false };
      }
    }
    // outras passagens secretas descobrem-se a investigar
    for (const e of d.arestas) {
      if (e.tipo === 'secreta' && !e.mec && !d.salas[e.a].escondido.some(h => h.e === e.id)) {
        d.salas[e.a].escondido.push({ k: 'secreta', e: e.id });
        d.salas[e.b].escondido.push({ k: 'secreta', e: e.id });
      }
    }

    // ameaça da missão: criaturas mais fortes e mais numerosas
    const am = Math.max(1, Math.min(3, m.ameaca || 1));
    const reforcar = mo => { mo.pv += (mo.chefe ? 2 : 1) * (am - 1); mo.pvMax = mo.pv; if (am >= 3) mo.atk += 1; return mo; };
    obj.monstros.forEach(reforcar);

    // conteúdo de enchimento
    for (const s of d.salas) {
      if (s.id === d.inicio || s.id === obj.id || s.oculta) continue;
      const t = r.next();
      if (usadas.has(s.id)) {                // salas com pistas: só às vezes uma armadilha
        if (t < 0.25) s.armadilha = { gasta: false };
        continue;
      }
      if (t < 0.25) { if (am >= 2 && r.chance(0.2 * (am - 1))) s.monstros.push(reforcar(monstro(r.pick(T.monstros), { acordado: r.chance(0.4) }))); }
      else if (t < 0.55) {
        s.monstros.push(reforcar(monstro(r.pick(T.monstros), { acordado: r.chance(0.4) })));
        if (am >= 2 && r.chance(0.25 * (am - 1))) s.monstros.push(reforcar(monstro(r.pick(T.monstros), { acordado: s.monstros[0].acordado })));
      }
      else if (t < 0.68) s.armadilha = { gasta: false };
      else if (t < 0.78) s.restos = { nota: r.pick(CP.NOTAS), saque: r.chance(0.5) ? 'pocao' : null, ouro: r.int(2, 6) };
      else if (t < 0.9) s.escondido.push({ k: 'tesouro', item: r.pick(['broche', 'calice', 'anel']) });
      else if (!s.inscricao) s.inscricao = { txt: r.pick(CP.INSCRICOES), lida: false };
      if (r.chance(0.25)) s.ouro += r.int(1, 4);
      if (r.chance(0.15)) s.escondido.push({ k: 'ouro', n: r.int(3, 8) });
    }
    // eventos com escolhas (1 ou 2 por masmorra) em salas sem nada
    const livres = r.shuffle(d.salas.filter(s => s.id !== d.inicio && s.id !== obj.id && !s.oculta && !usadas.has(s.id) && !s.monstros.length
      && !s.armadilha && !s.restos && !s.inscricao && !s.mec && s.pista === undefined));
    const evs = r.shuffle(Object.keys(CP.EVENTOS).filter(k => CP.EVENTOS[k].tipos.includes(tpl.tipo)));
    const nEv = Math.min(livres.length, evs.length, r.int(1, 2));
    for (let i = 0; i < nEv; i++) livres[i].evento = { id: evs[i], feito: false, mimico: evs[i] === 'bau' && r.chance(0.5) };
    return true;
  }

  /* ---------- Validação ---------- */
  function validar(d, tpl, v) {
    const erros = [];
    const dist = bfs(d, d.inicio, null), antes = bfs(d, d.inicio, d.objetivo);
    if (dist[d.objetivo] === undefined) erros.push('objetivo inalcançável');
    const comItem = d.salas.filter(s => s.itens.includes(v.item));
    if (!comItem.some(s => antes[s.id] !== undefined)) erros.push('objeto-chave inalcançável');
    v.pistas.forEach((_, i) => {
      const s = d.salas.find(s => s.pista === i);
      if (!s || antes[s.id] === undefined) erros.push('pista ' + i + ' inalcançável');
    });
    const ocup = new Set();
    d.salas.forEach(s => { for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) {
      const c = x + ',' + y; if (ocup.has(c)) erros.push('salas sobrepostas'); ocup.add(c);
      if (x < 0 || y < 0 || x >= d.W || y >= d.H) erros.push('sala fora da grelha');
    } });
    d.arestas.forEach(e => e.cel.forEach(([x, y]) => { if (ocup.has(x + ',' + y)) erros.push('corredor dentro de sala'); }));
    const mec = d.salas.find(s => s.mec);
    if (mec && !d.salas.some(s => s.inscricao && s.inscricao.simbolo)) erros.push('mecanismo sem pista');
    return erros;
  }

  /* ---------- Expedição ---------- */
  function expedicao(m) {
    const tpl = CP.MISSOES.find(t => t.id === m.tpl), v = tpl.variantes[m.var];
    for (let t = 0; t < 60; t++) {
      const d = masmorra(m.seed + '|mapa|' + t);
      const r = new CP.RNG(m.seed + '|conteudo|' + t);
      if (povoar(d, tpl, v, r, m) && validar(d, tpl, v).length === 0) { d.tipo = tpl.tipo; return d; }
    }
    throw new Error('Não foi possível gerar a masmorra para ' + m.seed);
  }

  CP.Gen = { masmorra, expedicao, validar, bfs, vizinhos, monstro, coord, centro, letra, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
