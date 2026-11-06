/* Crónicas de Valdemora — efeitos sonoros gerados no momento (Web Audio, sem ficheiros).
   Base adaptada do Mestre da Masmorra. */
(function (G) {
  const CP = G.CP = G.CP || {};
  const SND = { on: true, ctx: null, amb: null };
  try { SND.on = localStorage.getItem('cronicas.som') !== 'off'; } catch (e) { /* sem armazenamento */ }

  function ac() {
    if (!SND.ctx) { const C = G.AudioContext || G.webkitAudioContext; if (!C) return null; SND.ctx = new C(); }
    if (SND.ctx.state === 'suspended') SND.ctx.resume();
    return SND.ctx;
  }
  function tone(f, dur, type = 'sine', vol = .2, slide = 0, delay = 0) {
    const c = ac(); if (!c) return; const t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = .2, freq = 1200, delay = 0, q = 1) {
    const c = ac(); if (!c) return; const t = c.currentTime + delay; const n = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  function timp(f, d, vol) {
    const c = ac(); const t = c.currentTime + d; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.3); noise(.25, vol * .5, 180, d, .7);
  }
  const mid = n => 440 * Math.pow(2, (n - 69) / 12);
  function brass(notes, d, dur, vol) {
    const c = ac(); const t = c.currentTime + d; const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(250, t); f.frequency.linearRampToValueAtTime(1400, t + dur * 0.45); f.frequency.linearRampToValueAtTime(400, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); f.connect(g).connect(c.destination);
    for (const n of notes) for (const det of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mid(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + .1); }
  }
  // Corda dedilhada (Karplus-Strong)
  const cache = {};
  function ksBuf(f) {
    const k = Math.round(f * 10); if (cache[k]) return cache[k];
    const c = ac(); const sr = c.sampleRate, len = Math.floor(sr * 2.2), N = Math.max(2, Math.round(sr / f));
    const b = c.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
    for (let i = N; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[i - N + 1]);
    return cache[k] = b;
  }
  function pluck(n, t, vol = .5) {
    const c = ac(); const src = c.createBufferSource(); src.buffer = ksBuf(mid(n));
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
    const g = c.createGain(); g.gain.value = vol * .5; src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  const arp = (notas, passo, vol) => { const c = ac(); if (!c) return; const t = c.currentTime; notas.forEach((n, i) => pluck(n, t + i * passo, vol)); };

  const SFX = {
    dice: () => { for (let i = 0; i < 6; i++) noise(.04, .3, 2500 + Math.random() * 1500, i * 0.055 + Math.random() * 0.02, 2); },
    hit: () => { noise(.16, .45, 600, 0, .8); timp(90, 0, .35); },
    kill: () => { noise(.22, .4, 400, 0, .8); timp(70, 0, .45); tone(180, .4, 'sawtooth', .05, -120, .05); },
    miss: () => { noise(.3, .16, 2500, 0, .5); },
    block: () => { tone(1500, .25, 'triangle', .06, -200); tone(2250, .2, 'triangle', .03); noise(.05, .25, 4000, 0, 3); },
    hurt: () => { noise(.2, .5, 350, 0, .9); tone(160, .3, 'square', .06, -80); },
    door: () => { tone(70, .7, 'sawtooth', .07, 45); noise(.5, .18, 400, 0, 1.5); },
    thud: () => { timp(60, 0, .4); noise(.3, .25, 250, 0, 1); },
    trap: () => { noise(.35, .6, 2200, 0, .7); tone(900, .35, 'square', .09, -700); },
    reveal: () => arp([62, 69, 74], .12, .9),
    pick: () => { tone(660, .08, 'triangle', .06); tone(990, .12, 'triangle', .05, 0, .06); },
    growl: () => { noise(.5, .25, 220, 0, 1.2); tone(70, .45, 'triangle', .1, -15); },
    step: () => { noise(.06, .2, 500, 0, 1); noise(.06, .2, 450, .18, 1); },
    coin: () => { tone(1320, .15, 'triangle', .07); tone(1760, .3, 'triangle', .07, 0, .08); },
    heal: () => { tone(523, .4, 'sine', .1, 260); tone(784, .5, 'sine', .07, 0, .15); },
    fire: () => { noise(.8, .3, 900, 0, .4); noise(.6, .2, 300, .1, .6); },
    omen: () => { tone(110, 1.4, 'sine', .18, -40); tone(116, 1.4, 'sine', .12, -40); },
    boss: () => { if (!ac()) return; timp(55, 0, .3); timp(55, .22, .3); timp(55, .44, .4); timp(41, .75, .5); brass([38, 45, 50, 53], .75, 2.6, .05); },
    peace: () => arp([62, 66, 69, 74], .18, .8),
    win: () => { arp([62, 66, 69, 74, 78, 81], .14, 1); brass([50, 54, 57, 62], .9, 2.4, .06); },
    lose: () => { arp([69, 65, 62, 57], .35, 1); brass([38, 45, 50], 1.3, 3, .06); }
  };

  // Ambiente: vento abafado e um zumbido grave, muito baixo
  function ambiente(ligar) {
    const c = SND.on && ligar ? ac() : SND.ctx;
    if (ligar && SND.on && c && !SND.amb) {
      const n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      let ult = 0; for (let i = 0; i < n; i++) { ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = ult * 3; }
      const src = c.createBufferSource(); src.buffer = b; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.05, c.currentTime + 2);
      const o = c.createOscillator(); o.frequency.value = 49; const go = c.createGain(); go.gain.value = 0.012;
      src.connect(f).connect(g).connect(c.destination); o.connect(go).connect(c.destination);
      src.start(); o.start(); SND.amb = { src, o, g, go };
    } else if (!ligar && SND.amb && c) {
      const a = SND.amb; SND.amb = null;
      a.g.gain.linearRampToValueAtTime(0.0001, c.currentTime + .6); a.go.gain.linearRampToValueAtTime(0.0001, c.currentTime + .6);
      setTimeout(() => { try { a.src.stop(); a.o.stop(); } catch (e) { /* já parou */ } }, 700);
    }
  }

  CP.Som = {
    tocar(n) { if (!SND.on) return; try { if (ac() && SFX[n]) SFX[n](); } catch (e) { /* sem som */ } },
    ligado: () => SND.on,
    alternar() { SND.on = !SND.on; try { localStorage.setItem('cronicas.som', SND.on ? 'on' : 'off'); } catch (e) { /* */ } if (!SND.on) ambiente(false); return SND.on; },
    desbloquear() { if (SND.on) ac(); },
    ambiente
  };
})(typeof window !== 'undefined' ? window : globalThis);
