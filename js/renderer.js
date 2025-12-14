// js/renderer.js
// Renderer for classic-script architecture.
// IMPORTANT: Exposes all needed functions on window (no import/export).

(function () {
  if (window.HP_RendererLoaded) return;
  window.HP_RendererLoaded = true;

  // -------- helpers: DOM element lookup with legacy-id compatibility --------
  function elById(primaryId, fallbackId) {
    return (
      document.getElementById(primaryId) ||
      (fallbackId ? document.getElementById(fallbackId) : null) ||
      null
    );
  }

  function getSceneTitleEl() {
    // legacy HTML uses kebab-case ids
    return elById("scene-title", "sceneTitle");
  }
  function getSceneTextEl() {
    return elById("scene-text", "sceneText");
  }
  function getSceneLocationEl() {
    // legacy uses a single meta line container
    return elById("meta-line", "sceneLocation");
  }
  function getSceneImageEl() {
    return elById("scene-image", "sceneImage");
  }
  function getChoicesContainerEl() {
    // Prefer legacy container for correct styling; fall back if needed.
    return elById("choices", "choicesContainer") || elById("choicesContainer", null);
  }

  // -------- scene-id parsing --------
  function hpGetLocationKeyForScene(sceneId) {
    const m = /^scene_(bar|pool|lounge|balcony|gameloft)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  function hpGetCharacterKeyForScene(sceneId) {
    const m = /^scene_(sienna|riley|luna|harper|mara)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  function hpGetSceneTitle(sceneId) {
    if (!window.HP_CONFIG) return "";
    if (sceneId === window.HP_CONFIG.START_SCENE_ID) return "Hollywood Hills Party";
    const locKey = hpGetLocationKeyForScene(sceneId);
    if (locKey) return window.HP_CONFIG.LOCATION_DISPLAY?.[locKey] || locKey;
    const charKey = hpGetCharacterKeyForScene(sceneId);
    if (charKey) return window.HP_CONFIG.CHARACTER_DISPLAY?.[charKey]?.name || charKey;
    return "";
  }

  // -------- image resolution --------
  function hpResolveImageForScene(sceneId, scene) {
    const base = "images/";
    const isIntro = window.HP_CONFIG && sceneId === window.HP_CONFIG.START_SCENE_ID;
    const locKeyFromId = hpGetLocationKeyForScene(sceneId);
    const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

    // 1) Global intro
    if (isIntro) return base + "scene_00_intro.jpg";

    // 2) Location intro: scene_<loc>_01
    if (
      locKeyFromId &&
      /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) &&
      !charKeyFromId
    ) {
      return base + locKeyFromId + ".jpg";
    }

    // 3) Character intro: scene_<char>_00_intro (use active location variant)
    if (charKeyFromId && /^scene_(sienna|riley|luna|harper|mara)_00_intro$/i.test(sceneId)) {
      const activeLoc =
        (window.HP_STATE && window.HP_STATE.currentLocation) ||
        (typeof window.hpGuessLocationForCharacter === "function"
          ? window.hpGuessLocationForCharacter(charKeyFromId)
          : null);
      if (activeLoc) return base + `${charKeyFromId}_${activeLoc}_01.jpg`;
    }

    // 4) Explicit image from JSON
    if (scene && typeof scene.image === "string" && scene.image.trim() !== "") {
      const name = scene.image.trim();
      if (/^(?:https?:)?\/\//i.test(name)) return name; // allow absolute/hosted
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return base + name;
      return base + name + ".jpg";
    }

    // 5) Fallback for character scenes without explicit image
    const activeChar = (window.HP_STATE && window.HP_STATE.currentCharacter) || charKeyFromId;
    const activeLoc =
      (window.HP_STATE && window.HP_STATE.currentLocation) ||
      locKeyFromId ||
      (activeChar && typeof window.hpGuessLocationForCharacter === "function"
        ? window.hpGuessLocationForCharacter(activeChar)
        : null);

    if (activeChar && activeLoc) return base + `${activeChar}_${activeLoc}_01.jpg`;

    // 6) Location fallback
    if (locKeyFromId) return base + locKeyFromId + ".jpg";

    // 7) Final fallback
    return base + "default.jpg";
  }

  // -------- choices & button styling --------
  function hpFormatChoiceLabel(choiceKey) {
    const map = {
      bar_area: "Head to the bar",
      pool_area: "Drift toward the pool",
      lounge_area: "Slide into the lounge",
      balcony_area: "Step out onto the balcony",
      gameloft_area: "Climb up to the game loft",
      return_to_party: "Return to the main party",
      return: "Return",
      continue: "Continue",
      leave: "Leave",
    };
    if (choiceKey in map) return map[choiceKey];

    return String(choiceKey)
      .replace(/^go_to_/, "")
      .replace(/^approach_/, "Approach ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function hpCreateChoiceButton(label, onClick) {
    const btn = document.createElement("button");
    // Use your existing CSS styling (legacy uses .choice-btn and .btn)
    btn.className = "btn choice-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // -------- renderers --------
  function hpRenderLocationOverview() {
    if (!window.HP_CONFIG) return;
    if (!window.HP_STATE) window.HP_STATE = {};

    // Ensure we have location assignments
    if (!window.HP_STATE.locationAssignments && typeof window.hpAssignCharactersToLocations === "function") {
      window.hpAssignCharactersToLocations(window.HP_STATE.nightSeed ?? "");
    }

    const container = getChoicesContainerEl();
    if (!container) return;

    // If both containers exist, clear both to avoid duplicates
    const legacyChoices = document.getElementById("choices");
    const modernChoices = document.getElementById("choicesContainer");
    if (legacyChoices) legacyChoices.innerHTML = "";
    if (modernChoices) modernChoices.innerHTML = "";
    container.innerHTML = "";

    const locs = window.HP_LOCATIONS || ["bar", "pool", "lounge", "balcony", "gameloft"];

    for (const locKey of locs) {
      const label =
        (window.HP_CONFIG.LOCATION_DISPLAY && window.HP_CONFIG.LOCATION_DISPLAY[locKey]) ||
        hpFormatChoiceLabel(`${locKey}_area`) ||
        locKey;
      const targetSceneId = `scene_${locKey}_01`;
      container.appendChild(
        hpCreateChoiceButton(label, () => {
          window.HP_STATE.currentLocation = locKey;
          window.HP_STATE.currentCharacter = null;
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(targetSceneId);
          else hpRenderScene(targetSceneId);
        })
      );
    }
  }

  function hpRenderLocationIntroChoices(locKey, container) {
    const assigned =
      (window.HP_STATE && window.HP_STATE.locationAssignments && window.HP_STATE.locationAssignments[locKey]) || [];

    for (const charKey of assigned) {
      const display = window.HP_CONFIG && window.HP_CONFIG.CHARACTER_DISPLAY?.[charKey];
      const label = display ? `Approach ${display.name.split(" ")[0]}` : `Approach ${charKey}`;
      const targetId = `scene_${charKey}_00_intro`;

      container.appendChild(
        hpCreateChoiceButton(label, () => {
          if (!window.HP_STATE) window.HP_STATE = {};
          window.HP_STATE.currentLocation = locKey;
          window.HP_STATE.currentCharacter = charKey;
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(targetId);
          else hpRenderScene(targetId);
        })
      );
    }

    container.appendChild(
      hpCreateChoiceButton("Return to the main party", () => {
        if (!window.HP_STATE) window.HP_STATE = {};
        window.HP_STATE.currentCharacter = null;
        window.HP_STATE.currentLocation = null;
        if (typeof window.hpLoadScene === "function") window.hpLoadScene(window.HP_CONFIG.START_SCENE_ID);
        else hpRenderScene(window.HP_CONFIG.START_SCENE_ID);
      })
    );
  }

  function hpRenderGenericChoices(scene, container) {
    const choices = scene && scene.choices ? scene.choices : {};
    const entries = Object.entries(choices);

    if (!entries.length) {
      container.appendChild(
        hpCreateChoiceButton("Return to the main party", () => {
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(window.HP_CONFIG.START_SCENE_ID);
          else hpRenderScene(window.HP_CONFIG.START_SCENE_ID);
        })
      );
      return;
    }

    for (const [choiceKey, target] of entries) {
      const label = hpFormatChoiceLabel(choiceKey);

      container.appendChild(
        hpCreateChoiceButton(label, () => {
          // AFFINITY / APPROACH choice: object payload (do NOT load a scene)
          if (target && typeof target === "object") {
            if (typeof window.hpApplyAffinityChoice === "function") {
              window.hpApplyAffinityChoice(target);
            } else {
              console.warn("Affinity choice clicked but hpApplyAffinityChoice is missing:", target);
            }
            return;
          }

          // NORMAL scene transition: string sceneId
          if (typeof target === "string") {
            if (typeof window.hpLoadScene === "function") {
              window.hpLoadScene(target);
            } else {
              hpRenderScene(target);
            }
            return;
          }

          console.warn("Unknown choice target type:", target);
        })
      );
    }
  }
})();
