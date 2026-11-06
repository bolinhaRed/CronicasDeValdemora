/* Crónicas de Valdemora — gravação local, exportação e importação. */
(function (G) {
  const CP = G.CP = G.CP || {};
  const CHAVE = 'cronicas-profundezas.v1';
  CP.Save = {
    guardar(st) { try { localStorage.setItem(CHAVE, JSON.stringify(st)); return true; } catch (e) { return false; } },
    carregar() {
      try { const t = localStorage.getItem(CHAVE); return t ? JSON.parse(t) : null; } catch (e) { return null; }
    },
    apagar() { try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } },
    exportar(st) { return JSON.stringify(st); },
    // Valida o mínimo antes de aceitar uma campanha importada
    importar(texto) {
      const st = JSON.parse(texto);
      if (!st || st.v !== 1 || !st.hero || !st.mundo) throw new Error('Este ficheiro não é uma campanha de Crónicas de Valdemora.');
      return st;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
