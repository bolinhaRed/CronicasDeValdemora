/* Crónicas de Valdemora — fichas (herói e criaturas) e marcadores do mapa.
   Tudo desenhado em canvas, sem imagens: medalhão com aro metálico, ícone e vida. */
(function (G) {
  const CP = G.CP = G.CP || {};

  /* ---------- Ícones (desenhados numa caixa de -10 a 10) ---------- */
  const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const linhas = (c, pts, w) => { c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
  const poli = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); };

  const ICONES = {
    caveira(c, cor, fundo) {
      c.fillStyle = cor; circ(c, 0, -1.5, 7); c.fillRect(-4, 3, 8, 4.5);
      c.fillStyle = fundo; circ(c, -2.8, -1, 2); circ(c, 2.8, -1, 2); poli(c, [[0, 1.6], [-1, 3.4], [1, 3.4]]);
      c.fillRect(-1.7, 5, 1, 2.5); c.fillRect(.7, 5, 1, 2.5);
    },
    garra(c, cor) {
      c.strokeStyle = cor;
      for (const dx of [-4.5, 0, 4.5]) { c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(dx - 2, -7); c.quadraticCurveTo(dx + 3, -1, dx - 1, 7.5); c.stroke(); }
    },
    aranha(c, cor, fundo) {
      c.strokeStyle = cor;
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const y = -3 + i * 2.4; linhas(c, [[0, y * .6], [s * 5, y - 3], [s * 9, y + 2.5]], 1.4); }
      c.fillStyle = cor; c.beginPath(); c.ellipse(0, 2.5, 3.6, 4.6, 0, 0, 7); c.fill(); circ(c, 0, -3.6, 2.6);
      c.fillStyle = fundo; circ(c, -1, -4, .7); circ(c, 1, -4, .7);
    },
    rato(c, cor, fundo) {
      c.fillStyle = cor; c.beginPath(); c.ellipse(1, 1.5, 6.5, 4.2, -.2, 0, 7); c.fill();
      circ(c, -4.5, -2.5, 2.4); poli(c, [[-5, 0], [-10, 1.5], [-5, 3]]);
      c.strokeStyle = cor; linhas(c, [[7, 3], [9.5, 6], [6, 8.5]], 1.2);
      c.fillStyle = fundo; circ(c, -6.5, .7, .8);
    },
    lobo(c, cor, fundo) {
      c.fillStyle = cor; poli(c, [[-7, -8], [-3.5, -3], [3.5, -3], [7, -8], [7.5, 0], [3, 6], [0, 8.5], [-3, 6], [-7.5, 0]]);
      c.fillStyle = fundo; poli(c, [[-4.5, -.5], [-1.6, .6], [-4, 1.8]]); poli(c, [[4.5, -.5], [1.6, .6], [4, 1.8]]); circ(c, 0, 6, 1.3);
    },
    goblin(c, cor, fundo) {
      c.fillStyle = cor; poli(c, [[-4, -2], [-10, -6], [-5, 2]]); poli(c, [[4, -2], [10, -6], [5, 2]]);
      c.beginPath(); c.ellipse(0, 0, 5, 6.5, 0, 0, 7); c.fill();
      c.fillStyle = fundo; poli(c, [[-3.4, -1.5], [-1, -.5], [-3, .6]]); poli(c, [[3.4, -1.5], [1, -.5], [3, .6]]);
      c.fillRect(-2.2, 3, 4.4, 1.2);
    },
    capuz(c, cor, fundo) {
      c.fillStyle = cor; c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(9, -6, 8, 8); c.lineTo(-8, 8); c.quadraticCurveTo(-9, -6, 0, -9); c.fill();
      c.fillStyle = fundo; c.beginPath(); c.ellipse(0, 1.5, 4.2, 5, 0, 0, 7); c.fill();
      c.fillStyle = cor; circ(c, -1.7, .8, .9); circ(c, 1.7, .8, .9);
    },
    fantasma(c, cor, fundo) {
      c.fillStyle = cor; c.beginPath(); c.moveTo(-6.5, 8); c.lineTo(-6.5, -2); c.arc(0, -2, 6.5, Math.PI, 0); c.lineTo(6.5, 8);
      for (let i = 0; i < 4; i++) c.lineTo(6.5 - (i + .5) * 3.25, i % 2 ? 8 : 5.5);
      c.closePath(); c.fill();
      c.fillStyle = fundo; c.beginPath(); c.ellipse(-2.4, -2, 1.3, 2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(2.4, -2, 1.3, 2, 0, 0, 7); c.fill();
    },
    sino(c, cor, fundo) {
      c.fillStyle = cor; c.beginPath(); c.moveTo(-7.5, 5); c.quadraticCurveTo(-6, 3, -5.5, -2); c.quadraticCurveTo(-5, -8, 0, -8);
      c.quadraticCurveTo(5, -8, 5.5, -2); c.quadraticCurveTo(6, 3, 7.5, 5); c.closePath(); c.fill();
      circ(c, 0, 7, 1.8); c.fillRect(-1, -10, 2, 2.5);
      c.fillStyle = fundo; c.fillRect(-6.5, 3.2, 13, 1);
    },
    vela(c, cor, fundo) {
      c.fillStyle = cor; c.fillRect(-2.8, -1, 5.6, 9);
      c.fillStyle = '#ffcf6a'; c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(3, -4.5, 0, -2.2); c.quadraticCurveTo(-3, -4.5, 0, -9); c.fill();
      c.fillStyle = fundo; c.fillRect(-2.8, 2, 5.6, .8);
    },
    espada(c, cor) {
      c.fillStyle = cor; poli(c, [[0, -9.5], [1.6, -7.5], [1.6, 3], [-1.6, 3], [-1.6, -7.5]]);
      c.fillRect(-5, 3, 10, 1.8); c.fillRect(-1, 4.8, 2, 3.4); circ(c, 0, 9, 1.4);
    },
    punhal(c, cor) {
      c.save(); c.rotate(-.6);
      c.fillStyle = cor; poli(c, [[0, -9], [1.8, -5], [1.4, 2], [-1.4, 2], [-1.8, -5]]); c.fillRect(-4, 2, 8, 1.6); c.fillRect(-.9, 3.6, 1.8, 4); circ(c, 0, 8.4, 1.2);
      c.restore();
    },
    rosa(c, cor, fundo) {
      c.fillStyle = cor; poli(c, [[0, -9.5], [2, -2], [9.5, 0], [2, 2], [0, 9.5], [-2, 2], [-9.5, 0], [-2, -2]]);
      c.fillStyle = fundo; circ(c, 0, 0, 1.6);
    },
    estrela(c, cor, fundo) {
      c.fillStyle = cor; c.beginPath();
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6, r = i % 2 ? 4 : 9; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.fillStyle = fundo; circ(c, 0, 0, 2.2);
    },
    // marcadores
    pergaminho(c, cor, fundo) {
      c.fillStyle = cor; c.fillRect(-5, -6, 10, 12); circ(c, -5, -6, 1.6); circ(c, 5, -6, 1.6); circ(c, -5, 6, 1.6); circ(c, 5, 6, 1.6);
      c.fillStyle = fundo; for (let i = 0; i < 4; i++) c.fillRect(-3, -3.2 + i * 2.2, i === 3 ? 4 : 6, .8);
    },
    runa(c, cor) { c.strokeStyle = cor; linhas(c, [[-2, -7], [-2, 7]], 1.8); linhas(c, [[-2, -7], [3.5, -3], [-2, 0], [3.5, 7]], 1.8); },
    ossos(c, cor) {
      c.strokeStyle = cor; c.fillStyle = cor;
      for (const s of [-1, 1]) { linhas(c, [[-6 * s, -6], [6 * s, 6]], 2.4); circ(c, -6.6 * s, -5, 1.4); circ(c, -5 * s, -6.6, 1.4); circ(c, 6.6 * s, 5, 1.4); circ(c, 5 * s, 6.6, 1.4); }
    },
    engrenagem(c, cor, fundo) {
      c.fillStyle = cor;
      for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-1.6, -8.5, 3.2, 4); c.restore(); }
      circ(c, 0, 0, 5.6); c.fillStyle = fundo; circ(c, 0, 0, 2.2);
    },
    coroa(c, cor) { c.fillStyle = cor; poli(c, [[-7, 3], [-7, -4], [-3.5, 0], [0, -6], [3.5, 0], [7, -4], [7, 3]]); }
  };

  const ICONE_MONSTRO = {
    rato: 'rato', esqueleto: 'caveira', ghoul: 'garra', aranha: 'aranha', goblin: 'goblin', lobo: 'lobo', bandido: 'capuz',
    bertolo: 'sino', cassio: 'vela', maearanha: 'aranha', gorm: 'goblin', rasca: 'capuz', guardiao: 'fantasma'
  };
  const ICONE_CLASSE = { guerreiro: 'espada', ladrao: 'punhal', explorador: 'rosa', mistico: 'estrela' };

  // cores do miolo por família
  function paleta(m) {
    if (m.morto) return { a: '#5b6170', b: '#2b2f38', i: '#ece4cf' };
    if (['aranha', 'maearanha', 'rato', 'lobo'].includes(m.tipo)) return { a: '#6e4630', b: '#33201a', i: '#f0d6b0' };
    if (['goblin', 'gorm'].includes(m.tipo)) return { a: '#4f6a32', b: '#243218', i: '#e6efc8' };
    return { a: '#5d4672', b: '#2c2036', i: '#eadff2' };
  }

  /* ---------- Medalhão ---------- */
  function medalhao(c, x, y, r, o) {
    c.save(); c.translate(x, y);
    // sombra no chão
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(0, r * .95, r * 1.05, r * .38, 0, 0, 7); c.fill();
    // aro metálico
    const aro = c.createLinearGradient(0, -r, 0, r);
    o.aro.forEach((cor, i) => aro.addColorStop(i / (o.aro.length - 1), cor));
    c.fillStyle = aro; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.lineWidth = Math.max(1, r * .06); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
    // miolo
    const ri = r * .78, mi = c.createRadialGradient(-ri * .35, -ri * .45, ri * .1, 0, 0, ri);
    mi.addColorStop(0, o.miolo[0]); mi.addColorStop(1, o.miolo[1]);
    c.fillStyle = mi; c.beginPath(); c.arc(0, 0, ri, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = Math.max(1, r * .05); c.stroke();
    // retrato (se houver) ou ícone
    if (o.img && o.img.complete && o.img.naturalWidth) {
      c.save(); c.beginPath(); c.arc(0, 0, ri * .97, 0, 7); c.clip();
      c.imageSmoothingEnabled = false; c.drawImage(o.img, -ri * 1.08, -ri * 1.02, ri * 2.16, ri * 2.16);
      c.restore();
    } else {
      c.save(); c.scale(ri / 12.5, ri / 12.5);
      c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowOffsetY = 1;
      ICONES[o.icone](c, o.cor, o.miolo[1]);
      c.restore();
    }
    // brilho
    c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(-r * .3, -r * .5, r * .42, r * .2, -.5, 0, 7); c.fill();
    c.restore();
  }

  // vida em arcos à volta da ficha
  function vida(c, x, y, r, pv, max) {
    const seg = Math.PI * 1.1 / max, ini = Math.PI * .95 - (seg * max) / 2 + Math.PI / 2 - Math.PI / 2;
    const base = Math.PI / 2 + Math.PI * .55; // começa em baixo à esquerda e sobe pelo lado esquerdo
    c.lineCap = 'butt'; c.lineWidth = Math.max(2, r * .16);
    for (let i = 0; i < max; i++) {
      const a0 = base + i * seg + seg * .12, a1 = base + (i + 1) * seg - seg * .12;
      c.strokeStyle = i < pv ? '#e0503a' : 'rgba(20,20,20,.75)';
      c.beginPath(); c.arc(x, y, r + c.lineWidth * .9, a0, a1); c.stroke();
    }
    void ini;
  }

  CP.Fichas = {
    ICONES,
    monstro(c, m, x, y, r, t, animado, img) {
      const p = paleta(m);
      const aro = m.chefe ? ['#fff0b0', '#d8aa3c', '#7a5714'] : m.morto ? ['#d9dde3', '#8a919c', '#3c414a'] : ['#c8a27a', '#7a5638', '#3a2516'];
      const respira = animado && m.acordado ? Math.sin(t / 260 + x) * r * .04 : 0;
      c.save();
      if (!m.acordado && !m.chefe) c.globalAlpha = .82;
      medalhao(c, x, y + respira, r, { aro, miolo: [p.a, p.b], icone: ICONE_MONSTRO[m.tipo] || 'caveira', cor: p.i, img });
      if (m.acordado || m.chefe) vida(c, x, y + respira, r, m.pv, m.pvMax);
      if (m.chefe) {
        c.save(); c.translate(x, y - r * 1.05 + respira); c.scale(r / 14, r / 14);
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowOffsetY = 1.5; ICONES.coroa(c, '#f0c84a'); c.restore();
      }
      if (!m.acordado && !m.chefe) {
        const sobe = animado ? (t / 900) % 1 : .3;
        c.globalAlpha = 1 - sobe * .7; c.fillStyle = '#dfe8f2'; c.font = `700 ${r * .55}px Alegreya Sans, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('z', x + r * .95 + sobe * r * .3, y - r * .85 - sobe * r * .6);
        c.font = `700 ${r * .38}px Alegreya Sans, sans-serif`; c.fillText('z', x + r * 1.35, y - r * 1.3 - sobe * r * .4);
      }
      c.restore();
    },
    heroi(c, classe, cor, x, y, r, t, animado, img) {
      // círculo de seleção no chão
      const p = animado ? (Math.sin(t / 380) + 1) / 2 : .5;
      c.save(); c.strokeStyle = `rgba(243,228,189,${.35 + p * .35})`; c.lineWidth = r * .1;
      c.beginPath(); c.ellipse(x, y + r * .95, r * (1.15 + p * .12), r * (.42 + p * .05), 0, 0, 7); c.stroke(); c.restore();
      medalhao(c, x, y, r, { aro: ['#fff6dc', '#e2c98e', '#8a6a34'], miolo: [cor, shade(cor, -.55)], icone: ICONE_CLASSE[classe], cor: '#fff8e8', img });
    },
    // marcador de objeto: placa em losango
    marca(c, x, y, s, icone, cor, apagado, img) {
      c.save(); c.translate(x, y); c.globalAlpha = apagado ? .55 : 1;
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, s * .62, s * .55, s * .18, 0, 0, 7); c.fill();
      c.rotate(Math.PI / 4);
      const g = c.createLinearGradient(-s * .4, -s * .4, s * .4, s * .4); g.addColorStop(0, '#5a4a36'); g.addColorStop(1, '#2a2119');
      c.fillStyle = g; c.fillRect(-s * .38, -s * .38, s * .76, s * .76);
      c.lineWidth = s * .06; c.strokeStyle = cor; c.strokeRect(-s * .38, -s * .38, s * .76, s * .76);
      c.rotate(-Math.PI / 4);
      if (img && img.complete && img.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(img, -s * .42, -s * .42, s * .84, s * .84); }
      else { c.scale(s / 32, s / 32); ICONES[icone](c, cor, '#2a2119'); }
      c.restore();
    },
    imagemMonstro(m, px) {
      const k = 2, cv = document.createElement('canvas'); cv.width = cv.height = px * k;
      const c = cv.getContext('2d'); c.scale(k, k); const p = paleta(m);
      medalhao(c, px / 2, px / 2 - px * .03, px * .44, { aro: m.chefe ? ['#fff0b0', '#d8aa3c', '#7a5714'] : ['#c8a27a', '#7a5638', '#3a2516'], miolo: [p.a, p.b], icone: ICONE_MONSTRO[m.tipo] || 'caveira', cor: p.i });
      return cv.toDataURL();
    },
    // imagem da ficha do herói para usar no HTML (cabeçalho, cartões)
    imagemHeroi(classe, cor, px) {
      const k = 2, cv = document.createElement('canvas'); cv.width = cv.height = px * k;
      const c = cv.getContext('2d'); c.scale(k, k);
      medalhao(c, px / 2, px / 2 - px * .03, px * .44, { aro: ['#fff6dc', '#e2c98e', '#8a6a34'], miolo: [cor, shade(cor, -.55)], icone: ICONE_CLASSE[classe], cor: '#fff8e8' });
      return cv.toDataURL();
    }
  };

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
    return '#' + ((m(r) << 16) | (m(g) << 8) | m(b)).toString(16).padStart(6, '0');
  }
})(typeof window !== 'undefined' ? window : globalThis);
