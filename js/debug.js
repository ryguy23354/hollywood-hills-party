// Debug Overlay System
// Activation: ?debug=1 URL param, or Shift+D to toggle at runtime
(function () {

  // URL param activation
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "1") {
    window.HP_CONFIG = window.HP_CONFIG || {};
    HP_CONFIG.DEBUG_MODE = true;
  }

  function ensureOverlay() {
    let d = document.getElementById("hp-debug");
    if (!d) {
      d = document.createElement("div");
      d.id = "hp-debug";
      d.style.cssText = [
        "position:fixed", "top:10px", "right:10px",
        "background:rgba(0,0,0,0.75)", "color:#0f0",
        "padding:10px 12px", "font-size:11px", "z-index:9999",
        "white-space:pre", "font-family:monospace",
        "max-width:240px", "border:1px solid #0f0",
        "border-radius:6px", "line-height:1.5",
        "pointer-events:none"
      ].join(";");
      document.body.appendChild(d);
    }
    return d;
  }

  window.hpDebugRender = function () {
    if (!window.HP_CONFIG?.DEBUG_MODE) {
      const d = document.getElementById("hp-debug");
      if (d) d.style.display = "none";
      return;
    }

    const d = ensureOverlay();
    d.style.display = "block";

    const state   = window.HP_STATE;
    const hubCtx  = window.HubEngine?.getContext?.() || null;

    // Current scene & hub context
    const sceneId = state?.currentSceneId || "?";
    const inHub   = sceneId === "__hub__";

    // Active character: prefer HubEngine ctx, fall back to HP_STATE
    const activeChar = hubCtx?.character || state?.currentCharacter || state?.activeCharacter || null;

    // Affinity map from authoritative store
    const affinities = state?.affinity || {};

    let s = "── DEBUG ──\n";
    s += "Scene: " + sceneId + "\n";

    if (inHub && activeChar) {
      const aff = affinities[activeChar] ?? 0;
      const ints = state?.interactions?.[activeChar] ?? 0;
      s += "\n── Hub ──\n";
      s += "Char:   " + activeChar + "\n";
      s += "Aff:    " + aff + "\n";
      s += "Turns:  " + ints + "\n";
    }

    const entries = Object.entries(affinities);
    if (entries.length > 0) {
      s += "\n── Affinities ──\n";
      entries.forEach(([char, val]) => {
        const marker = char === activeChar ? " ◀" : "";
        s += char + ": " + val + marker + "\n";
      });
    }

    d.textContent = s;
  };

  // Auto-refresh every 500ms while debug mode is on so the overlay
  // stays current after affinity changes without needing manual calls.
  setInterval(function () {
    if (window.HP_CONFIG?.DEBUG_MODE) {
      window.hpDebugRender();
    }
  }, 500);

  // Keyboard toggle: Shift+D
  document.addEventListener("keydown", function (e) {
    if (e.key === "D" && e.shiftKey) {
      window.HP_CONFIG = window.HP_CONFIG || {};
      HP_CONFIG.DEBUG_MODE = !HP_CONFIG.DEBUG_MODE;
      window.hpDebugRender();
    }
  });

  // Initial render on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    if (window.HP_CONFIG?.DEBUG_MODE) window.hpDebugRender();
  });

})();
