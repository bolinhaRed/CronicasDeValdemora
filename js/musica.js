/* Crónicas de Valdemora — música ambiente com passagem suave entre faixas.
   inicio: "The Longest Journey" · aldeia: "D&D Acoustic Loop" · masmorra: "The Ancient Temple" */
(function (G) {
  const CP = G.CP = G.CP || {};
  const VOL = 0.32, FADE = 1500;
  let ligada = true, atual = null, desejada = null, faixa = null, desbloqueada = false;
  try { ligada = localStorage.getItem('cronicas.musica') !== 'off'; } catch (e) { /* */ }

  function fade(a, para, ms, fim) {
    const de = a.volume, t0 = performance.now();
    const passo = t => { const k = Math.min(1, (t - t0) / ms); a.volume = de + (para - de) * k; if (k < 1) requestAnimationFrame(passo); else if (fim) fim(); };
    requestAnimationFrame(passo);
  }
  function arrancar() {
    if (!ligada || !desejada || !desbloqueada) return;
    if (atual === desejada && faixa && !faixa.paused) return;
    const velha = faixa;
    if (velha) fade(velha, 0, FADE, () => velha.pause());
    const a = new Audio(CP.MUSICA_SRC[desejada]);
    a.loop = true; a.volume = 0; a.preload = 'auto';
    faixa = a; atual = desejada;
    a.play().then(() => fade(a, VOL, FADE)).catch(() => { desbloqueada = false; atual = null; });
  }
  CP.Musica = {
    tocar(nome) { desejada = nome; if (nome !== atual) arrancar(); },
    desbloquear() { if (!desbloqueada) { desbloqueada = true; arrancar(); } },
    ligada: () => ligada,
    alternar() {
      ligada = !ligada;
      try { localStorage.setItem('cronicas.musica', ligada ? 'on' : 'off'); } catch (e) { /* */ }
      if (ligada) { atual = null; arrancar(); }
      else if (faixa) { const f = faixa; faixa = null; atual = null; fade(f, 0, 600, () => f.pause()); }
      return ligada;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
