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

  // Read affinity from HP_STATE first (the authoritative store).
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
   * Resolve the romance config for a character.
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
   * Returns the delta a style would apply at the given affinity WITHOUT applying it.
   * Used to annotate choice labels in debug mode.
   */
  function _peekDelta(romance, styleKey, affinity) {
    const style = romance?.styles?.[styleKey];
    if (!style) return _safeNumber(romance?.fallback?.delta, 0);
    const band = Array.isArray(style.reactions)
      ? style.reactions.find(
          r =>
            affinity >= _safeNumber(r.min_affinity, -Infinity) &&
            affinity <= _safeNumber(r.max_affinity, Infinity)
        ) || style.reactions[0]
      : null;
    return _safeNumber(band?.delta, 0);
  }

  function _isDebug() {
    return !!window.HP_CONFIG?.DEBUG_MODE;
  }

  /**
   * Full game reset: wipe all affinity and interaction counters, then restart.
   * Used as the function target on ending exit buttons so the renderer can
   * call it directly without needing a special scene ID.
   */
  function _fullReset() {
    try {
      if (window.HP_STATE) {
        window.HP_STATE.affinity = {};
        window.HP_STATE.interactions = {};
        window.HP_STATE.currentSceneId = null;
        delete window.HP_STATE.locationAssignments;
      }
      // Reset internal hub state too
      _state.ctx = { character: null, location: null, affinity: 0, interactions: 0 };
    } catch (_) {}

    if (typeof window.hpRestartNight === "function") {
      window.hpRestartNight();
    } else if (typeof window.hpLoadScene === "function") {
      window.hpLoadScene("scene_00_intro");
    }
  }

  /**
   * Build choices from romance config.
   *
   * interactions === 0 AND affinity === 0 (genuine first approach):
   *   Uses romance.opening_moves — a fixed [positive, neutral, negative] triple
   *   written to match the character's personality.
   *
   * Any subsequent visit (turns > 0 OR affinity != 0):
   *   Random pool drawn from styles, filtered by affinity gates, shuffled to 3.
   *
   * Either path also appends any unlocked endings above "Return to party".
   * Ending exit buttons use a function target so the renderer triggers a full
   * game reset (affinity + interactions wiped) rather than a soft scene nav.
   */
  function _buildChoiceArrayFromRomance(romance, ctx) {
    const choices = [];

    const starters = romance?.conversation_starters || romance?.starters;
    const styles = romance?.styles;
    const currentAffinity = _getAffinity(ctx.character);
    const isFirstApproach = ctx.interactions === 0 && currentAffinity === 0;
    const openingMoves = romance?.opening_moves;

    if (isFirstApproach && Array.isArray(openingMoves) && openingMoves.length > 0) {
      // Fixed opening triple — guaranteed positive / neutral / negative variety.
      openingMoves.forEach(move => {
        const baseLabel = move.label;
        let label = baseLabel;
        if (_isDebug()) {
          const d = _peekDelta(romance, move.romance_style, currentAffinity);
          label = `${baseLabel}  [${d >= 0 ? "+" : ""}${d}]`;
          if (move.tier) label += ` {${move.tier}}`;
        }
        choices.push({
          label,
          target: {
            type: "romance",
            romance_style: move.romance_style,
            character: ctx.character,
          },
        });
      });
    } else if (starters && typeof starters === "object") {
      for (const starter of Object.values(starters)) {
        choices.push({
          label: starter.label,
          target: {
            type: "romance",
            romance_style: starter.romance_style,
            delta: Number(starter.delta ?? starter.affinity_delta ?? 0),
            next: starter.next ?? starter.scene ?? romance.default_next ?? null,
          },
        });
      }
    } else if (styles && typeof styles === "object") {
      const fullPool = Object.entries(styles).map(([styleKey, styleData]) => {
        const baseLabel = styleData.label || styleKey;
        let label = baseLabel;
        if (_isDebug()) {
          const d = _peekDelta(romance, styleKey, currentAffinity);
          label = `${baseLabel}  [${d >= 0 ? "+" : ""}${d}]`;
        }
        return {
          label,
          minAffinity: styleData.min_affinity ?? -Infinity,
          maxAffinity: styleData.max_affinity ?? Infinity,
          target: {
            type: "romance",
            romance_style: styleKey,
            character: ctx.character,
          },
        };
      });

      let pool = fullPool.filter(
        s => currentAffinity >= s.minAffinity && currentAffinity <= s.maxAffinity
      );
      if (pool.length === 0) pool = fullPool;

      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      shuffled.slice(0, Math.min(3, shuffled.length)).forEach(c => choices.push(c));
    }

    // Unlocked endings — injected as extra choices above "Return to party".
    // Exit buttons use _fullReset as a function target so the renderer triggers
    // a complete game reset instead of a soft scene navigation.
    const endings = romance?.endings;
    if (Array.isArray(endings) && endings.length > 0) {
      endings.forEach(ending => {
        const threshold = _safeNumber(ending.min_affinity, Infinity);
        if (currentAffinity >= threshold && ending.id) {
          if (window.StoryEngine?.scenes) {
            window.StoryEngine.scenes[ending.id] = {
              title: ending.title || ending.label || "The End",
              text: ending.text || "",
              image: ending.image ||
                (ctx.character && ctx.location
                  ? `images/${ctx.character}_${ctx.location}_01.jpg`
                  : null),
              choices: [
                {
                  label: ending.exit_label || "Start a new night",
                  target: _fullReset,
                }
              ],
            };
          }
          const endingLabel = _isDebug() && ending.tier
            ? `${ending.label}  [${ending.tier} ending]`
            : ending.label;
          choices.push({
            label: endingLabel,
            target: ending.id,
          });
        }
      });
    }

    choices.push({
      label: "Return to party",
      target: romance?.return_to_party ?? _fallbackNextSceneId(),
    });

    return choices;
  }

  /**
   * Returns the affinity-appropriate scene-setter text from romance.context_states.
   */
  function _getContextText(romance, affinity) {
    const states = romance?.context_states;
    if (Array.isArray(states) && states.length > 0) {
      const match = states.find(s => {
        const min = s.min_affinity ?? -Infinity;
        const max = s.max_affinity ?? Infinity;
        return affinity >= min && affinity <= max;
      });
      if (match?.text) return match.text;
    }
    return romance?.prompt || romance?.description || "";
  }

  /**
   * Create the injected hub scene object.
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

    const affinity = _getAffinity(ctx.character);
    const text =
      _getContextText(romance, affinity) ||
      "Choose how you want to approach. Your choices shape the vibe of the night.";

    let image = romance?.images?.[ctx.location] || romance?.image || null;
    if (!image && ctx.character && ctx.location) {
      const manifestPool = window.HP_STATE?.images?.[ctx.character]?.[ctx.location];
      if (Array.isArray(manifestPool) && manifestPool.length > 0) {
        const picked = manifestPool[Math.floor(Math.random() * manifestPool.length)];
        image = picked; // keep full "images/" prefix from manifest
      } else {
        image = `images/${ctx.character}_${ctx.location}_01.jpg`;
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
   */
  function enter(characterId, locationId) {
    const affinity = _getAffinity(characterId);
    setContext({ character: characterId, location: locationId, affinity, interactions: 0 });

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
   * applyChoice — wires a player style pick through the full reaction/delta pipeline.
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
      const fallback = romance.fallback;
      reactionText = fallback?.text ?? "";
      delta = _safeNumber(fallback?.delta, 0);
    } else {
      const affinity = _getAffinity(characterId);

      let reaction = null;
      if (Array.isArray(style.reactions)) {
        reaction = style.reactions.find(
          r =>
            affinity >= _safeNumber(r.min_affinity, -Infinity) &&
            affinity <= _safeNumber(r.max_affinity, Infinity)
        );
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

    if (window.HP_STATE) {
      if (typeof window.HP_STATE.modifyAffinity === "function") {
        window.HP_STATE.modifyAffinity(characterId, delta);
      } else if (window.HP_STATE.affinity) {
        window.HP_STATE.affinity[characterId] = (window.HP_STATE.affinity[characterId] ?? 0) + delta;
      }
      if (typeof window.HP_STATE.incrementInteractions === "function") {
        window.HP_STATE.incrementInteractions(characterId);
      }
    }

    _state.ctx.interactions += 1;
    _state.ctx.affinity += delta;

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
    applyChoice,
  };
})();
