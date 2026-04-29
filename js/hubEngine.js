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
      interactions: 0,
    },
  };

  function _safeNumber(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
  }

  // FIX 1: Read affinity from HP_STATE first (the authoritative store).
  // The old version tried StoryEngine.getAffinity() which doesn't exist, always returning 0.
  function _getAffinity(characterId) {
    try {
      if (window.HP_STATE) {
        if (typeof window.HP_STATE.getAffinity === "function") {
          return _safeNumber(window.HP_STATE.getAffinity(characterId), 0);
        }
        if (window.HP_STATE.affinity && characterId in window.HP_STATE.affinity) {
          return _safeNumber(window.HP_STATE.affinity[characterId], 0);
        }
      }
      // Legacy fallbacks
      if (window.StoryEngine && typeof window.StoryEngine.getAffinity === "function") {
        return _safeNumber(window.StoryEngine.getAffinity(characterId), 0);
      }
      if (window.StoryEngine && window.StoryEngine.affinity && characterId in window.StoryEngine.affinity) {
        return _safeNumber(window.StoryEngine.affinity[characterId], 0);
      }
    } catch (_) {}
    return 0;
  }

  function _applyInteraction(delta = 0) {
    if (!_state.ctx) return;
    _state.ctx.interactions += 1;
    _state.ctx.affinity += delta;
  }

  function setContext(partial) {
    if (!partial || typeof partial !== "object") return;
    _state.ctx = {
      character: partial.character ?? _state.ctx.character,
      location: partial.location ?? _state.ctx.location,
      affinity: _safeNumber(partial.affinity ?? _state.ctx.affinity, 0),
      interactions: _safeNumber(partial.interactions ?? _state.ctx.interactions, 0),
    };
  }

  function getContext() {
    return { ..._state.ctx };
  }

  /**
   * Resolve the romance config for a character. We support a few shapes:
   * - window.HP_STATE.romance[characterId]
   * - window.HP_ROMANCE[characterId]
   * - A scene object in StoryEngine.scenes under `romance_${characterId}`
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
    if (window.StoryEngine?.scenes?.scene_00_intro) return "scene_00_intro";
    if (window.HP_STATE?.currentSceneId) return window.HP_STATE.currentSceneId;
    return "scene_00_intro";
  }

  /**
   * FIX 2: Build choices from 'styles' when 'conversation_starters' isn't present.
   * The old version only read conversation_starters, but all romance.json files use 'styles',
   * so the hub always generated zero choices (just "Return to party").
   */
  function _buildChoiceArrayFromRomance(romance, ctx) {
    const choices = [];

    const starters = romance?.conversation_starters || romance?.starters;
    const styles = romance?.styles;

    if (starters && typeof starters === "object") {
      // Legacy format: conversation_starters
      for (const starter of Object.values(starters)) {
        choices.push({
          label: starter.label,
          target: {
            type: "romance",
            romance_style: starter.romance_style,
            delta: Number(starter.delta ?? starter.affinity_delta ?? 0),
            next:
              starter.next ??
              starter.scene ??
              romance.default_next ??
              null,
          },
        });
      }
    } else if (styles && typeof styles === "object") {
      // Filter pool by affinity. Styles can declare min_affinity / max_affinity to gate
      // when they appear. Styles without thresholds are always available.
      // TODO (future): also filter by ctx.location when style.locations is defined.
      const currentAffinity = _getAffinity(ctx.character);
      const fullPool = Object.entries(styles).map(([styleKey, styleData]) => ({
        label: styleData.label || styleKey,
        minAff: styleData.min_affinity !== undefined ? styleData.min_affinity : -Infinity,
        maxAff: styleData.max_affinity !== undefined ? styleData.max_affinity : Infinity,
        target: { type: "romance", romance_style: styleKey, character: ctx.character },
      }));

      let pool = fullPool.filter(s => currentAffinity >= s.minAff && currentAffinity <= s.maxAff);
      if (pool.length === 0) pool = fullPool; // safety: never strand the player

      // Shuffle and pick 3. As affinity grows, the eligible pool shifts.
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      shuffled.slice(0, Math.min(3, shuffled.length)).forEach(c => choices.push(c));
    }

    // Ending unlock — surfaces when affinity crosses the romance.ending threshold.
    // The ending option appears above "Return to party" and routes to a scene directly.
    if (romance?.ending) {
      const endingMinAff = romance.ending.min_affinity !== undefined
        ? romance.ending.min_affinity : Infinity;
      const currentAff = styles ? _getAffinity(ctx.character) : 0;
      if (currentAff >= endingMinAff) {
        choices.push({
          label: romance.ending.label || "Share a private moment",
          target: romance.ending.scene || "scene_success_end",
        });
      }
    }

    // Always allow escape
    choices.push({
      label: "Return to party",
      target: romance?.return_to_party ?? _fallbackNextSceneId(),
    });

    return choices;
  }

  /**
   * Create the actual injected hub scene object.
   * This is what renderer will render when currentSceneId === "__hub__".
   */
  function buildHubScene() {
    const ctx = getContext();
    const romance = ctx.character ? _getRomanceConfig(ctx.character) : null;

    const charName =
      romance?.display_name ||
      window.HP_CONFIG?.CHARACTER_DISPLAY?.[ctx.character]?.name ||
      (ctx.character ? ctx.character.charAt(0).toUpperCase() + ctx.character.slice(1) : "");

    const locName =
      window.HP_CONFIG?.LOCATION_DISPLAY?.[ctx.location] ||
      (ctx.location ? ctx.location.charAt(0).toUpperCase() + ctx.location.slice(1) : "");

    const firstName = charName.split(" ")[0];

    const title =
      romance?.title ||
      (firstName && locName ? `${firstName} — ${locName}` : firstName || "Hub");

    const text =
      romance?.description ||
      romance?.text ||
      romance?.prompt ||
      "Choose how you want to approach. Your choices shape the vibe of the night.";

    // Pick a random image from the manifest for this character + location.
    // Manifest paths already include the "images/" folder prefix — use them as-is.
    // Falls back to naming convention if the combo isn't in the manifest.
    let image = romance?.images?.[ctx.location] || romance?.image || null;
    if (!image && ctx.character && ctx.location) {
      const manifestPool =
        window.HP_STATE?.images?.[ctx.character]?.[ctx.location];
      if (Array.isArray(manifestPool) && manifestPool.length > 0) {
        image = manifestPool[Math.floor(Math.random() * manifestPool.length)];
      } else {
        image = "images/" + ctx.character + "_" + ctx.location + "_01.jpg";
      }
    }

    return {
      title,
      text,
      image,
      choices: _buildChoiceArrayFromRomance(romance, ctx),
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
    setContext({
      character: characterId,
      location: locationId,
      affinity,
      interactions: 0, // reset on first approach
    });

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

  /**
   * FIX 3 & 4: applyChoice — the missing link between a player picking a style and
   * the affinity system actually responding.
   *
   * What it does:
   *   1. Reads current affinity from HP_STATE for this character
   *   2. Finds the matching reaction band from romance.styles[styleKey].reactions
   *   3. Applies the reaction's delta to HP_STATE
   *   4. Increments the interaction counter (without resetting hub context)
   *   5. Rebuilds the hub scene with the reaction text as the new scene text
   *   6. Re-injects the updated scene so hpRenderScene("__hub__") picks it up
   *   7. Returns HUB_SCENE_ID so the renderer knows what to render next
   */
  function applyChoice(characterId, styleKey) {
    const romance = _getRomanceConfig(characterId);

    if (!romance) {
      console.warn("[HubEngine.applyChoice] No romance config found for:", characterId);
      return HUB_SCENE_ID;
    }

    const style = romance.styles?.[styleKey];
    let reactionText = "";
    let delta = 0;

    if (!style) {
      // Style key not found — use romance-level fallback
      const fallback = romance.fallback;
      reactionText = fallback?.text ?? "";
      delta = _safeNumber(fallback?.delta, 0);
    } else {
      const affinity = _getAffinity(characterId);

      // Find the reaction band whose min_affinity/max_affinity range contains current affinity
      let reaction = null;
      if (Array.isArray(style.reactions)) {
        reaction = style.reactions.find(
          r =>
            affinity >= _safeNumber(r.min_affinity, -Infinity) &&
            affinity <= _safeNumber(r.max_affinity, Infinity)
        );
        // If no band matched, use the first one as a safe fallback
        if (!reaction) reaction = style.reactions[0];
      }

      if (!reaction) {
        const fallback = romance.fallback;
        reactionText = fallback?.text ?? "";
        delta = _safeNumber(fallback?.delta, 0);
      } else {
        reactionText = reaction.text ?? "";
        delta = _safeNumber(reaction.delta, 0);
      }
    }

    // Apply delta and increment interaction count in HP_STATE
    if (window.HP_STATE) {
      if (typeof HP_STATE.modifyAffinity === "function") {
        HP_STATE.modifyAffinity(characterId, delta);
      } else if (HP_STATE.affinity) {
        HP_STATE.affinity[characterId] = (HP_STATE.affinity[characterId] ?? 0) + delta;
      }
      if (typeof HP_STATE.incrementInteractions === "function") {
        HP_STATE.incrementInteractions(characterId);
      }
    }

    // Update internal hub context — increment, don't reset
    _state.ctx.interactions += 1;
    _state.ctx.affinity += delta;

    // Rebuild the hub scene with the reaction text and fresh style choices
    const scene = buildHubScene();
    scene.text = reactionText || scene.text;

    if (window.StoryEngine?.scenes) {
      window.StoryEngine.scenes[HUB_SCENE_ID] = scene;
    }
    if (window.HP_STATE) {
      window.HP_STATE.currentSceneId = HUB_SCENE_ID;
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
    applyChoice,  // NEW: wires style choices through reaction lookup + delta application
  };
})();
