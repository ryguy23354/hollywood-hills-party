// hubEngine.js
// Global "hub" chooser that turns per-character romance configuration into a dynamic scene.
// This module is intentionally defensive: it should never throw, and it should always provide a safe fallback.
//
// Expected globals (if present):
// - window.StoryEngine  (must expose .scenes and optionally .getAffinity(characterId))
// - window.HP_STATE     (optional; if present we update currentSceneId for renderer integration)
//
// The hub scene id injected into StoryEngine.scenes is: "__hub__"

(function () {
  "use strict";

  const HUB_SCENE_ID = "__hub__";

  const _state = {
    ctx: {
      character: null,
      location: null,
      affinity: 0,
    },
  };

  function _safeNumber(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
  }

  function _getAffinity(characterId) {
    try {
      if (window.StoryEngine && typeof window.StoryEngine.getAffinity === "function") {
        return _safeNumber(window.StoryEngine.getAffinity(characterId), 0);
      }
      // Common alternative: StoryEngine.affinity[characterId]
      if (window.StoryEngine && window.StoryEngine.affinity && characterId in window.StoryEngine.affinity) {
        return _safeNumber(window.StoryEngine.affinity[characterId], 0);
      }
    } catch (_) {}
    return 0;
  }

  function setContext(partial) {
    if (!partial || typeof partial !== "object") return;
    _state.ctx = {
      character: partial.character ?? _state.ctx.character,
      location: partial.location ?? _state.ctx.location,
      affinity: _safeNumber(partial.affinity ?? _state.ctx.affinity, 0),
    };
  }

  function getContext() {
    return { ..._state.ctx };
  }

  /**
   * Resolve the romance config for a character. We support a few shapes:
   * - window.HP_STATE.romance[characterId]
   * - window.HP_ROMANCE[characterId]
   * - A scene object in StoryEngine.scenes under `romance_${characterId}` (JSON imported as scenes)
   */
  function _getRomanceConfig(characterId) {
    try {
      if (window.HP_STATE?.romance && window.HP_STATE.romance[characterId]) return window.HP_STATE.romance[characterId];
      if (window.HP_ROMANCE && window.HP_ROMANCE[characterId]) return window.HP_ROMANCE[characterId];

      const se = window.StoryEngine;
      if (se?.scenes) {
        const keyA = `romance_${characterId}`;
        const keyB = `romance_${String(characterId).toLowerCase()}`;
        if (se.scenes[keyA] && typeof se.scenes[keyA] === "object") return se.scenes[keyA];
        if (se.scenes[keyB] && typeof se.scenes[keyB] === "object") return se.scenes[keyB];
      }
    } catch (_) {}
    return null;
  }

  function _fallbackNextSceneId() {
    // Prefer explicit intro if present; otherwise fall back to whatever renderer is currently on.
    if (window.StoryEngine?.scenes?.scene_00_intro) return "scene_00_intro";
    if (window.HP_STATE?.currentSceneId) return window.HP_STATE.currentSceneId;
    return "scene_00_intro";
  }

  /**
   * Build the hub "choices" from romance config.
   * Returned format matches your renderer conventions: an object map of key -> targetId (scene id or object).
   */
  function _buildChoiceMapFromRomance(romance, ctx) {
    const choices = {};

    // If there's no config, we still offer a safe exit.
    if (!romance || typeof romance !== "object") {
      choices.return_to_party = _fallbackNextSceneId();
      return choices;
    }

    const styles = romance.styles && typeof romance.styles === "object" ? romance.styles : null;
    if (!styles) {
      choices.return_to_party = romance.return_to_party ?? _fallbackNextSceneId();
      return choices;
    }

    // Preserve original ordering where possible.
    const entries = Object.entries(styles);

    for (const [styleKey, style] of entries) {
      if (!style || typeof style !== "object") continue;

      // Location filtering
      if (Array.isArray(style.locations) && ctx.location && !style.locations.includes(ctx.location)) continue;

      // Affinity gating
      if (typeof style.min_affinity === "number" && ctx.affinity < style.min_affinity) continue;
      if (typeof style.max_affinity === "number" && ctx.affinity > style.max_affinity) continue;

      // Determine label & next
      const label = style.label || styleKey;
      const next =
        style.next ??
        style.nextScene ??
        style.scene ??
        romance.default_next ??
        romance.defaultNext ??
        romance.next ??
        null;

      // If next is still missing, we *still* include the choice as an affinity-only object so renderer can apply it and stay in hub.
      if (!next) {
        choices[styleKey] = {
          label,
          romance_style: styleKey,
          delta: _safeNumber(style.delta ?? style.affinity_delta ?? 0, 0),
        };
        continue;
      }

      // If the renderer expects "approach objects", return an object (not a string scene id).
      // This lets renderer apply affinity and then re-enter hub without needing per-choice hub scene ids.
      choices[styleKey] = {
        label,
        romance_style: styleKey,
        delta: _safeNumber(style.delta ?? style.affinity_delta ?? 0, 0),
        next, // keep for engines that want to route immediately
      };
    }

    // Always provide an exit
    choices.return_to_party = romance.return_to_party ?? _fallbackNextSceneId();
    return choices;
  }

  /**
   * Create the actual injected hub scene object.
   * This is what renderer will render when currentSceneId === "__hub__".
   */
  function buildHubScene() {
    const ctx = getContext();
    const romance = ctx.character ? _getRomanceConfig(ctx.character) : null;

    const title =
      romance?.title ||
      (ctx.character ? `${ctx.character} — Hub` : "Hub");

    const text =
      romance?.description ||
      romance?.text ||
      "Choose how you want to approach. Your choices shape the vibe of the night.";

    const image =
      // Optional: support location-based hub images if you add them later.
      romance?.images?.[ctx.location] ||
      romance?.image ||
      null;

    return {
      title,
      text,
      image,
      // Your renderer supports either `choices` or `options` depending on version.
      choices: _buildChoiceMapFromRomance(romance, ctx),
    };
  }

  /**
   * Enter hub mode for a character & location.
   * - Updates HubEngine context
   * - Injects a synthetic scene into StoryEngine.scenes under "__hub__"
   * - Switches HP_STATE.currentSceneId to "__hub__" so renderer can redraw
   */
  function enter(characterId, locationId) {
    const affinity = _getAffinity(characterId);
    setContext({ character: characterId, location: locationId, affinity });

    try {
      const scene = buildHubScene();
      if (window.StoryEngine && window.StoryEngine.scenes) {
        window.StoryEngine.scenes[HUB_SCENE_ID] = scene;
      }
      if (window.HP_STATE) {
        window.HP_STATE.currentSceneId = HUB_SCENE_ID;
      }
    } catch (e) {
      console.error("HubEngine.enter failed:", e);
    }

    return HUB_SCENE_ID;
  }

  // Public API
  window.HubEngine = {
    HUB_SCENE_ID,
    setContext,
    getContext,
    buildHubScene,
    enter,
  };
})();
