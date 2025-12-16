// js/hubEngine.js
// Global, character-agnostic conversation hub engine
// Classic script architecture (no imports)

(function () {
  if (window.HubEngine) return;

  const HubEngine = {};

  // ----------------------------
  // Internal helpers
  // ----------------------------

  function getAffinity(characterId) {
    return window.HP_STATE?.affinity?.[characterId] ?? 0;
  }

  function getInteractionCount(characterId) {
    return window.HP_STATE?.interactionCount?.[characterId] ?? 0;
  }

  function incrementInteraction(characterId) {
    if (!window.HP_STATE.interactionCount) {
      window.HP_STATE.interactionCount = {};
    }
    window.HP_STATE.interactionCount[characterId] =
      (window.HP_STATE.interactionCount[characterId] ?? 0) + 1;
  }

  function applyAffinity(characterId, delta) {
    if (!window.HP_STATE.affinity) {
      window.HP_STATE.affinity = {};
    }
    window.HP_STATE.affinity[characterId] =
      (window.HP_STATE.affinity[characterId] ?? 0) + delta;
  }

  function getRomanceData(characterId) {
    return window.HP_ROMANCE_DATA?.[characterId] ?? null;
  }

  // ----------------------------
  // Public API
  // ----------------------------

  /**
   * Enter hub mode for a character
   */
  HubEngine.enter = function (characterId) {
    if (!window.HP_STATE) window.HP_STATE = {};

    window.HP_STATE.mode = "hub";
    window.HP_STATE.currentCharacter = characterId;

    if (!window.HP_STATE.interactionCount) {
      window.HP_STATE.interactionCount = {};
    }
    if (!window.HP_STATE.affinity) {
      window.HP_STATE.affinity = {};
    }

    // Do not reset affinity here — approach already set it
  };

  /**
   * Returns current hub context
   */
  HubEngine.getContext = function () {
    const characterId = window.HP_STATE.currentCharacter;
    return {
      characterId,
      location: window.HP_STATE.currentLocation,
      affinity: getAffinity(characterId),
      interactionCount: getInteractionCount(characterId),
    };
  };

  /**
   * Select interaction choices based on affinity + location
   */
  HubEngine.getChoices = function () {
    const ctx = HubEngine.getContext();
    const romance = getRomanceData(ctx.characterId);
    if (!romance) return [];

    const validChoices = [];

    for (const styleKey in romance.styles) {
      const style = romance.styles[styleKey];

      // Location filtering (if specified)
      if (style.locations && !style.locations.includes(ctx.location)) {
        continue;
      }

      // Affinity range filtering
      if (
        typeof style.min_affinity === "number" &&
        ctx.affinity < style.min_affinity
      ) continue;

      if (
        typeof style.max_affinity === "number" &&
        ctx.affinity > style.max_affinity
      ) continue;

      validChoices.push({
        id: styleKey,
        label: style.label,
        delta: style.delta,
        romance_style: styleKey,
      });
    }

    // Shuffle
    for (let i = validChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validChoices[i], validChoices[j]] = [validChoices[j], validChoices[i]];
    }

    // Choose 2 or 3
    const count = Math.random() < 0.25 ? 3 : 2;
    return validChoices.slice(0, count);
  };

  /**
   * Apply a hub choice and loop
   */
  HubEngine.applyChoice = function (choice) {
    const characterId = window.HP_STATE.currentCharacter;
    if (!characterId) return;

    applyAffinity(characterId, choice.delta);
    incrementInteraction(characterId);
  };

  /**
   * Check if endings should be offered
   */
  HubEngine.shouldOfferEnding = function () {
    const ctx = HubEngine.getContext();
    return ctx.interactionCount >= 4;
  };

  // ----------------------------
  // Expose globally
  // ----------------------------
  window.HubEngine = HubEngine;
})();
