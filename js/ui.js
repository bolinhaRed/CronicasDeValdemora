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
  // retratos e ícones (assets embutidos em js/retratos.js)
  const RET_CLASSE = { guerreiro: 'warrior', ladrao: 'rogue', explorador: 'ranger', mistico: 'mage' };
  const RET_MONSTRO = { esqueleto: 'skeleton', goblin: 'goblin', gorm: 'goblin', lobo: 'wolf' };
  const RET_CLIENTE = { sinos: 'bard', reliquia: 'cleric', mineiros: 'knight' };
  const ICONE_ITEM = {
    espada: 'sword', espadalonga: 'sword', punhal: 'knife', punhalfino: 'knife', machado: 'axe', cajado: 'rod', cajadorunico: 'rod',
    manto: 'shield', gibao: 'shield', cota: 'shield', escudo: 'shield', pocao: 'potion', gazua: 'key', oleo: 'lantern',
    broche: 'purpleHeart', calice: 'crown', anel: 'ruby', idolo: 'diamond',
    badalo: 'horn', diario: 'book', pepita: 'money', recibo: 'parchment', pedra: 'wall'
  };
  const icone = id => CP.OBJ[ICONE_ITEM[id]] ? `<img class="px ic" src="${CP.OBJ[ICONE_ITEM[id]]}" alt="">` : '';
  const retrato = (quem, expr) => (CP.RET[quem] && (CP.RET[quem][expr] || CP.RET[quem].neutral)) || '';
  // imagens para o canvas
  const IMG_RET = {};
  const imgRet = (quem, expr) => {
    const k = quem + '-' + expr; if (IMG_RET[k]) return IMG_RET[k];
    const i = new Image(); i.onload = () => { Mapa.sujo = true; }; i.src = retrato(quem, expr); return (IMG_RET[k] = i);
  };
  const IMG_OBJ = {};
  const imgObj = n => { if (IMG_OBJ[n]) return IMG_OBJ[n]; const i = new Image(); i.onload = () => { Mapa.sujo = true; }; i.src = CP.OBJ[n]; return (IMG_OBJ[n] = i); };

  const exprBase = () => 'neutral';
  const IMG_SPR = {};
  const imgSprite = (classe, anim, f) => { const k = classe + (anim || '') + (f || 0); return IMG_SPR[k] || (IMG_SPR[k] = CP.Spr.imagem(CP.Spr.CLASSE[classe], anim, 96, f)); };
  const tokenHTML = (classe, extra, anim, f) =>
    `<div class="token rt" style="--cor:${COR[classe]}" ${extra || ''}><img class="px" src="${imgSprite(classe, anim, f)}" alt="${CP.CLASSES[classe].nome}"></div>`;

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
    CP.Musica.tocar(!st ? 'inicio' : st.ecra === 'expedicao' ? 'masmorra' : 'aldeia');
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
    let html = `<div class="cena"><canvas id="cena-aldeia" width="384" height="144" aria-label="Aldeia de Corvamonte"></canvas><h2>Região de Corvamonte</h2><button class="bt-menu" data-folha="menu">Menu</button></div>`;
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
      html += `<div class="missao ${emCurso ? 'curso' : ''}" style="--tile:url(${CP.ART[TILE[tpl.tipo]]})"><img class="px tipo" src="${retrato(RET_CLIENTE[tpl.id], emCurso ? 'sad' : 'neutral')}" alt=""><h4>${esc(m.titulo)}</h4>
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

    html += `<h3>Estalagem e mercado</h3><div class="npc"><img class="px" src="${retrato('merchant', M.rep.corvamonte >= 2 ? 'happy' : 'neutral')}" alt=""><p>${M.rep.corvamonte >= 2 ? '«Para ti, amigo, há desconto.»' : '«Olha bem antes de comprares, viajante.»'}</p></div><div class="loja">`;
    html += `<button class="bt" data-descansar ${h.pv >= h.pvMax || h.ouro < 2 ? 'disabled' : ''}><span>Dormir na estalagem</span><small>Recuperas a vida toda</small><span class="p">2 moedas</span></button>`;
    for (const id of E.stockLoja(st)) {
      const it = CP.ITENS[id], p = E.precoLoja(st, id);
      const tem = h.arma === id || h.armadura === id || h.escudo === id;
      const cheio = ['consumivel', 'ferramenta'].includes(it.tipo) && h.mochila.length >= CP.MOCHILA;
      const det = it.tipo === 'arma' ? `Dano ${it.dano}${it.atk ? ', +' + it.atk + ' ao dado' : ''}, usa ${CP.ATRIB[it.attr]}` : it.def ? `Defesa +${it.def}` : (it.desc || '');
      html += `<button class="bt" data-comprar="${id}" ${tem || cheio || h.ouro < p ? 'disabled' : ''}><span>${icone(id)}${it.nome}</span><small>${det}${tem ? ' · já tens' : ''}</small><span class="p">${p} moedas</span></button>`;
    }
    h.mochila.forEach((id, i) => { const it = CP.ITENS[id]; if (it.valor) html += `<button class="bt" data-vender="${i}"><span>${icone(id)}Vender ${it.nome}</span><small>Tesouro</small><span class="p">+${it.valor} moedas</span></button>`; });
    html += `</div>`;

    html += `<h3>Mochila</h3>` + slots(h) + listaMochila(false);
    html += `<h3>Campanha</h3><div class="loja"><button class="bt" data-folha="campanha"><span>Exportar ou importar</span></button>
      <button class="bt" data-folha="regras"><span>Regras</span></button>
      <button class="bt" data-folha="menu"><span>Som e música</span></button></div>`;
    $('#aldeia').innerHTML = html;
  }

  const slots = h => `<div class="slots">${[...Array(CP.MOCHILA)].map((_, i) => i < h.mochila.length ? `<i class="c" title="${CP.ITENS[h.mochila[i]].nome}">${icone(h.mochila[i])}</i>` : '<i></i>').join('')}</div>`;
  function listaMochila(naExp) {
    const h = st.hero;
    if (!h.mochila.length) return `<p class="vazio">Mochila vazia.</p>`;
    return h.mochila.map((id, i) => {
      const it = CP.ITENS[id];
      const usar = id === 'pocao' && h.pv < h.pvMax ? `<button class="bt" data-usar="${id}">Usar</button>` : '';
      const largar = naExp ? `<button class="bt" data-largar="${i}">Largar</button>` : (it.tipo === 'missao' ? '' : `<button class="bt" data-largar="${i}">Deitar fora</button>`);
      return `<div class="item">${icone(id)}<div class="it-t">${it.nome}<small>${it.desc || (it.valor ? 'Vale ' + it.valor + ' moedas.' : '')}</small></div><div class="bts">${usar}${largar}</div></div>`;
    }).join('');
  }

  /* ================= Cena da aldeia (tileset da fortaleza) ================= */
  const Cena = {
    fixa: null,
    construir() {
      const I = CP.Spr.IMG, c = document.createElement('canvas'); c.width = 384; c.height = 144;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const a = n => I['aldeia/' + n];
      const pe = (n, px, py) => { const i = a(n); if (i) x.drawImage(i, Math.round(px - i.width / 2), Math.round(py - i.height)); };
      for (let i = 0; i < 24; i++) for (let j = 0; j < 9; j++) if (a('relva')) x.drawImage(a('relva'), i * 16, j * 16);
      for (let i = 0; i < 24; i++) for (const j of [6, 7]) if (a('terra')) x.drawImage(a('terra'), i * 16, j * 16);
      for (const j of [3, 4, 5]) for (const i of [11, 12]) if (a('terra')) x.drawImage(a('terra'), i * 16, j * 16);
      for (let i = 0; i < 12; i++) if (a('muro')) x.drawImage(a('muro'), i * 32, 0);
      x.fillStyle = '#16141f'; x.fillRect(180, 22, 24, 26); pe('arco', 192, 48);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 48, 384, 4);
      [['flor1', 30, 120], ['flor2', 90, 132], ['flor3', 150, 92], ['flor1', 225, 132], ['flor2', 320, 70], ['flor3', 360, 128], ['pedra1', 60, 100], ['pedra2', 345, 90]].forEach(([n, px, py]) => pe(n, px, py));
      pe('cerca1', 82, 78); pe('cerca2', 104, 80); pe('caixa', 128, 62); pe('barril', 145, 64); pe('saco', 240, 64); pe('barril', 256, 66);
      pe('arvore1', 18, 98); pe('arvore3', 50, 82); pe('arvore2', 30, 140); pe('pinheiros', 360, 96); pe('arvore1', 372, 148); pe('arvore3', 330, 140);
      this.fixa = c;
    },
    frame(t) {
      const cv = document.getElementById('cena-aldeia'); if (!cv || !CP.Spr.IMG['aldeia/relva']) return;
      if (!this.fixa) this.construir();
      const x = cv.getContext('2d'), I = CP.Spr.IMG, mov = !reduzido(); x.imageSmoothingEnabled = false;
      x.drawImage(this.fixa, 0, 0);
      const quadro = (img, n, f, px, py) => { if (!img) return; const w = img.width / n; x.drawImage(img, (f % n) * w, 0, w, img.height, Math.round(px - w / 2), Math.round(py - img.height), w, img.height); };
      const tq = mov ? Math.floor(t / 110) : 0;
      quadro(I['aldeia_anim/tocha'], 4, tq, 160, 36); quadro(I['aldeia_anim/tocha'], 4, tq + 2, 224, 36);
      quadro(I['aldeia_anim/fogueira'], 5, tq, 286, 112);
      const S = CP.Spr, tt = mov ? t : 0;
      S.personagem(x, 'guarda', 'Idle', 'S', tt, 160, 76, 1, false);
      S.personagem(x, 'aldea', 'Idle', 'S', tt + 300, 258, 116, 1, false);
      S.personagem(x, 'aldeao', 'Idle', 'S', tt + 700, 314, 118, 1, true);
      if (st) S.personagem(x, S.CLASSE[st.hero.classe], 'Idle', 'D', tt, 196, 84, 1, false);
      // luz de fim de tarde e brilho das chamas
      x.fillStyle = 'rgba(255,160,80,.08)'; x.fillRect(0, 0, 384, 144);
      x.globalCompositeOperation = 'lighter';
      const fl = mov ? Math.sin(t / 90) * .03 : 0;
      for (const [px, py, r] of [[286, 100, 46], [160, 28, 22], [224, 28, 22]]) {
        const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(255,170,80,${.22 + fl})`); g.addColorStop(1, 'rgba(255,170,80,0)');
        x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
      }
      x.globalCompositeOperation = 'source-over';
      const v = x.createRadialGradient(192, 72, 120, 192, 72, 230); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,20,.55)');
      x.fillStyle = v; x.fillRect(0, 0, 384, 144);
    }
  };

  /* ================= Livro de pistas (Magic Book) ================= */
  const Livro = { t0: 0, ativo: false,
    abrir() { this.t0 = performance.now(); this.ativo = true; },
    frame(t) {
      const cv = document.getElementById('livro-cv'); if (!cv) { this.ativo = false; return; }
      const img = CP.Spr.IMG.livro; if (!img) return;
      const f = reduzido() ? 11 : Math.min(11, Math.floor((t - this.t0) / 70));
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 272, 272);
      x.drawImage(img, (f % 4) * 272, Math.floor(f / 4) * 272, 272, 272, 0, 0, 272, 272);
      const pags = document.querySelector('.livro .pags'); if (pags && f >= 11) pags.classList.add('on');
    }
  };

  /* ================= Expedição ================= */
  function renderEstado(pvAntes) {
    const h = st.hero, x = st.exp; if (!x) return;
    if ($('#st-token').tagName !== 'CANVAS') $('#st-token').outerHTML = `<canvas id="st-token" class="token rt" width="96" height="96" style="--cor:${COR[h.classe]}"></canvas>`;
    else $('#st-token').style.setProperty('--cor', COR[h.classe]);
    renderDuelo();
    $('#st-nome').textContent = h.nome;
    $('#st-ouro').textContent = h.ouro;
    const pct = 100 * h.pv / h.pvMax;
    if (pvAntes != null && pvAntes > h.pv) $('#st-pvf').style.width = (100 * pvAntes / h.pvMax) + '%';
    $('#st-pv').style.width = pct + '%';
    requestAnimationFrame(() => { $('#st-pvf').style.width = pct + '%'; });
    $('#st-pvt').textContent = `${h.pv}/${h.pvMax} PV`;
    $('#st-dados').innerHTML = chipsDados(h);
    $('#st-perigo').innerHTML = [1, 2, 3, 4, 5, 6].map(i => `<i class="${i <= x.perigo ? 'on' : ''} ${x.perigo >= 4 ? 'alto' : ''}"></i>`).join('');
    const somOn = Som.ligado() || CP.Musica.ligada();
    $('#bt-som').textContent = somOn ? '♪' : '×';
    $('#bt-som').setAttribute('aria-label', somOn ? 'Desligar som e música' : 'Ligar som e música');
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

  function iconeAcao(a) {
    const n = a.tipo === 'ritual' ? { luz: 3, cura: 14, banir: 4 }[a.r]
      : { fugir: 17, esgueirar: 16, investigar: 2, descansar: 15, atacar: 20, atacar_chefe: 20, surpresa: 20 }[a.tipo] || (a.tipo === 'usar' && a.item === 'oleo' ? 1 : 0);
    return n && CP.KIT.feitico[n] ? `<img class="px fi" src="${CP.KIT.feitico[n]}" alt="">` : '';
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
      `<button class="bt ${a.grupo || ''}" data-acao="${i}" ${a.off ? 'disabled' : ''}>${iconeAcao(a)}${esc(a.rotulo)}${a.off ? ` <small>(${a.motivo})</small>` : ''}</button>`).join('');
    Mapa.sujo = true;
  }

  /* ================= Barra de combate (retratos frente a frente) ================= */
  const IMG_MED = {};
  function inimigoAtual() {
    const x = st && st.exp, s = x && x.d.salas[x.sala];
    return s && (x.combate || x.confronto) ? (s.monstros.find(o => o.pv > 0 && (o.acordado || o.chefe)) || s.monstros.find(o => o.pv > 0)) : null;
  }
  function renderDuelo() {
    const el = $('#duelo'); if (!el) return;
    const m = inimigoAtual();
    if (!m) { el.hidden = true; return; }
    const x = st.exp;
    const dir = CP.Spr.temSprite(m.tipo) ? `<canvas id="duelo-m" width="96" height="96"></canvas>`
      : `<img src="${IMG_MED[m.tipo + m.chefe] || (IMG_MED[m.tipo + m.chefe] = CP.Fichas.imagemMonstro(m, 64))}" alt="">`;
    el.hidden = false;
    el.innerHTML = `<div class="d-l"><canvas id="duelo-h" width="96" height="96"></canvas></div>
      <div class="d-m"><b>${esc(m.nome)}</b><div class="d-pv">${[...Array(m.pvMax)].map((_, i) => `<i class="${i < m.pv ? 'on' : ''}"></i>`).join('')}</div>
      <small>${x.confronto ? 'Ainda não atacou' : 'Em combate'}${m.morto ? ' · morto-vivo' : ''}</small></div>
      <div class="d-r ${m.chefe ? 'chefe' : ''}">${dir}</div>`;
  }

  /* ================= Resumo ================= */
  function renderResumo() {
    const r = st.resumo;
    const tit = { sucesso: 'Missão cumprida', retirada: 'Retirada', derrota: 'Derrota' }[r.tipo];
    const ex = { sucesso: 'happy', retirada: 'neutral', derrota: 'hurt' }[r.tipo];
    $('#resumo').innerHTML = `<div class="resumo-ban ${r.tipo}"><img class="px ret-g" src="${imgSprite(st.hero.classe, ex === 'hurt' ? 'Hurt' : 'Idle', ex === 'hurt' ? 1 : 0)}" alt=""><h2>${tit}</h2><p class="p2">${esc(r.titulo)}</p></div>` +
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

  const REACAO = { hurt: 'hurt', trap: 'surprised', reveal: 'surprised', boss: 'surprised', growl: 'angry', miss: 'angry', omen: 'surprised',
    coin: 'happy', pick: 'happy', kill: 'happy', win: 'happy', peace: 'happy', heal: 'happy', block: 'happy', door: 'neutral', lose: 'sad' };
  function animarEvento(e) {
    const x = st.exp, s = x.d.salas[x.sala], ps = Mapa.posMonstros(s, true);
    const vivo = ps.find(p => p.m.pv > 0 && (p.m.acordado || p.m.chefe)) || ps.find(p => p.m.pv > 0);
    const emCombate = x.combate || x.confronto || ['hit', 'miss', 'kill', 'block'].includes(e.fx);
    if (['hit', 'miss', 'fire'].includes(e.fx)) Mapa.animar('heroi', 'Attack');
    if (e.fx === 'hurt') { Mapa.animar('heroi', 'Hurt'); if (emCombate && vivo) Mapa.animar(vivo.key, 'Attack'); }
    if (e.fx === 'block' && vivo) Mapa.animar(vivo.key, 'Attack');
    if ((e.fx === 'hit' || e.fx === 'fire') && vivo) Mapa.animar(vivo.key, 'Hurt');
    if (e.fx === 'kill') {
      Mapa.jaMortos = Mapa.jaMortos || new Set();
      const p = ps.find(p => p.m.pv <= 0 && !p.m.pacificado && !Mapa.jaMortos.has(x.mid + p.key));
      if (p) { Mapa.jaMortos.add(x.mid + p.key); if (CP.Spr.temSprite(p.m.tipo)) Mapa.morrer({ chave: CP.Spr.MONSTRO[p.m.tipo], x: p.x, y: p.y, esc: CP.Spr.ESCALA[p.m.tipo] || 1 }); }
    }
    if (e.fx === 'lose') Mapa.animar('heroi', 'Death');
    renderDuelo();
  }
  function efeito(e) {
    Som.tocar(e.fx);
    if (st && st.exp) animarEvento(e);
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
    heroi: null, parts: [], ultimo: 0, anims: {}, mortes: [],
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
      const ciclo = t => {
        requestAnimationFrame(ciclo); if (t - this.ultimo < 33) return;
        const dt = Math.min(.1, (t - this.ultimo) / 1000); this.ultimo = t; this.frame(t, dt);
        if (!$('#ecra-aldeia').hidden) Cena.frame(t);
        if (!$('#folha').hidden) Livro.frame(t);
      };
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
    posMonstros(s, todos) {
      const c = Gen.centro(s), offs = [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [-1, 0]];
      return s.monstros.map((m, i) => ({ m, key: s.id + '-' + i, x: (c.x + .5 + offs[i % 6][0] * Math.min(1.5, (s.w - 1) / 2)) * this.C, y: (c.y + .6 + offs[i % 6][1] * Math.min(1.2, (s.h - 1) / 2)) * this.C }))
        .filter(p => todos || p.m.pv > 0);
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

    /* --- camada fixa: chão, paredes, portas e objetos (kit CraftPix) --- */
    construir() {
      const d = st.exp.d, C = this.C, cv = this.est, S = CP.Spr, kk = C / 16;
      cv.width = d.W * C; cv.height = (d.H + 1) * C;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1b1a29'; ctx.fillRect(0, 0, cv.width, cv.height);

      const chao = new Map();
      d.salas.forEach(s => { if (s.estado === 'explorada') for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) chao.set(x + ',' + y, 'sala'); });
      d.arestas.forEach(e => { if (e.conhecida) e.cel.forEach(([x, y]) => { if (!chao.has(x + ',' + y)) chao.set(x + ',' + y, 'corr'); }); });
      const eChao = (x, y) => chao.has(x + ',' + y);
      const parede = new Set();
      chao.forEach((_, k) => { const [x, y] = k.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (!eChao(x + dx, y + dy)) parede.add((x + dx) + ',' + (y + dy)); });
      const eParede = (x, y) => parede.has(x + ',' + y);

      // salas por explorar: chão escurecido e contorno
      d.salas.forEach(s => {
        if (s.estado !== 'descoberta') return;
        ctx.globalAlpha = .28;
        for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) S.tile(ctx, 9, 3, x * C, y * C, C);
        ctx.globalAlpha = 1;
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(195,205,221,.45)'; ctx.lineWidth = 2;
        ctx.strokeRect(s.x * C + 3, s.y * C + 3, s.w * C - 6, s.h * C - 6); ctx.setLineDash([]);
        const c = Gen.centro(s);
        ctx.fillStyle = 'rgba(236,230,216,.6)'; ctx.font = `${C * 1.2}px ${getComputedStyle(document.body).getPropertyValue('--fonte-t')}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', (c.x + .5) * C, (c.y + .5) * C);
      });

      // chão
      const PISO = [[9, 3], [9, 3], [9, 3], [9, 3], [9, 3], [2, 7], [2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3], [3, 4]];
      const PADRAO = [[15, 6], [16, 6], [15, 7], [16, 7], [15, 8], [16, 8], [17, 8], [16, 9]];
      chao.forEach((tipo, k) => {
        const [x, y] = k.split(',').map(Number), h = hash(x, y);
        const t = h % 100 < 7 ? PADRAO[h % PADRAO.length] : PISO[h % PISO.length];
        S.tile(ctx, t[0], t[1], x * C, y * C, C);
        if (tipo === 'corr') { ctx.fillStyle = 'rgba(10,10,20,.15)'; ctx.fillRect(x * C, y * C, C, C); }
        if (eParede(x, y - 1)) { ctx.fillStyle = 'rgba(10,10,20,.35)'; ctx.fillRect(x * C, y * C, C, C * .2); }
      });
      // paredes: topo claro, face quando há espaço por baixo, contorno escuro
      const FACE = [[2, 1], [3, 1], [4, 1], [2, 5], [3, 5], [4, 5]];
      parede.forEach(k => {
        const [x, y] = k.split(',').map(Number), h = hash(x, y);
        if (!eParede(x, y + 1)) {
          const t = FACE[h % FACE.length]; S.tile(ctx, t[0], t[1], x * C, y * C, C);
          if (eParede(x, y - 1)) { ctx.fillStyle = '#c3cddd'; ctx.fillRect(x * C, y * C, C, kk * 1.2); }
        } else {
          ctx.fillStyle = '#c3cddd'; ctx.fillRect(x * C, y * C, C, C);
          ctx.fillStyle = '#9aa6bd';
          const o = (h % 2) * C * .5;
          ctx.fillRect(x * C, y * C + C * .48, C, kk); ctx.fillRect(x * C + C * .25 + o * .5, y * C, kk, C * .48); ctx.fillRect(x * C + C * .7 - o * .4, y * C + C * .48, kk, C * .52);
          if (h % 7 === 0) { ctx.fillRect(x * C + C * .2, y * C + C * .2, kk * 2, kk); ctx.fillRect(x * C + C * .2 + kk, y * C + C * .2 + kk, kk * 2, kk); }
        }
      });
      ctx.fillStyle = '#1b1a29';
      parede.forEach(k => {
        const [x, y] = k.split(',').map(Number), L = kk * 1.1;
        if (!eParede(x - 1, y)) ctx.fillRect(x * C, y * C, L, C);
        if (!eParede(x + 1, y)) ctx.fillRect((x + 1) * C - L, y * C, L, C);
        if (!eParede(x, y - 1)) ctx.fillRect(x * C, y * C, C, L);
        if (!eParede(x, y + 1)) ctx.fillRect(x * C, (y + 1) * C - L, C, L);
      });

      // portas (na célula do corredor encostada à sala)
      d.arestas.forEach(e => {
        if (!e.conhecida || e.tipo === 'arco') return;
        const aberta = e.tipo === 'trancada' ? e.aberta && d.salas[e.a].estado === 'explorada' && d.salas[e.b].estado === 'explorada'
          : (e.tipo === 'porta' && d.salas[e.a].estado === 'explorada' && d.salas[e.b].estado === 'explorada');
        e.portas.forEach(p => {
          const hor = p.lado === 'n' || p.lado === 's';
          const cx = (p.x + .5) * C, cy = (p.y + .5) * C;
          if (e.tipo === 'secreta') {
            ctx.setLineDash([4, 3]); ctx.strokeStyle = '#d8aa3c'; ctx.lineWidth = 2;
            ctx.strokeRect(p.x * C + 4, p.y * C + 4, C - 8, C - 8); ctx.setLineDash([]); return;
          }
          if (hor) S.anim(ctx, 'portaH', aberta ? 3 : 0, 20, cx, (p.lado === 'n' ? p.y * C + C * .55 : (p.y + 1) * C + C * .05), kk * .8);
          else S.anim(ctx, 'portaV', aberta ? 3 : 0, 14, cx, (p.y + 1) * C + C * .1, kk * .8);
          if (e.tipo === 'trancada' && !e.aberta) {
            const cad = imgObj('padlock'); if (cad.complete) ctx.drawImage(cad, cx - C * .3, cy - C * .55, C * .6, C * .6);
          }
        });
      });

      // objetos nas salas exploradas
      const DECOR = {
        cripta: [['velas', .8], ['pote', 1], ['pedras', 1], ['ralo', 1], ['velas', .8]],
        mina: [['caixa', 1], ['barril', 1], ['saco', 1], ['madeira', 1], ['pedras', 1]],
        ruinas: [['estante', 1], ['mesa', 1], ['mesaV', 1], ['armas', 1], ['madeira', 1]]
      }[d.tipo];
      this.tochas = [];
      d.salas.forEach(s => {
        if (s.estado !== 'explorada') return;
        const usados = new Set(), c = Gen.centro(s);
        usados.add(c.x + ',' + c.y); usados.add((c.x + 1) + ',' + c.y);
        this.posMonstros(s, true).forEach(p => usados.add(Math.floor(p.x / C) + ',' + Math.floor(p.y / C)));
        const livre = (x, y) => !usados.has(x + ',' + y);
        const cantos = [[s.x, s.y + s.h - 1], [s.x + s.w - 1, s.y + s.h - 1], [s.x + s.w - 1, s.y], [s.x, s.y]];
        const prox = () => { const p = cantos.find(([x, y]) => livre(x, y)) || [s.x, s.y]; usados.add(p[0] + ',' + p[1]); return p; };
        if (s.id === d.inicio) { const [x, y] = prox(); S.tile(ctx, 17, 1, x * C, y * C, C); }
        if (s.itens.length) { const [x, y] = prox(); S.anim(ctx, 'bau', 0, 16, (x + .5) * C, (y + .9) * C, kk); }
        if (s.armadilha) { const [x, y] = prox(); S.anim(ctx, 'espigoes', 5, 17, (x + .5) * C, (y + .95) * C, kk * .9); }
        if (s.mec) { const [x, y] = prox(); S.anim(ctx, 'alavanca', s.mec.resolvido ? 3 : 0, 16, (x + .5) * C, (y + .9) * C, kk); }
        const marca = (icone, cor, apagado, obj) => { const [x, y] = prox(); ctx.imageSmoothingEnabled = true; CP.Fichas.marca(ctx, (x + .5) * C, (y + .5) * C, C * .9, icone, cor, apagado, obj ? imgObj(obj) : null); ctx.imageSmoothingEnabled = false; };
        if (s.restos) marca('ossos', '#e6dcc4', false, 'bone');
        if (s.pista !== undefined) marca('pergaminho', '#f0cf7a', false, 'parchment');
        else if (s.inscricao) marca('runa', '#9fc3e0', s.inscricao.lida);
        // sangue onde caíram criaturas
        this.posMonstros(s, true).forEach(p => { if (p.m.pv <= 0 && !p.m.pacificado && !p.m.errante) S.sangue(ctx, p.x, p.y, kk * .9); });
        // decoração encostada à parede de cima
        const h0 = hash(s.x * 7, s.y * 13), n = Math.min(s.w - 2, 1 + h0 % 3);
        for (let i = 0; i < n; i++) {
          const x = s.x + 1 + ((h0 >>> (i * 3)) + i * 2) % Math.max(1, s.w - 2), y = s.y;
          if (!livre(x, y)) continue; usados.add(x + ',' + y);
          const [g, esc2] = DECOR[(h0 >>> (i * 2)) % DECOR.length];
          S.obj(ctx, g, (h0 >>> i) % 8, (x + .5) * C, (y + .92) * C, kk * esc2);
        }
        if (d.tipo === 'mina' && s.chefe) S.obj(ctx, 'grades', 0, (s.x + s.w - .5) * C, (s.y + 1) * C, kk);
        // tocha na parede de cima
        if (s.w >= 3) {
          const tx = s.x + 1 + (hash(s.x, s.y) % Math.max(1, s.w - 2));
          S.obj(ctx, 'tocha', 0, (tx + .5) * C, s.y * C - C * .05, kk);
          this.tochas.push({ x: (tx + .5) * C, y: s.y * C - C * .55, f: hash(s.y, s.x) % 8 });
        }
        ctx.fillStyle = 'rgba(236,230,216,.35)'; ctx.font = `${C * .34}px Georgia, serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(E.nomeSala(s), s.x * C + 3, (s.y + s.h) * C - 4);
      });
      this.sujo = false;
    },

    // animações curtas das personagens (ataque, dor, morte)
    animar(quem, anim) { this.anims[quem] = { anim, t0: performance.now() }; },
    animDe(quem, t) {
      const a = this.anims[quem]; if (!a) return null;
      const dt = t - a.t0; if (dt > CP.Spr.duracao(a.anim)) { delete this.anims[quem]; return null; }
      return { anim: a.anim, t: dt };
    },
    morrer(p) { this.mortes.push({ ...p, t0: performance.now() }); },

    /* --- cada fotograma: luz, personagens, partículas --- */
    frame(t, dt) {
      if (!st || !st.exp || !this.w || $('#ecra-exp').hidden) return;
      if (this.sujo) this.construir();
      const ctx = this.ctx, C = this.C, d = st.exp.d, esc = this.esc, mov = !reduzido(), S = CP.Spr, kk = C / 16;
      if (this.destino) {
        this.ox += (this.destino.ox - this.ox) * Math.min(1, dt * 6); this.oy += (this.destino.oy - this.oy) * Math.min(1, dt * 6);
        if (Math.abs(this.destino.ox - this.ox) < .5 && Math.abs(this.destino.oy - this.oy) < .5) this.destino = null;
      }
      const alvo = this.alvoHeroi();
      if (!this.heroi) this.heroi = { ...alvo, dir: 'D', flip: false };
      const vx = alvo.x - this.heroi.x, vy = alvo.y - this.heroi.y, anda = Math.hypot(vx, vy) > 3;
      const passo = Math.min(1, dt * 4.5);
      this.heroi.x += vx * passo; this.heroi.y += vy * passo;
      if (anda) { if (Math.abs(vx) > Math.abs(vy)) { this.heroi.dir = 'S'; this.heroi.flip = vx < 0; } else { this.heroi.dir = vy < 0 ? 'U' : 'D'; if (Math.abs(vx) > 1) this.heroi.flip = vx < 0; } }
      const fl = mov ? Math.sin(t / 90) * .03 + Math.sin(t / 37) * .02 : 0;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#0e0d16'; ctx.fillRect(0, 0, this.w, this.h);
      ctx.save(); ctx.translate(this.ox, this.oy); ctx.scale(esc, esc);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.est, 0, 0);

      // chamas das tochas
      for (const tc of this.tochas) S.anim(ctx, 'fogo', mov ? Math.floor(t / 100 + tc.f) % 8 : 0, 16, tc.x, tc.y + C * .2, kk * .7);

      // criaturas (vivas) e mortes a acontecer
      const sAt = d.salas[st.exp.sala], h = this.heroi;
      const alvoCombate = (st.exp.combate || st.exp.confronto);
      d.salas.forEach(s => {
        if (s.estado !== 'explorada') return;
        for (const { m, x, y, key } of this.posMonstros(s)) {
          const k = kk * (S.ESCALA[m.tipo] || 1);
          if (S.temSprite(m.tipo)) {
            const ativo = m.acordado || m.chefe;
            const a = this.animDe(key, t);
            let dir = 'D', flip = false;
            if (s === sAt && ativo) { const dx = h.x - x, dy = h.y - y; flip = dx < 0; dir = Math.abs(dx) > Math.abs(dy) ? 'S' : dy < 0 ? 'U' : 'D'; }
            else flip = hash(x | 0, y | 0) % 2 === 1;
            if (m.chefe) { ctx.fillStyle = 'rgba(240,200,74,.18)'; ctx.beginPath(); ctx.ellipse(x, y, C * .55, C * .2, 0, 0, 7); ctx.fill(); }
            S.personagem(ctx, S.MONSTRO[m.tipo], a ? a.anim : 'Idle', dir, a ? a.t : (ativo && mov ? t + x * 7 : 0), x, y, k, flip, !!a, m.tipo === 'guardiao' ? .8 : (ativo ? 1 : .85));
            if (!ativo) { ctx.fillStyle = '#dfe8f2'; ctx.font = `700 ${C * .32}px Alegreya Sans, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('z', x + C * .38, y - C * .9 - (mov ? (t / 400) % 1 * 5 : 0)); }
          } else {
            ctx.imageSmoothingEnabled = true; CP.Fichas.monstro(ctx, m, x, y - C * .35, C * (m.chefe ? .5 : .42), t, mov); ctx.imageSmoothingEnabled = false;
          }
          if ((m.acordado || m.chefe) && s === sAt && alvoCombate) {   // vida por cima
            const w = Math.min(C * 1.1, m.pvMax * C * .16), y0 = y - C * (S.temSprite(m.tipo) ? 1.15 * (S.ESCALA[m.tipo] || 1) : 1.05);
            ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2 - 1, y0 - 1, w + 2, 5);
            ctx.fillStyle = '#e0503a'; ctx.fillRect(x - w / 2, y0, w * m.pv / m.pvMax, 3);
          }
          if (m.chefe) { ctx.save(); ctx.translate(x, y - C * (S.temSprite(m.tipo) ? 1.45 : 1.2)); ctx.scale(C / 34, C / 34); CP.Fichas.ICONES.coroa(ctx, '#f0c84a'); ctx.restore(); }
        }
      });
      this.mortes = this.mortes.filter(o => t - o.t0 < 1100);
      for (const o of this.mortes) S.personagem(ctx, o.chave, 'Death', 'D', t - o.t0, o.x, o.y, kk * o.esc, false, true, 1 - Math.max(0, (t - o.t0 - 800) / 300));

      // herói
      const ah = this.animDe('heroi', t);
      let dirH = h.dir, flipH = h.flip;
      if (!anda && alvoCombate) {
        const mp = this.posMonstros(sAt)[0];
        if (mp) { const dx = mp.x - h.x, dy = mp.y - h.y; if (Math.abs(dx) > Math.abs(dy)) { dirH = 'S'; flipH = dx < 0; } else { dirH = dy < 0 ? 'U' : 'D'; flipH = dx < 0; } }
      }
      S.personagem(ctx, S.CLASSE[st.hero.classe], ah ? ah.anim : (anda ? 'Walk' : 'Idle'), dirH, ah ? ah.t : t, h.x, h.y, kk, flipH, !!ah);
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

      // miniaturas animadas: cabeçalho e barra de combate
      const mini = (cv, chave, anim, tt, flip, umaVez) => {
        if (!cv) return; const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
        c.imageSmoothingEnabled = false; S.personagem(c, chave, anim, flip ? 'S' : 'D', tt, cv.width / 2, cv.height * .86, cv.width / 22, false, umaVez);
      };
      const ahH = this.animDe('heroi', t);
      const animH = ahH ? ahH.anim : (alvoCombate ? 'Idle' : 'Idle');
      mini(document.getElementById('st-token'), S.CLASSE[st.hero.classe], animH, ahH ? ahH.t : t, false, !!ahH);
      mini(document.getElementById('duelo-h'), S.CLASSE[st.hero.classe], animH, ahH ? ahH.t : t, false, !!ahH);
      const mI = inimigoAtual(), cvM = document.getElementById('duelo-m');
      if (mI && cvM && S.temSprite(mI.tipo)) {
        const pk = this.posMonstros(sAt, true).find(p => p.m === mI) || {}, am = pk.key && this.animDe(pk.key, t);
        mini(cvM, S.MONSTRO[mI.tipo], am ? am.anim : 'Idle', am ? am.t : t, false, !!am);
      }

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
      h = `<h2>${esc(info.titulo)}</h2>
        <div class="livro"><canvas id="livro-cv" width="272" height="272" aria-hidden="true"></canvas>
          <div class="pags"><div class="pag e"><b>Objetivo</b><p>${esc(info.objetivo)}</p><p><i>${x.objetivo ? 'Cumprido.' : 'Por cumprir.'}</i></p>
            ${x.pistas.slice(0, 1).map(p => `<b>Pista</b><p>${esc(p)}</p>`).join('')}</div>
          <div class="pag d">${x.pistas.length > 1 ? '<b>Pistas</b>' + x.pistas.slice(1).map(p => `<p>${esc(p)}</p>`).join('') : `<p><i>${x.pistas.length ? 'Ainda há mais por descobrir…' : 'As páginas ainda estão em branco. Explora para encontrares pistas.'}</i></p>`}</div></div>
        </div>
        <h3>Registo</h3><div class="narr" style="padding:0">${x.registo.slice(-80).map(linhaEvento).join('')}</div>`;
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
        <button class="bt" data-som><span>Efeitos sonoros: ${Som.ligado() ? 'ligados' : 'desligados'}</span></button>
        <button class="bt" data-musica><span>Música: ${CP.Musica.ligada() ? 'ligada' : 'desligada'}</span></button>
        <button class="bt" data-folha="campanha"><span>Exportar ou importar campanha</span></button>
        <button class="bt" data-nova><span>Nova campanha</span><small>Apaga a campanha atual e volta à criação do aventureiro.</small></button></div>`;
    }
    $('#folha-in').innerHTML = h;
    $('#folha').hidden = false;
    if (tipo === 'registo') { Livro.abrir(); Som.tocar('reveal'); }
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
    if (D.musica !== undefined) { CP.Musica.desbloquear(); CP.Musica.alternar(); if (st && st.ecra === 'expedicao') Som.ambiente(true); abrirFolha('menu'); return; }
    if (b.id === 'bt-som') {   // botão do cabeçalho: liga ou desliga tudo
      const ligar = !(Som.ligado() || CP.Musica.ligada());
      if (Som.ligado() !== ligar) Som.alternar();
      if (CP.Musica.ligada() !== ligar) { CP.Musica.desbloquear(); CP.Musica.alternar(); }
      Som.ambiente(ligar); if (ligar) Som.tocar('pick'); renderEstado(); return;
    }
    if (D.desistir !== undefined) { if (confirm('Desistir desta masmorra? Voltas à aldeia e a reputação desce.')) { fecharFolha(); Som.ambiente(false); executar({ tipo: 'desistir' }); } return; }
    if (D.nova !== undefined) { if (confirm('Apagar a campanha atual? Esta ação não se desfaz.')) { CP.Save.apagar(); st = null; Som.ambiente(false); fecharFolha(); render(); } return; }
  });
  $('#folha').addEventListener('click', e => { if (e.target.id === 'folha') fecharFolha(); });
  $('#dado').addEventListener('click', () => { saltar = true; });
  $('#narr').addEventListener('click', () => { if (ocupado) saltar = true; });

  /* ================= Arranque ================= */
  Mapa.init();
  st = CP.Save.carregar();
  CP.Spr.carregar().then(() => {
    render();
    if (st && st.ecra === 'expedicao') requestAnimationFrame(() => { Mapa.ajustar(); Mapa.sujo = true; Mapa.centrar(true, true); });
  });
  // o som ambiente só pode começar depois de um toque
  document.addEventListener('pointerdown', () => { CP.Musica.desbloquear(); }, { capture: true });
  document.addEventListener('keydown', () => { CP.Musica.desbloquear(); }, { capture: true });
})(window);
