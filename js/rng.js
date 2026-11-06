/* Crónicas de Valdemora — gerador aleatório com semente.
   O estado é um único número inteiro, por isso cabe no estado do jogo
   e a mesma semente gera sempre o mesmo resultado. */
(function (G) {
  const CP = G.CP = G.CP || {};

  // Converte texto num inteiro de 32 bits
  function hashTexto(t) {
    let h = 1779033703 ^ t.length;
    for (let i = 0; i < t.length; i++) {
      h = Math.imul(h ^ t.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32
  function RNG(semente) { this.s = hashTexto(String(semente)); }
  RNG.fromState = function (s) { const r = new RNG(0); r.s = s >>> 0; return r; };
  RNG.estadoDe = function (semente) { return hashTexto(String(semente)); };
  RNG.prototype.next = function () {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  CP.RNG = RNG;
})(typeof window !== 'undefined' ? window : globalThis);
