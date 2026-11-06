/* Crónicas de Valdemora — interface.
   Só desenha o estado e envia ações ao motor (CP.Engine). Não decide regras. */
(function (G) {
  const CP = G.CP, E = CP.Engine, Gen = CP.Gen, Som = CP.Som;
  const $ = s => document.querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dorme = ms => new Promise(r => setTimeout(r, ms));

  let st = null;          // estado atual
  let acoesAtuais = [];   // ações mostradas
  let ultimos = [];       // eventos da última ação
  let ocupado = false;    // enquanto os eventos estão a ser mostrados
  let saltar = false;     // tocar no dado acelera
  let classeEscolhida = 'guerreiro';

  /* ================= Aparência das classes e dos dados ================= */
  const COR = { guerreiro: '#a8402f', ladrao: '#3e6f80', explorador: '#5f7a2f', mistico: '#6c4c9e' };
  const SIGLA = { guerreiro: 'GU', ladrao: 'LA', explorador: 'EX', mistico: 'MI' };
  const ABREV = { forca: 'For', agilidade: 'Agi', astucia: 'Ast', espirito: 'Esp' };
  const FORMA = {
    4: '<polygon points="50,5 96,88 4,88"/>',
    6: '<rect x="8" y="8" width="84" height="84" rx="14"/>',
    8: '<polygon points="50,3 96,50 50,97 4,50"/><path d="M4 50H96" class="ar"/>',
    10: '<polygon points="50,3 96,40 50,97 4,40"/><path d="M4 40L50 58L96 40M50 58V97" class="ar"/>',
    12: '<polygon points="50,3 97,37 79,94 21,94 3,37"/><polygon points="50,24 74,42 65,72 35,72 26,42" class="ar"/>'
  };
  const TY = { 4: 68, 6: 52, 8: 52, 10: 46, 12: 51 };
  function dadoSVG(lados, valor, cor, extra) {
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    const t = valor == null ? 'd' + lados : valor;
    const fs = valor == null ? 26 : (String(valor).length > 1 ? 34 : 40);
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
      <g fill="${cor}" stroke="rgba(0,0,0,.55)" stroke-width="4" stroke-linejoin="round">${FORMA[lados]}</g>
      <g fill="url(#${id})" stroke="none" opacity=".55">${FORMA[lados].replace(/class="ar"/g, 'style="display:none"')}</g>
      <style>.ar{fill:none;stroke:rgba(255,255,255,.22);stroke-width:2}</style>
      ${extra || ''}<text x="50" y="${TY[lados]}" text-anchor="middle" dominant-baseline="middle" font-family="Alegreya Sans, sans-serif" font-weight="700" font-size="${fs}" fill="#fff" stroke="rgba(0,0,0,.5)" stroke-width="3" paint-order="stroke">${t}</text></svg>`;
  }
  const lados = v => E.ladosDe(v);
  const chipsDados = h => Object.keys(CP.ATRIB).map(k =>
    `<span class="chip" title="${CP.ATRIB[k]}">${dadoSVG(lados(h.attrs[k]), null, COR[h.classe])}${ABREV[k]} <b>d${lados(h.attrs[k])}</b></span>`).join('');
  const IMG_TOKEN = {};
  const tokenHTML = (classe, extra) => {
    const src = IMG_TOKEN[classe] || (IMG_TOKEN[classe] = CP.Fichas.imagemHeroi(classe, COR[classe], 64));
    return `<div class="token tk" ${extra || ''}><img src="${src}" alt="${CP.CLASSES[classe].nome}"></div>`;
  };

  /* ================= Fluxo principal ================= */
  async function executar(a) {
    if (ocupado || !st || !a) return;
    Som.desbloquear();
    let r;
    try { r = E.act(st, a); } catch (e) { console.error(e); ultimos = [{ t: 'mau', s: 'Ocorreu um erro: ' + e.message }]; render(); return; }
    const antes = st.ecra, pvAntes = st.hero.pv, salaAntes = st.exp ? st.exp.sala : null;
    st = r.st; CP.Save.guardar(st);
    if (antes === 'expedicao' && st.exp && st.exp.sala !== salaAntes) Mapa.centrar(false);
    ultimos = r.ev;
    if (antes !== 'expedicao' && st.ecra === 'expedicao') { mostrar('ecra-exp'); Mapa.ajustar(); Mapa.sujo = true; Mapa.centrar(true, true); Som.ambiente(true); }
    if (antes === 'expedicao' && st.ecra !== 'expedicao') Som.ambiente(false);
    if (antes === 'expedicao') {
      ocupado = true; Mapa.sujo = true;
      renderEstado(pvAntes);
      $('#acoes').querySelectorAll('button').forEach(b => { b.disabled = true; });
      await reproduzir(r.ev);
      ocupado = false;
      if (st.ecra === 'resumo') { const t = st.resumo.tipo; Som.tocar(t === 'sucesso' ? 'win' : t === 'derrota' ? 'lose' : 'step'); await dorme(500); }
      render();
    } else {
      render();
      if (st.ecra === 'expedicao') { ocupado = true; $('#acoes').querySelectorAll('button').forEach(b => { b.disabled = true; }); await reproduzir(r.ev); ocupado = false; render(); }
      else r.ev.forEach(e => e.fx && Som.tocar(e.fx));
    }
  }

  // Mostra os eventos em sequência: dados animados, texto, sons e efeitos
  async function reproduzir(evs) {
    const narr = $('#narr'); narr.innerHTML = ''; saltar = false;
    for (const e of evs) {
      if (e.t === 'd') await animarDado(e);
      narr.insertAdjacentHTML('beforeend', linhaEvento(e));
      narr.scrollTop = narr.scrollHeight;
      if (e.fx) { efeito(e); if (!saltar) await dorme(['boss', 'win', 'hurt', 'trap', 'kill'].includes(e.fx) ? 380 : 160); }
      else if (!saltar) await dorme(e.t === 'd' ? 0 : 40);
    }
    narr.scrollTop = 0;
  }

  function mostrar(id) { document.querySelectorAll('.ecra').forEach(s => { s.hidden = s.id !== id; }); }

  function render() {
    if (!st) { renderCriar(); mostrar('ecra-criar'); return; }
    if (st.ecra === 'expedicao') { mostrar('ecra-exp'); renderExp(); }
    else if (st.ecra === 'resumo') { mostrar('ecra-resumo'); renderResumo(); }
    else { mostrar('ecra-aldeia'); renderAldeia(); }
  }

  /* ================= Criar aventureiro ================= */
  function renderCriar() {
    const capa = document.querySelector('#ecra-criar .capa');
    if (!capa) {
      $('#ecra-criar .logo').outerHTML = `<div class="capa"><img class="px fogo e" src="${CP.ART.fire}" alt=""><img class="px fogo d" src="${CP.ART.fire}" alt=""><h1 class="logo">Crónicas de<br>Valdemora</h1></div>`;
    }
    $('#classes').innerHTML = Object.entries(CP.CLASSES).map(([id, c]) => {
      const h = { classe: id, attrs: c.attrs };
      return `<button class="classe" data-classe="${id}" aria-pressed="${id === classeEscolhida}">
        ${tokenHTML(id)}<b>${c.nome} <small style="font:14px var(--fonte);color:var(--texto-2)">${c.pv} PV</small></b>
        <span>${c.desc}</span><div class="chips">${chipsDados(h)}</div></button>`;
    }).join('');
  }
  const NOMES = ['Inês', 'Afonso', 'Leonor', 'Gil', 'Brites', 'Martim', 'Urraca', 'Nuno'];
  function comecar() {
    Som.desbloquear(); Som.tocar('reveal');
    const nome = $('#in-nome').value.trim() || NOMES[Math.floor(Math.random() * NOMES.length)];
    const semente = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    st = E.novaCampanha(semente, nome, classeEscolhida);
    CP.Save.guardar(st); ultimos = [];
    render();
  }

  /* ================= Aldeia ================= */
  const TILE = { cripta: 'fl7', ruinas: 'fl4', mina: 'fl8' };
  function renderAldeia() {
    const h = st.hero, M = st.mundo, c = CP.CLASSES[h.classe];
    const arma = CP.ITENS[h.arma];
    let html = `<div class="capa"><img class="px fogo e" src="${CP.ART.fire}" alt=""><img class="px fogo d" src="${CP.ART.fire}" alt=""><h2 style="text-align:center;margin:0">Região de Corvamonte</h2><button class="bt-menu" data-folha="menu">Menu</button></div>`;
    html += ultimos.filter(e => e.t !== 'd').map(e => `<p class="aviso">${esc(e.s)}</p>`).join('');
    ultimos = [];

    html += `<div class="cartao">${tokenHTML(h.classe)}<div class="nome">${esc(h.nome)}</div>
      <div class="ficha"><span>${c.nome} de nível <b>${h.nivel}</b></span><span>Vida <b>${h.pv}/${h.pvMax}</b></span><span>Ouro <b>${h.ouro}</b></span><span>XP <b>${h.xp}/${E.xpProx(h.nivel)}</b></span></div>
      <div class="chips">${chipsDados(h)}</div>
      <div class="ficha" style="grid-column:1/-1"><span>${arma.nome} <b>dano ${arma.dano}${arma.atk ? ', +' + arma.atk : ''}</b></span>
      ${h.armadura ? `<span>${CP.ITENS[h.armadura].nome} <b>+${CP.ITENS[h.armadura].def}</b></span>` : ''}${h.escudo ? `<span>Escudo <b>+1</b></span>` : ''}</div></div>`;
    if (h.niveisPend > 0) {
      html += `<p class="aviso">Subiste de nível. Escolhe o dado a melhorar (vida máxima +2).</p><div class="niveis">` +
        Object.keys(h.attrs).map(k => `<button class="bt" data-nivel="${k}" ${h.attrs[k] >= 4 ? 'disabled' : ''}>${CP.ATRIB[k]}: d${lados(h.attrs[k])} → d${lados(h.attrs[k] + 1)}</button>`).join('') + '</div>';
    }

    html += `<h3>Missões</h3><div class="missoes">`;
    for (const m of M.missoes) {
      const tpl = E.tplDe(m), emCurso = m.estado === 'em_curso';
      html += `<div class="missao ${emCurso ? 'curso' : ''}" style="--tile:url(${CP.ART[TILE[tpl.tipo]]})"><h4>${esc(m.titulo)}</h4>
        <p class="meta">${tpl.cliente} · ${CP.LOCAIS[tpl.local].nome} · ${tpl.recompensa} moedas${emCurso ? ' · em curso' : ''}</p>
        <p>${tpl.objetivo}</p>
        <div class="linha"><button class="bt bt-p" data-partir="${m.id}">${emCurso ? 'Continuar a expedição' : 'Partir'}</button>
        ${emCurso ? `<button class="bt bt-s" data-abandonar="${m.id}">Desistir</button>` : ''}</div></div>`;
    }
    html += `</div>`;

    for (const [id, L] of Object.entries(CP.LOCAIS)) {
      if (id === 'pedrafunda' && !M.flags.pedrafunda) continue;
      const rep = M.rep[id] || 0;
      html += `<h3>${L.nome}</h3><p class="p2">${L.desc} Reputação: ${rep > 0 ? '+' : ''}${rep}.</p>` +
        E.ecosAldeia(st, id).map(t => `<p class="eco">${esc(t)}</p>`).join('');
    }

    html += `<h3>Estalagem e mercado</h3><div class="loja">`;
    html += `<button class="bt" data-descansar ${h.pv >= h.pvMax || h.ouro < 2 ? 'disabled' : ''}><span>Dormir na estalagem</span><small>Recuperas a vida toda</small><span class="p">2 moedas</span></button>`;
    for (const id of E.stockLoja(st)) {
      const it = CP.ITENS[id], p = E.precoLoja(st, id);
      const tem = h.arma === id || h.armadura === id || h.escudo === id;
      const cheio = ['consumivel', 'ferramenta'].includes(it.tipo) && h.mochila.length >= CP.MOCHILA;
      const det = it.tipo === 'arma' ? `Dano ${it.dano}${it.atk ? ', +' + it.atk + ' ao dado' : ''}, usa ${CP.ATRIB[it.attr]}` : it.def ? `Defesa +${it.def}` : (it.desc || '');
      html += `<button class="bt" data-comprar="${id}" ${tem || cheio || h.ouro < p ? 'disabled' : ''}><span>${it.nome}</span><small>${det}${tem ? ' · já tens' : ''}</small><span class="p">${p} moedas</span></button>`;
    }
    h.mochila.forEach((id, i) => { const it = CP.ITENS[id]; if (it.valor) html += `<button class="bt" data-vender="${i}"><span>Vender ${it.nome}</span><small>Tesouro</small><span class="p">+${it.valor} moedas</span></button>`; });
    html += `</div>`;

    html += `<h3>Mochila</h3>` + slots(h) + listaMochila(false);
    html += `<h3>Campanha</h3><div class="loja"><button class="bt" data-folha="campanha"><span>Exportar ou importar</span></button>
      <button class="bt" data-folha="regras"><span>Regras</span></button>
      <button class="bt" data-som><span>Som: ${Som.ligado() ? 'ligado' : 'desligado'}</span></button></div>`;
    $('#aldeia').innerHTML = html;
  }

  const slots = h => `<div class="slots">${[...Array(CP.MOCHILA)].map((_, i) => `<i class="${i < h.mochila.length ? 'c' : ''}"></i>`).join('')}</div>`;
  function listaMochila(naExp) {
    const h = st.hero;
    if (!h.mochila.length) return `<p class="vazio">Mochila vazia.</p>`;
    return h.mochila.map((id, i) => {
      const it = CP.ITENS[id];
      const usar = id === 'pocao' && h.pv < h.pvMax ? `<button class="bt" data-usar="${id}">Usar</button>` : '';
      const largar = naExp ? `<button class="bt" data-largar="${i}">Largar</button>` : (it.tipo === 'missao' ? '' : `<button class="bt" data-largar="${i}">Deitar fora</button>`);
      return `<div class="item"><div>${it.nome}<small>${it.desc || (it.valor ? 'Vale ' + it.valor + ' moedas.' : '')}</small></div><div class="bts">${usar}${largar}</div></div>`;
    }).join('');
  }

  /* ================= Expedição ================= */
  function renderEstado(pvAntes) {
    const h = st.hero, x = st.exp; if (!x) return;
    $('#st-token').outerHTML = tokenHTML(h.classe, 'id="st-token"');
    $('#st-nome').textContent = h.nome;
    $('#st-ouro').textContent = h.ouro;
    const pct = 100 * h.pv / h.pvMax;
    if (pvAntes != null && pvAntes > h.pv) $('#st-pvf').style.width = (100 * pvAntes / h.pvMax) + '%';
    $('#st-pv').style.width = pct + '%';
    requestAnimationFrame(() => { $('#st-pvf').style.width = pct + '%'; });
    $('#st-pvt').textContent = `${h.pv}/${h.pvMax} PV`;
    $('#st-dados').innerHTML = chipsDados(h);
    $('#st-perigo').innerHTML = [1, 2, 3, 4, 5, 6].map(i => `<i class="${i <= x.perigo ? 'on' : ''} ${x.perigo >= 4 ? 'alto' : ''}"></i>`).join('');
    $('#bt-som').textContent = Som.ligado() ? '♪' : '×';
    $('#bt-som').setAttribute('aria-label', Som.ligado() ? 'Desligar o som' : 'Ligar o som');
    const s = x.d.salas[x.sala];
    $('#sala-tit').textContent = `${s.nome} · ${E.nomeSala(s)}`;
  }

  function linhaEvento(e) {
    if (e.t === 'd') {
      const cor = st ? COR[st.hero.classe] : '#777';
      const ds = e.dados.length > 1 ? `${e.dados.join(' e ')} (vantagem)` : e.dados[0];
      return `<p class="d">${dadoSVG(e.lados, null, cor)}<span>${esc(e.s)}: d${e.lados} → ${ds}${e.bonus ? ' +' + e.bonus : ''} = ${e.v}, precisava de ${e.alvo} · ${e.ok ? 'sucesso' : 'falha'}</span></p>`;
    }
    return `<p class="${e.t}">${e.t === 'pista' ? 'Pista: ' : ''}${esc(e.s)}</p>`;
  }

  function renderExp() {
    renderEstado();
    const narr = $('#narr');
    if (!narr.children.length || ultimos.length === 0) {
      const evs = ultimos.length ? ultimos : st.exp.registo.slice(-8);
      narr.innerHTML = evs.map(linhaEvento).join('');
    }
    acoesAtuais = E.acoes(st);
    $('#acoes').innerHTML = acoesAtuais.map((a, i) =>
      `<button class="bt ${a.grupo || ''}" data-acao="${i}" ${a.off ? 'disabled' : ''}>${esc(a.rotulo)}${a.off ? ` <small>(${a.motivo})</small>` : ''}</button>`).join('');
    Mapa.sujo = true;
  }

  /* ================= Resumo ================= */
  function renderResumo() {
    const r = st.resumo;
    const tit = { sucesso: 'Missão cumprida', retirada: 'Retirada', derrota: 'Derrota' }[r.tipo];
    $('#resumo').innerHTML = `<div class="resumo-ban ${r.tipo}"><h2>${tit}</h2><p class="p2">${esc(r.titulo)}</p></div>` +
      r.linhas.map((l, i) => `<p class="${i === 0 && r.tipo === 'sucesso' ? 'eco' : ''}">${esc(l)}</p>`).join('') +
      `<div class="ficha"><span>Ouro ganho <b>${r.ouro}</b></span><span>Experiência ganha <b>${r.xp}</b></span></div>
       <button class="bt bt-p" data-voltar>Voltar à aldeia</button>`;
  }

  /* ================= Dado ================= */
  async function animarDado(d) {
    const el = $('#dado'), cor = COR[st.hero.classe];
    el.hidden = false;
    const tx = `<div class="tx"><b>${esc(d.s)}</b><span>d${d.lados}${d.bonus ? ' +' + d.bonus : ''} · precisa de ${d.alvo}${d.vant ? ' · vantagem' : ''}</span></div>`;
    Som.tocar('dice');
    if (!reduzido() && !saltar) {
      const t0 = Date.now();
      while (Date.now() - t0 < 560 && !saltar) {
        el.innerHTML = `<div class="faces">${d.dados.map(() => `<div class="dd rola">${dadoSVG(d.lados, 1 + Math.floor(Math.random() * d.lados), cor)}</div>`).join('')}</div>${tx}`;
        await dorme(80);
      }
    }
    const melhor = d.dados.indexOf(d.nat);
    const anel = ok => `<circle cx="50" cy="50" r="49" fill="none" stroke="${ok ? '#a8d283' : '#ef8f7c'}" stroke-width="4" opacity=".9"/>`;
    el.innerHTML = `<div class="faces">${d.dados.map((n, i) => `<div class="dd ${i === melhor ? 'cai' : 'fora'}">${dadoSVG(d.lados, n, cor, i === melhor ? anel(d.ok) : '')}</div>`).join('')}</div>` +
      `<div class="tx"><b>${esc(d.s)}</b><span>${d.nat}${d.bonus ? ' + ' + d.bonus + ' = ' + d.v : ''} · precisa de ${d.alvo}</span><div class="res ${d.ok ? 'ok' : 'ko'}">${d.ok ? (d.max ? 'Sucesso máximo!' : 'Sucesso') : (d.nat === 1 ? 'Falha (1 natural)' : 'Falha')}</div></div>`;
    await dorme(saltar ? 120 : reduzido() ? 600 : 850);
    el.hidden = true;
  }

  /* ================= Efeitos visuais e sonoros ================= */
  function flash(cor) { const f = document.createElement('div'); f.className = 'flash'; f.style.background = cor; $('#fx').appendChild(f); setTimeout(() => f.remove(), 650); }
  function tremer() { const a = $('#app'); a.classList.remove('treme'); void a.offsetWidth; a.classList.add('treme'); setTimeout(() => a.classList.remove('treme'), 420); }
  function flutuar(p, texto, cor) {
    if (!p) return; const f = document.createElement('div'); f.className = 'flut'; f.textContent = texto; f.style.color = cor;
    f.style.left = p.x + 'px'; f.style.top = p.y + 'px'; $('#fx').appendChild(f); setTimeout(() => f.remove(), 1250);
  }
  function faixa(texto, mau) { const f = document.createElement('div'); f.className = 'faixa' + (mau ? ' mau' : ''); f.textContent = texto; $('#fx').appendChild(f); setTimeout(() => f.remove(), 1850); }

  function efeito(e) {
    Som.tocar(e.fx);
    if (reduzido() && ['hurt', 'trap'].includes(e.fx)) { /* sem tremer */ }
    const H = Mapa.ecraHeroi(), Mo = Mapa.ecraMonstro();
    const wH = Mapa.mundoHeroi(), wM = Mapa.mundoMonstro();
    switch (e.fx) {
      case 'hurt': if (!reduzido()) tremer(); flash('#b8432f'); flutuar(H, '−' + e.n, '#ff8a75'); Mapa.particulas(wH, '#c0503d', 14, 1.6); break;
      case 'hit': flutuar(Mo, '−' + e.n, '#ffe08a'); Mapa.particulas(wM, '#ffd27a', 12, 2.2); break;
      case 'kill': Mapa.particulas(wM, '#d8d2c2', 22, 2.6); Mapa.particulas(wM, '#7a2e22', 10, 1.4); break;
      case 'miss': flutuar(Mo, 'falha', '#c9cfd6'); break;
      case 'block': flutuar(H, 'defendes', '#c9e3ff'); Mapa.particulas(wH, '#e8f1ff', 8, 2); break;
      case 'coin': flutuar(H, '+' + e.n, '#f3d27a'); Mapa.particulas(wH, '#f3d27a', 12, 1.2, -1.5); break;
      case 'heal': flutuar(H, '+' + e.n, '#a8d283'); Mapa.particulas(wH, '#a8d283', 14, .8, -1.2); break;
      case 'reveal': Mapa.particulas(wH, '#fff6d8', 16, 1.6, -.6); break;
      case 'trap': if (!reduzido()) tremer(); Mapa.particulas(wH, '#9b9a94', 18, 2); break;
      case 'fire': Mapa.particulas(wM, '#ff9a3c', 22, 1.6, -1.6); flash('#ff8a2a'); break;
      case 'omen': flash('#3a1f4a'); break;
      case 'boss': faixa('Confronto', true); flash('#2a0c08'); break;
      case 'win': faixa('Objetivo cumprido'); Mapa.particulas(wH, '#f3d27a', 30, 2.2, -1); break;
      case 'peace': Mapa.particulas(wM, '#fff6d8', 26, 1.4, -1.2); break;
      case 'lose': flash('#000'); break;
      case 'growl': Mapa.particulas(wM, '#c0503d', 6, .8); break;
    }
  }

  /* ================= Mapa ================= */
  const IMG = {};
  for (const [k, v] of Object.entries(CP.ART)) { const i = new Image(); i.onload = () => { Mapa.sujo = true; }; i.src = v; IMG[k] = i; }
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); };
  const FL = ['fl0', 'fl0', 'fl0', 'fl0', 'fl6', 'fl1', 'fl2', 'fl3', 'fl5', 'fl0', 'fl4', 'fl7', 'fl8', 'fl0'];

  const Mapa = {
    C: 32, esc: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1, ptrs: new Map(), gesto: null, sujo: true,
    heroi: null, parts: [], ultimo: 0,
    init() {
      this.cv = $('#mapa'); this.ctx = this.cv.getContext('2d');
      this.est = document.createElement('canvas'); this.luz = document.createElement('canvas');
      const cv = this.cv;
      cv.addEventListener('pointerdown', e => {
        Som.desbloquear();
        cv.setPointerCapture(e.pointerId);
        this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.ptrs.size === 1) this.gesto = { t0: Date.now(), mov: 0 };
        if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.gesto.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), esc: this.esc }; this.gesto.mov = 99; }
      });
      cv.addEventListener('pointermove', e => {
        const p = this.ptrs.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (this.ptrs.size === 1) { this.ox += dx; this.oy += dy; this.gesto.mov += Math.abs(dx) + Math.abs(dy); }
        else if (this.ptrs.size === 2 && this.gesto.pinch) {
          const [a, b] = [...this.ptrs.values()], r = cv.getBoundingClientRect();
          this.zoomPara(this.gesto.pinch.esc * Math.hypot(a.x - b.x, a.y - b.y) / this.gesto.pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        }
        this.limitar();
      });
      const fim = e => {
        if (!this.ptrs.has(e.pointerId)) return;
        this.ptrs.delete(e.pointerId);
        const g = this.gesto;
        if (this.ptrs.size === 0 && g && g.mov < 8 && Date.now() - g.t0 < 400) { const r = cv.getBoundingClientRect(); this.toque(e.clientX - r.left, e.clientY - r.top); }
      };
      cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
      cv.addEventListener('wheel', e => {
        e.preventDefault(); const r = cv.getBoundingClientRect();
        this.zoomPara(this.esc * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top); this.limitar();
      }, { passive: false });
      document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
        const z = +b.dataset.zoom;
        if (z === 0) this.centrar(false); else this.zoomPara(this.esc * (z > 0 ? 1.3 : 1 / 1.3), this.w / 2, this.h / 2);
        this.limitar();
      }));
      new ResizeObserver(() => { this.ajustar(); this.centrar(false, true); }).observe(cv);
      const ciclo = t => { requestAnimationFrame(ciclo); if (t - this.ultimo < 33) return; const dt = Math.min(.1, (t - this.ultimo) / 1000); this.ultimo = t; this.frame(t, dt); };
      requestAnimationFrame(ciclo);
    },
    ajustar() {
      const r = this.cv.getBoundingClientRect(); if (!r.width) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.w = r.width; this.h = r.height;
      this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
      this.luz.width = this.cv.width; this.luz.height = this.cv.height;
    },
    escMin() { return Math.min(this.w / (Gen.W * this.C + 40), this.h / (Gen.H * this.C + 40)); },
    zoomPara(n, px, py) {
      n = Math.max(this.escMin(), Math.min(2.4, n));
      this.ox = px - (px - this.ox) * (n / this.esc); this.oy = py - (py - this.oy) * (n / this.esc); this.esc = n;
    },
    limitar() {
      const ww = Gen.W * this.C * this.esc, hh = Gen.H * this.C * this.esc, m = 80;
      this.ox = Math.min(this.w - m, Math.max(m - ww, this.ox)); this.oy = Math.min(this.h - m, Math.max(m - hh, this.oy));
    },
    alvoHeroi() { const s = st.exp.d.salas[st.exp.sala], c = Gen.centro(s); return { x: (c.x + .5) * this.C, y: (c.y + .5) * this.C }; },
    centrar(zoom, salto) {
      if (!st || !st.exp || !this.w) return;
      if (zoom) this.esc = Math.max(this.escMin(), Math.min(1.7, this.w / (11 * this.C)));
      const a = this.alvoHeroi();
      this.destino = { ox: this.w / 2 - a.x * this.esc, oy: this.h * .45 - a.y * this.esc };
      if (salto || reduzido()) { this.ox = this.destino.ox; this.oy = this.destino.oy; this.destino = null; this.heroi = { ...a }; }
      this.limitar();
    },
    // posições
    posMonstros(s) {
      const c = Gen.centro(s), offs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [-1, 0]];
      return s.monstros.filter(m => m.pv > 0).map((m, i) => ({ m, x: (c.x + .5 + offs[i % 6][0] * Math.min(1, (s.w - 1) / 2)) * this.C, y: (c.y + .5 + offs[i % 6][1] * Math.min(1, (s.h - 1) / 2)) * this.C }));
    },
    mundoHeroi() { return this.heroi || (st && st.exp ? this.alvoHeroi() : null); },
    mundoMonstro() {
      if (!st || !st.exp) return null; const s = st.exp.d.salas[st.exp.sala], p = this.posMonstros(s);
      if (p.length) return { x: p[0].x, y: p[0].y };
      const c = Gen.centro(s); return { x: (c.x - .5) * this.C, y: (c.y - .5) * this.C };
    },
    paraEcra(p) { if (!p) return null; const r = this.cv.getBoundingClientRect(); return { x: r.left + this.ox + p.x * this.esc, y: r.top + this.oy + p.y * this.esc }; },
    ecraHeroi() { return this.paraEcra(this.mundoHeroi()); },
    ecraMonstro() { return this.paraEcra(this.mundoMonstro()); },
    particulas(p, cor, n, vel, sobe) {
      if (!p || reduzido()) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (.4 + Math.random()) * vel * 40;
        this.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (sobe || 0) * 30, vida: .6 + Math.random() * .6, t: 0, cor, r: 1.5 + Math.random() * 2.5, g: sobe ? 0 : 60 });
      }
    },
    toque(px, py) {
      if (!st || !st.exp || ocupado) return;
      const C = this.C * this.esc, x = Math.floor((px - this.ox) / C), y = Math.floor((py - this.oy) / C);
      const s = st.exp.d.salas.find(s => s.estado !== 'desconhecida' && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
      if (!s || s.id === st.exp.sala) return;
      if (!E.podeMover(st)) { $('#narr').insertAdjacentHTML('afterbegin', `<p class="info">Agora não podes sair daqui. Usa as ações em baixo.</p>`); return; }
      executar({ tipo: 'mover', alvo: s.id });
    },

    /* --- camada fixa: chão, paredes, portas e objetos --- */
    construir() {
      const d = st.exp.d, C = this.C, cv = this.est;
      cv.width = d.W * C; cv.height = (d.H + 1) * C;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#14181d'; ctx.fillRect(0, 0, cv.width, cv.height);
      // pedra bruta à volta (textura escura)
      ctx.globalAlpha = .18;
      if (IMG.fl6.complete) for (let x = 0; x < d.W; x++) for (let y = 0; y < d.H; y++) if (hash(x, y) % 3 === 0) ctx.drawImage(IMG.fl6, x * C, y * C, C, C);
      ctx.globalAlpha = 1;

      const chao = new Map();
      d.salas.forEach(s => { if (s.estado === 'explorada') for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) chao.set(x + ',' + y, 'sala'); });
      d.arestas.forEach(e => { if (e.conhecida) e.cel.forEach(([x, y]) => { if (!chao.has(x + ',' + y)) chao.set(x + ',' + y, 'corr'); }); });
      const tem = (x, y) => chao.has(x + ',' + y);

      // salas por explorar: nevoeiro
      d.salas.forEach(s => {
        if (s.estado !== 'descoberta') return;
        ctx.globalAlpha = .35;
        for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) if (IMG.fog.complete) ctx.drawImage(IMG.fog, x * C, y * C, C, C);
        ctx.globalAlpha = 1;
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(169,176,185,.55)'; ctx.lineWidth = 2;
        ctx.strokeRect(s.x * C + 3, s.y * C + 3, s.w * C - 6, s.h * C - 6); ctx.setLineDash([]);
        const c = Gen.centro(s);
        ctx.fillStyle = 'rgba(236,230,216,.6)'; ctx.font = `${C * 1.2}px ${getComputedStyle(document.body).getPropertyValue('--fonte-t')}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', (c.x + .5) * C, (c.y + .5) * C);
      });

      // chão em pedra
      chao.forEach((tipo, k) => {
        const [x, y] = k.split(',').map(Number);
        const img = IMG[FL[hash(x, y) % FL.length]];
        if (img.complete) ctx.drawImage(img, x * C, y * C, C, C);
        if (tipo === 'corr') { ctx.fillStyle = 'rgba(10,12,16,.22)'; ctx.fillRect(x * C, y * C, C, C); }
      });
      // sombra junto às paredes
      chao.forEach((_, k) => {
        const [x, y] = k.split(',').map(Number);
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        if (!tem(x, y - 1)) ctx.fillRect(x * C, y * C, C, C * .22);
        if (!tem(x - 1, y)) ctx.fillRect(x * C, y * C, C * .14, C);
      });
      // paredes laterais e de baixo
      const W1 = C * .2;
      chao.forEach((_, k) => {
        const [x, y] = k.split(',').map(Number);
        ctx.fillStyle = '#4f535b';
        if (!tem(x - 1, y)) ctx.fillRect(x * C - W1, y * C - W1, W1, C + W1 * 2);
        if (!tem(x + 1, y)) ctx.fillRect((x + 1) * C, y * C - W1, W1, C + W1 * 2);
        if (!tem(x, y + 1)) { ctx.fillRect(x * C - W1, (y + 1) * C, C + W1 * 2, W1); ctx.fillStyle = '#6a6e76'; ctx.fillRect(x * C - W1, (y + 1) * C, C + W1 * 2, 2); }
      });
      // paredes de cima com face (efeito 2.5D)
      chao.forEach((_, k) => {
        const [x, y] = k.split(',').map(Number);
        if (tem(x, y - 1)) return;
        const fy = y * C - C * .55;
        const g = ctx.createLinearGradient(0, fy, 0, y * C); g.addColorStop(0, '#8b8e95'); g.addColorStop(1, '#5c6068');
        ctx.fillStyle = g; ctx.fillRect(x * C - (tem(x - 1, y) ? 0 : W1), fy, C + (tem(x - 1, y) ? 0 : W1) + (tem(x + 1, y) ? 0 : W1), C * .55);
        ctx.strokeStyle = 'rgba(40,43,49,.6)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x * C, fy + C * .27); ctx.lineTo((x + 1) * C, fy + C * .27);
        const o = (x % 2) * C * .5; ctx.moveTo(x * C + C * .25 + o * .5, fy); ctx.lineTo(x * C + C * .25 + o * .5, fy + C * .27);
        ctx.moveTo(x * C + C * .7 - o * .4, fy + C * .27); ctx.lineTo(x * C + C * .7 - o * .4, y * C);
        ctx.stroke();
        ctx.fillStyle = '#a5a8ae'; ctx.fillRect(x * C - (tem(x - 1, y) ? 0 : W1), fy - 3, C + (tem(x - 1, y) ? 0 : W1) + (tem(x + 1, y) ? 0 : W1), 3);
      });

      // portas
      d.arestas.forEach(e => {
        if (!e.conhecida || e.tipo === 'arco') return;
        e.portas.forEach(p => {
          const hor = p.lado === 'n' || p.lado === 's';
          const bx = p.lado === 'w' ? p.x * C : p.lado === 'e' ? (p.x + 1) * C : (p.x + .5) * C;
          const by = p.lado === 'n' ? p.y * C : p.lado === 's' ? (p.y + 1) * C : (p.y + .5) * C;
          ctx.save(); ctx.translate(bx, by); if (!hor) ctx.rotate(Math.PI / 2);
          if (e.tipo === 'secreta') {
            ctx.setLineDash([4, 3]); ctx.strokeStyle = '#d8aa3c'; ctx.lineWidth = 2; ctx.strokeRect(-C * .5, -C * .16, C, C * .32); ctx.setLineDash([]);
          } else {
            if (IMG.door.complete) ctx.drawImage(IMG.door, -C * .55, -C * .2, C * 1.1, C * .4);
            if (e.tipo === 'trancada' && !e.aberta) {
              ctx.rotate(hor ? 0 : -Math.PI / 2);
              ctx.fillStyle = '#d8aa3c'; ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(0, -C * .1, C * .1, Math.PI, 0); ctx.stroke(); ctx.fillRect(-C * .13, -C * .1, C * .26, C * .2); ctx.strokeRect(-C * .13, -C * .1, C * .26, C * .2);
            }
          }
          ctx.restore();
        });
      });

      // objetos nas salas exploradas
      const fonte = `${C * .6}px Georgia, serif`;
      d.salas.forEach(s => {
        if (s.estado !== 'explorada') return;
        const cantos = [[s.x, s.y + s.h - 1], [s.x + s.w - 1, s.y + s.h - 1], [s.x + s.w - 1, s.y], [s.x, s.y]];
        let k = 0; const prox = () => cantos[k++ % 4];
        if (s.id === d.inicio && IMG.ladder.complete) { const [x, y] = [s.x, s.y]; ctx.drawImage(IMG.ladder, x * C + 2, y * C + 2, C - 4, C - 4); k = 0; cantos.push(cantos.shift()); }
        if (s.itens.length && IMG.chest.complete) { const [x, y] = prox(); ctx.drawImage(IMG.chest, x * C + C * .16, y * C + C * .12, C * .68, C * .74); }
        if (s.armadilha && IMG.spikes.complete) { const c = Gen.centro(s); ctx.globalAlpha = .9; ctx.drawImage(IMG.spikes, (c.x + (s.w > 3 ? 1 : 0)) * C + C * .2, (c.y - (s.h > 3 ? 1 : 0)) * C + C * .1, C * .6, C * .8); ctx.globalAlpha = 1; }
        const marca = (icone, cor, apagado) => { const [x, y] = prox(); ctx.imageSmoothingEnabled = true; CP.Fichas.marca(ctx, (x + .5) * C, (y + .5) * C, C * .9, icone, cor, apagado); ctx.imageSmoothingEnabled = false; };
        if (s.mec && IMG.trapdoor.complete) {
          if (s.mec.resolvido) { const [x, y] = prox(); ctx.drawImage(IMG.trapdoor, x * C + 3, y * C + 3, C - 6, C - 6); }
          else marca('engrenagem', '#e0b84e');
        }
        if (s.restos) marca('ossos', '#e6dcc4');
        if (s.pista !== undefined) marca('pergaminho', '#f0cf7a');
        else if (s.inscricao) marca('runa', '#9fc3e0', s.inscricao.lida);
        ctx.fillStyle = 'rgba(236,230,216,.35)'; ctx.font = `${C * .34}px Georgia, serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(E.nomeSala(s), s.x * C + 3, (s.y + s.h) * C - 4);
      });
      // tochas: uma por sala explorada, na parede de cima
      this.tochas = d.salas.filter(s => s.estado === 'explorada' && s.w >= 3).map(s => ({ x: (s.x + 1 + (hash(s.x, s.y) % (s.w - 2 || 1)) + .5) * C, y: s.y * C - C * .2, f: hash(s.y, s.x) % 100 }));
      this.sujo = false;
    },

    /* --- cada fotograma: luz, fichas, partículas --- */
    frame(t, dt) {
      if (!st || !st.exp || !this.w || $('#ecra-exp').hidden) return;
      if (this.sujo) this.construir();
      const ctx = this.ctx, C = this.C, d = st.exp.d, esc = this.esc, mov = !reduzido();
      // deslizar a câmara e o herói
      if (this.destino) {
        this.ox += (this.destino.ox - this.ox) * Math.min(1, dt * 6); this.oy += (this.destino.oy - this.oy) * Math.min(1, dt * 6);
        if (Math.abs(this.destino.ox - this.ox) < .5 && Math.abs(this.destino.oy - this.oy) < .5) this.destino = null;
      }
      const alvo = this.alvoHeroi();
      if (!this.heroi) this.heroi = { ...alvo };
      this.heroi.x += (alvo.x - this.heroi.x) * Math.min(1, dt * 8); this.heroi.y += (alvo.y - this.heroi.y) * Math.min(1, dt * 8);
      const fl = mov ? Math.sin(t / 90) * .03 + Math.sin(t / 37) * .02 : 0;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#0e1115'; ctx.fillRect(0, 0, this.w, this.h);
      ctx.save(); ctx.translate(this.ox, this.oy); ctx.scale(esc, esc);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.est, 0, 0);

      // tochas
      for (const tc of this.tochas) {
        if (!IMG.fire.complete) break;
        ctx.save(); ctx.translate(tc.x, tc.y);
        if (mov && Math.floor((t + tc.f * 37) / 160) % 2) ctx.scale(-1, 1);
        ctx.drawImage(IMG.fire, -C * .22, -C * .5, C * .44, C * .8); ctx.restore();
      }
      // criaturas
      ctx.imageSmoothingEnabled = true;
      d.salas.forEach(s => {
        if (s.estado !== 'explorada') return;
        for (const { m, x, y } of this.posMonstros(s)) CP.Fichas.monstro(ctx, m, x, y, C * (m.chefe ? .5 : .42), t, mov);
      });
      // herói
      const h = this.heroi;
      CP.Fichas.heroi(ctx, st.hero.classe, COR[st.hero.classe], h.x, h.y, C * .46, t, mov);
      ctx.restore();

      // luz: escuridão com buracos (herói e tochas)
      const L = this.luz.getContext('2d'), k = this.dpr;
      L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, this.luz.width, this.luz.height);
      L.fillStyle = 'rgba(6,8,12,.74)'; L.fillRect(0, 0, this.luz.width, this.luz.height);
      L.globalCompositeOperation = 'destination-out';
      const furo = (wx, wy, raio, forca) => {
        const sx = (this.ox + wx * esc) * k, sy = (this.oy + wy * esc) * k, R = raio * C * esc * k;
        const g = L.createRadialGradient(sx, sy, R * .15, sx, sy, R);
        g.addColorStop(0, `rgba(0,0,0,${forca})`); g.addColorStop(.6, `rgba(0,0,0,${forca * .6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g; L.fillRect(sx - R, sy - R, R * 2, R * 2);
      };
      furo(h.x, h.y, 5.2 * (1 + fl), 1);
      for (const tc of this.tochas) furo(tc.x, tc.y + C, 3 * (1 + fl * 1.5), .75);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.luz, 0, 0);
      // brilho quente
      ctx.globalCompositeOperation = 'lighter';
      const brilho = (wx, wy, raio, a) => {
        const sx = (this.ox + wx * esc) * k, sy = (this.oy + wy * esc) * k, R = raio * C * esc * k;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R); g.addColorStop(0, `rgba(255,170,80,${a})`); g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
      };
      brilho(h.x, h.y, 3.2, .1 + fl);
      for (const tc of this.tochas) brilho(tc.x, tc.y, 1.8, .16 + fl);
      ctx.globalCompositeOperation = 'source-over';

      // partículas
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.parts = this.parts.filter(p => (p.t += dt) < p.vida);
      for (const p of this.parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
        ctx.globalAlpha = 1 - p.t / p.vida; ctx.fillStyle = p.cor;
        ctx.beginPath(); ctx.arc(this.ox + p.x * esc, this.oy + p.y * esc, p.r * Math.max(.7, esc), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // réguas de coordenadas
      const Cs = C * esc;
      if (Cs >= 14) {
        ctx.fillStyle = 'rgba(20,23,27,.82)'; ctx.fillRect(0, 0, this.w, 16); ctx.fillRect(0, 0, 22, this.h);
        ctx.fillStyle = '#a9b0b9'; ctx.font = '11px Alegreya Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let x = 0; x < d.W; x++) { const px = this.ox + (x + .5) * Cs; if (px > 22 && px < this.w) ctx.fillText(Gen.letra(x), px, 8); }
        for (let y = 0; y < d.H; y++) { const py = this.oy + (y + .5) * Cs; if (py > 16 && py < this.h) ctx.fillText(String(y + 1), 11, py); }
      }
    }
  };

  /* ================= Folhas ================= */
  function abrirFolha(tipo) {
    let h = '';
    if (tipo === 'mochila') {
      const he = st.hero, a = CP.ITENS[he.arma];
      h = `<h2>Mochila</h2>${slots(he)}
        <p class="p2">${a.nome} (dano ${a.dano}) · ${he.armadura ? CP.ITENS[he.armadura].nome : 'sem armadura'}${he.escudo ? ' · escudo' : ''}</p>
        <div class="chips" style="margin:6px 0">${chipsDados(he)}</div>` + listaMochila(!!st.exp);
      if (st.exp && st.exp.combate) h += `<p class="p2">Em combate, usar um objeto gasta a tua vez.</p>`;
    } else if (tipo === 'registo') {
      const x = st.exp, info = E.info(st);
      h = `<h2>${esc(info.titulo)}</h2><p><b>Objetivo:</b> ${esc(info.objetivo)}${x.objetivo ? ' (cumprido)' : ''}</p><h3>Pistas</h3>` +
        (x.pistas.length ? x.pistas.map(p => `<p class="eco">${esc(p)}</p>`).join('') : `<p class="vazio">Ainda não encontraste pistas.</p>`) +
        `<h3>Registo</h3><div class="narr" style="padding:0">${x.registo.slice(-80).map(linhaEvento).join('')}</div>`;
    } else if (tipo === 'regras') {
      const cor = st ? COR[st.hero.classe] : '#7a6a5a';
      h = `<h2>Regras</h2><div class="regras">
        <p><b>Os teus dados:</b> cada atributo é um dado. Quanto melhor o atributo, maior o dado.</p>
        <div class="tabela-d">${[4, 6, 8, 10, 12].map(n => `<div>${dadoSVG(n, null, cor)}d${n}</div>`).join('')}</div>
        <p><b>Teste:</b> lanças o dado do atributo e somas o bónus do equipamento. Precisas de 4 ou mais; a dificuldade e as defesas das criaturas aumentam o número. Um 1 natural falha sempre. Tirar o valor máximo num ataque causa +1 de dano.</p>
        <p><b>Vantagem:</b> lanças dois dados iguais e ficas com o melhor.</p>
        <p><b>Combate:</b> atacas e depois a criatura ataca; defendes-te com Agilidade e a armadura soma ao dado. Podes fugir com Agilidade.</p>
        <p><b>Criaturas a dormir:</b> podes atacar de surpresa (com vantagem e sem resposta), esgueirar-te ou recuar.</p>
        <p><b>Perigo:</b> sobe com barulho, falhas, descansos e salas novas. Aos 3 há um presságio; aos 6 aparece uma criatura errante e o perigo volta a 0.</p>
        <p><b>Investigar:</b> uma tentativa por sala. Revela tesouros e passagens secretas.</p>
        <p><b>Mapa:</b> toca numa sala conhecida para ires até lá. Arrasta para mover; usa dois dedos ou os botões para o zoom.</p>
        <p><b>Retirada:</b> sai pela entrada para guardar o que encontraste. A masmorra fica como a deixaste.</p>
        <p><b>Derrota:</b> com 0 PV acordas na aldeia, sem metade do ouro e sem os tesouros que levavas.</p>
        <p><b>Experiência:</b> ganha-se com pistas, descobertas e missões. Cada nível sobe um dado (d4 → d6 → … → d12) e dá +2 de vida máxima.</p></div>`;
    } else if (tipo === 'campanha') {
      h = `<h2>Campanha</h2><p class="p2">A campanha grava-se sozinha neste dispositivo. Para a levares para outro, copia o código ou descarrega o ficheiro.</p>
        <textarea id="tx-exp" readonly>${esc(CP.Save.exportar(st))}</textarea>
        <div class="loja"><button class="bt" data-copiar>Copiar código</button><button class="bt" data-descarregar>Descarregar ficheiro</button></div>
        <h3>Importar</h3><p class="p2">Cola um código ou escolhe um ficheiro. Substitui a campanha atual.</p>
        ${formImportar()}
        <h3>Nova campanha</h3><button class="bt" data-nova>Apagar esta campanha e começar outra</button>`;
    } else if (tipo === 'importar') h = `<h2>Importar campanha</h2>${formImportar()}`;
    else if (tipo === 'menu') {
      const naExp = st && st.exp;
      h = `<h2>Menu</h2><div class="loja" style="grid-template-columns:1fr">
        <button class="bt" data-fechar><span>Continuar a jogar</span></button>
        ${naExp ? `<button class="bt" data-desistir><span>Desistir desta masmorra</span><small>Voltas já à aldeia com o que encontraste. A missão sai do quadro e a reputação desce 1.</small></button>` : ''}
        <button class="bt" data-folha="regras"><span>Regras</span></button>
        <button class="bt" data-som><span>Som: ${Som.ligado() ? 'ligado' : 'desligado'}</span></button>
        <button class="bt" data-folha="campanha"><span>Exportar ou importar campanha</span></button>
        <button class="bt" data-nova><span>Nova campanha</span><small>Apaga a campanha atual e volta à criação do aventureiro.</small></button></div>`;
    }
    $('#folha-in').innerHTML = h;
    $('#folha').hidden = false;
  }
  const formImportar = () => `<textarea id="tx-imp" placeholder="Cola aqui o código da campanha"></textarea>
    <div class="loja"><input type="file" id="fi-imp" accept=".json,application/json"><button class="bt" data-importar>Importar</button></div><p id="imp-msg" class="p2"></p>`;
  function fecharFolha() { $('#folha').hidden = true; }
  function importar(texto) {
    try {
      st = CP.Save.importar(texto); CP.Save.guardar(st); ultimos = [{ t: 'ok', s: 'Campanha importada.' }];
      fecharFolha(); render(); if (st.ecra === 'expedicao') { Mapa.ajustar(); Mapa.sujo = true; Mapa.centrar(true, true); }
    } catch (e) { $('#imp-msg').textContent = e.message.startsWith('Este') ? e.message : 'O código não é válido. Confirma que copiaste tudo.'; }
  }

  /* ================= Eventos ================= */
  document.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const D = b.dataset;
    if (D.classe) { classeEscolhida = D.classe; Som.desbloquear(); Som.tocar('pick'); renderCriar(); return; }
    if (b.id === 'bt-comecar') return comecar();
    if (b.id === 'bt-importar-ini') return abrirFolha('importar');
    if (b.id === 'bt-som' || D.som !== undefined) { const on = Som.alternar(); if (on) { Som.tocar('pick'); if (st && st.ecra === 'expedicao') Som.ambiente(true); } if (st) { if (st.ecra === 'expedicao') renderEstado(); else render(); } if (!$('#folha').hidden && D.som !== undefined) abrirFolha('menu'); return; }
    if (D.acao !== undefined) return executar(acoesAtuais[+D.acao]);
    if (D.partir) return executar({ tipo: 'partir', mid: D.partir });
    if (D.abandonar) { if (confirm('Desistir desta missão? A reputação na aldeia desce.')) executar({ tipo: 'abandonar', mid: D.abandonar }); return; }
    if (D.nivel) return executar({ tipo: 'nivel', attr: D.nivel });
    if (D.descansar !== undefined) return executar({ tipo: 'descansar_aldeia' });
    if (D.comprar) { Som.tocar('coin'); return executar({ tipo: 'comprar', item: D.comprar }); }
    if (D.vender) { Som.tocar('coin'); return executar({ tipo: 'vender', i: +D.vender }); }
    if (D.usar) { fecharFolha(); return executar({ tipo: 'usar', item: D.usar }); }
    if (D.largar) { fecharFolha(); return executar({ tipo: 'largar', i: +D.largar }); }
    if (D.voltar !== undefined) return executar({ tipo: 'voltar' });
    if (D.folha) return abrirFolha(D.folha);
    if (D.fechar !== undefined) return fecharFolha();
    if (D.copiar !== undefined) { const t = $('#tx-exp'); t.select(); try { navigator.clipboard.writeText(t.value).catch(() => document.execCommand('copy')); } catch (e) { document.execCommand('copy'); } b.textContent = 'Copiado'; return; }
    if (D.descarregar !== undefined) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([CP.Save.exportar(st)], { type: 'application/json' }));
      a.download = `cronicas-${st.hero.nome.toLowerCase().replace(/\s+/g, '-')}.json`; a.click(); return;
    }
    if (D.importar !== undefined) { const f = $('#fi-imp').files[0]; if (f) f.text().then(importar); else importar($('#tx-imp').value); return; }
    if (D.desistir !== undefined) { if (confirm('Desistir desta masmorra? Voltas à aldeia e a reputação desce.')) { fecharFolha(); Som.ambiente(false); executar({ tipo: 'desistir' }); } return; }
    if (D.nova !== undefined) { if (confirm('Apagar a campanha atual? Esta ação não se desfaz.')) { CP.Save.apagar(); st = null; Som.ambiente(false); fecharFolha(); render(); } return; }
  });
  $('#folha').addEventListener('click', e => { if (e.target.id === 'folha') fecharFolha(); });
  $('#dado').addEventListener('click', () => { saltar = true; });
  $('#narr').addEventListener('click', () => { if (ocupado) saltar = true; });

  /* ================= Arranque ================= */
  Mapa.init();
  st = CP.Save.carregar();
  render();
  if (st && st.ecra === 'expedicao') requestAnimationFrame(() => { Mapa.ajustar(); Mapa.sujo = true; Mapa.centrar(true, true); });
  // o som ambiente só pode começar depois de um toque
  document.addEventListener('pointerdown', () => { if (st && st.ecra === 'expedicao') Som.ambiente(true); }, { once: true });
})(window);
