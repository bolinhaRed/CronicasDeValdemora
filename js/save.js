/* Crónicas de Valdemora — gravação local, exportação e importação. */
(function (G) {
  const CP = G.CP = G.CP || {};
  const CHAVE = 'cronicas-profundezas.v1';
  // campanhas de versões anteriores: acrescenta o que falta
  function migrar(st) {
    if (!st) return st;
    st.hero.reliquias = st.hero.reliquias || []; st.hero.talentos = st.hero.talentos || [];
    st.mundo.bestiario = st.mundo.bestiario || {}; st.mundo.melhorias = st.mundo.melhorias || {};
    st.mundo.missoes.forEach(m => { m.ameaca = m.ameaca || 1; });
    st.hero.ferimentos = st.hero.ferimentos || []; if (st.hero.companheiro === undefined) st.hero.companheiro = null;
    if (!st.mundo.campanha) {   // campanhas antigas entram na história conforme o que já fizeram
      const n = st.mundo.historico.length;
      st.mundo.campanha = { ato: n >= 3 ? 2 : 1, sucessos: n, fragmentos: [], feitos: [], sombra: 0, cena: n >= 3 ? 'ato2' : null, fim: null };
      if (n >= 3) st.mundo.flags.negrume = true;
    }
    if (st.exp) {
      st.exp.folego = st.exp.folego == null ? 3 : st.exp.folego; st.exp.fraquezas = st.exp.fraquezas || {};
      if (st.exp.combate && !st.exp.combate.dados) st.exp.combate = null;   // combate antigo: recomeça na próxima ação
    }
    return st;
  }
  CP.Save = {
    guardar(st) { try { localStorage.setItem(CHAVE, JSON.stringify(st)); return true; } catch (e) { return false; } },
    carregar() {
      try { const t = localStorage.getItem(CHAVE); return t ? migrar(JSON.parse(t)) : null; } catch (e) { return null; }
    },
    apagar() { try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } },
    exportar(st) { return JSON.stringify(st); },
    // Valida o mínimo antes de aceitar uma campanha importada
    importar(texto) {
      const st = JSON.parse(texto);
      if (!st || st.v !== 1 || !st.hero || !st.mundo) throw new Error('Este ficheiro não é uma campanha de Crónicas de Valdemora.');
      return migrar(st);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
