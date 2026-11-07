/* Crónicas de Valdemora — sprites animados (kit da CraftPix): carregar, tingir e desenhar. */
(function (G) {
  const CP = G.CP = G.CP || {};
  const K = () => CP.KIT;
  const IMG = {};              // chave -> Image ou canvas
  const FPS = { Idle: 6, Walk: 10, Attack: 12, Hurt: 8, Death: 10 };

  // que folha usa cada classe e cada criatura (":" = variante tingida)
  const CLASSE = { guerreiro: 'h2', explorador: 'h1', mistico: 'h3', ladrao: 'ninja' };
  const MONSTRO = { rato: 'e1', goblin: 'e2', gorm: 'e3', bandido: 'alabardeiro', rasca: 'alabardeiro', esqueleto: 'e4:osso',
    ghoul: 'zombi1', bertolo: 'zombi3', cassio: 'e4:roxo', guardiao: 'cavaleiro:espectro', lobo: 'raposa:lobo',
    aranha: 'caranguejo:aranha', maearanha: 'caranguejo:aranha' };
  const ESCALA = { gorm: 1.3, rasca: 1.3, bertolo: 1.3, cassio: 1.2, guardiao: 1.3, maearanha: 1.55 };
  const ePerfil = chave => !!(CP.KIT.perfil && CP.KIT.perfil[chave.split(':')[0]]);
  const TINTAS = {
    ladrao: { dh: 175, ks: .55, kl: .78 }, bandido: { dh: -75, ks: .55, kl: .95 }, osso: { dh: 0, ks: .08, kl: 1.2 },
    ghoul: { dh: -25, ks: .3, kl: .82 }, roxo: { dh: 160, ks: 1, kl: .9 }, espectro: { dh: 190, ks: .55, kl: 1.25 },
    lobo: { dh: 190, ks: .12, kl: .8 }, aranha: { dh: 250, ks: .45, kl: .55 }
  };

  function carregarImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(i); i.src = src; }); }

  // muda a cor de um sprite (matiz, saturação, luz) píxel a píxel
  function tingir(img, t) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
      if (mx !== mn) {
        const dd = mx - mn; s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn);
        h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h /= 6;
      }
      if (l < .12) continue; // contornos ficam iguais
      h = (h + t.dh / 360 + 1) % 1; s = Math.min(1, s * t.ks); l = Math.min(.95, l * t.kl);
      const q = l < .5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
      const f = tt => { tt = (tt + 1) % 1; return tt < 1 / 6 ? pp + (q - pp) * 6 * tt : tt < .5 ? q : tt < 2 / 3 ? pp + (q - pp) * (2 / 3 - tt) * 6 : pp; };
      p[i] = f(h + 1 / 3) * 255; p[i + 1] = f(h) * 255; p[i + 2] = f(h - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0); return c;
  }

  async function carregar() {
    const k = K(), tarefas = [];
    const por = (chave, src) => tarefas.push(carregarImg(src).then(i => { IMG[chave] = i; }));
    por('tileset', k.tileset); por('sombra', k.sombra); por('sangue', k.sangue);
    for (const [c, anims] of Object.entries(k.chars)) for (const [a, src] of Object.entries(anims)) por(c + '/' + a, src);
    for (const [c, anims] of Object.entries(k.perfil || {})) for (const [a, src] of Object.entries(anims)) por(c + '/' + a, src);
    for (const [n, src] of Object.entries(k.aldeia || {})) por('aldeia/' + n, src);
    for (const [n, src] of Object.entries(k.aldeia_anim || {})) por('aldeia_anim/' + n, src);
    if (k.livro) por('livro', k.livro);
    for (const [a, src] of Object.entries(k.anim)) por('anim/' + a, src);
    for (const [g, l] of Object.entries(k.obj)) l.forEach((src, i) => por('obj/' + g + '/' + i, src));
    await Promise.all(tarefas);
    // variantes tingidas
    const variantes = new Set([...Object.values(CLASSE), ...Object.values(MONSTRO)].filter(v => v.includes(':')));
    for (const v of variantes) {
      const [base, tinta] = v.split(':');
      const fonte = k.chars[base] || k.perfil[base];
      for (const a of Object.keys(fonte)) IMG[v + '/' + a] = tingir(IMG[base + '/' + a], TINTAS[tinta]);
    }
  }

  // escolhe a folha e o fotograma
  function quadro(chave, anim, dir, t, umaVez) {
    let img = ePerfil(chave) ? (IMG[chave + '/' + anim] || IMG[chave + '/Idle']) : (IMG[chave + '/' + dir + '_' + anim] || IMG[chave + '/D_' + anim]);
    if (!img) return null;
    const n = Math.max(1, Math.round(img.width / 32));
    let f = Math.floor(t / 1000 * FPS[anim]);
    f = umaVez ? Math.min(n - 1, f) : f % n;
    return { img, sx: f * 32, n };
  }

  CP.Spr = {
    carregar, IMG, CLASSE, MONSTRO, ESCALA, ePerfil,
    temSprite: tipo => !!MONSTRO[tipo],
    duracao: anim => (anim === 'Death' ? 8 : anim === 'Hurt' ? 2 : 4) / FPS[anim] * 1000,
    // desenha uma personagem com os pés em (x, y); k = tamanho de um píxel do sprite
    personagem(c, chave, anim, dir, t, x, y, k, flip, umaVez, alfa) {
      const q = quadro(chave, anim, dir === 'E' ? 'S' : dir, t, umaVez); if (!q) return;
      c.save(); c.imageSmoothingEnabled = false;
      if (alfa != null) c.globalAlpha = alfa;
      if (IMG.sombra && anim !== 'Death') c.drawImage(IMG.sombra, x - 6.5 * k, y - 3 * k, 13 * k, 6 * k);
      const perfil = ePerfil(chave);
      c.translate(x, y); if (flip && (perfil || dir === 'S')) c.scale(-1, 1);
      c.drawImage(q.img, q.sx, 0, 32, 32, -16 * k, (perfil ? -31.5 : -21.5) * k, 32 * k, 32 * k);
      c.restore();
    },
    tile(c, tx, ty, x, y, s) { if (IMG.tileset) c.drawImage(IMG.tileset, tx * 16, ty * 16, 16, 16, x, y, s, s); },
    obj(c, grupo, i, x, y, k) {
      const l = K().obj[grupo]; if (!l) return; const img = IMG['obj/' + grupo + '/' + (i % l.length)]; if (!img) return;
      c.drawImage(img, x - img.width * k / 2, y - img.height * k, img.width * k, img.height * k);
    },
    objTam(grupo, i) { const l = K().obj[grupo]; const img = IMG['obj/' + grupo + '/' + (i % l.length)]; return img ? [img.width, img.height] : [16, 16]; },
    anim(c, nome, f, fw, x, y, k) {   // objeto animado, pés em (x, y)
      const img = IMG['anim/' + nome]; if (!img) return;
      const n = Math.round(img.width / fw), q = Math.max(0, Math.min(n - 1, f));
      c.drawImage(img, q * fw, 0, fw, img.height, x - fw * k / 2, y - img.height * k, fw * k, img.height * k);
    },
    sangue(c, x, y, k) { if (IMG.sangue) c.drawImage(IMG.sangue, 96, 0, 32, 32, x - 16 * k, y - 20 * k, 32 * k, 32 * k); },
    // retrato estático (para HTML): primeiro fotograma de Idle, ampliado
    imagem(chave, anim, px, fotograma) {
      const perfil = ePerfil(chave);
      const img = perfil ? IMG[chave + '/' + (anim || 'Idle')] : IMG[chave + '/D_' + (anim || 'Idle')]; if (!img) return '';
      const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const k = px / 22;
      if (IMG.sombra) x.drawImage(IMG.sombra, px / 2 - 6.5 * k, px * .86 - 3 * k, 13 * k, 6 * k);
      x.drawImage(img, (fotograma || 0) * 32, 0, 32, 32, px / 2 - 16 * k, px * .86 - (perfil ? 31.5 : 21.5) * k, 32 * k, 32 * k);
      return c.toDataURL();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
