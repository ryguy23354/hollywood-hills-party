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
  function hpIsAffinityChoiceTarget(t) {
    return !!t && typeof t === "object" && ("romance_style" in t || "romanceStyle" in t || "delta" in t);
  }

  function hpResolveCharacterHubSceneId(charId) {
    if (!window.StoryEngine || !charId) return null;
    const candidates = [
      `scene_${charId}_hub`,
      `scene_${charId}_00_hub`,
      `scene_${charId}_01_hub`,
      `scene_${charId}_hub_01`,
      `scene_${charId}_hub_main`,
      `scene_hub_${charId}`,
      "scene_character_hub",
      "scene_affinity_hub",
    ];
    for (const id of candidates) {
      try {
        const s = window.StoryEngine.getScene(id, charId);
        if (s) return id;
      } catch (_) {}
    }
    return null;
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
    const activeChar = HP_STATE.currentCharacter || null;


    if (!entries.length) {
      container.appendChild(
        hpCreateChoiceButton("Return to the main party", () => {
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(window.HP_CONFIG.START_SCENE_ID);
          else hpRenderScene(window.HP_CONFIG.START_SCENE_ID);
        })
      );
      return;
    }

    for (const [choiceKey, targetId] of entries) {
      const label = hpFormatChoiceLabel(choiceKey);
      container.appendChild(
        hpCreateChoiceButton(label, () => {
          // Affinity/approach choices are objects (not scene IDs). Apply affinity and stay in the character hub.
          if (hpIsAffinityChoiceTarget(targetId)) {
            const style = targetId.romance_style ?? targetId.romanceStyle ?? targetId.style;
            const delta = Number(targetId.delta ?? 0);
            try {
              if (window.StoryEngine && style) window.StoryEngine.applyChoice(activeChar, style, delta);
              else console.warn("hpRenderGenericChoices: affinity choice missing StoryEngine/style", targetId);
            } catch (e) {
              console.error("hpRenderGenericChoices: failed to apply affinity choice", e, targetId);
            }

            if (hpIsAffinityChoiceTarget(targetId)) {
			  const style =
				targetId.romance_style ??
				targetId.romanceStyle ??
				targetId.style;

			  const delta = Number(targetId.delta ?? 0);

			  if (window.StoryEngine && style) {
				window.StoryEngine.applyChoice(activeChar, style, delta);
			  }

			  // Enter global hub mode instead of loading a scene
			  if (window.StoryEngine && typeof window.StoryEngine.enterHub === "function") {
				window.StoryEngine.enterHub(activeChar);
			  }

			  // Re-render current state (hub controls content)
			  if (typeof window.hpRenderScene === "function") {
				window.hpRenderScene(HP_STATE.currentSceneId);
			  }

			  return;
			}

          }

          if (typeof window.hpLoadScene === "function") window.hpLoadScene(targetId);
          else hpRenderScene(targetId);
        })
      );
    }
  }

  // Main scene renderer (classic). Driven by StoryEngine.getScene output.
  function hpRenderScene(sceneId, scene) {
    if (!sceneId) return;
    if (!window.HP_STATE) window.HP_STATE = {};

    // If scene wasn't provided, fetch it.
    if (!scene && window.StoryEngine && typeof window.StoryEngine.getScene === "function") {
      scene = window.StoryEngine.getScene(sceneId, window.HP_STATE.currentCharacter || null);
    }

    const sceneTitleEl = getSceneTitleEl();
    const sceneLocationEl = getSceneLocationEl();
    const sceneTextEl = getSceneTextEl();
    const imageEl = getSceneImageEl();

    const container = getChoicesContainerEl();
    if (!container) return;

    // Clear both choice containers if both exist (prevents double render)
    const legacyChoices = document.getElementById("choices");
    const modernChoices = document.getElementById("choicesContainer");
    if (legacyChoices) legacyChoices.innerHTML = "";
    if (modernChoices) modernChoices.innerHTML = "";
    container.innerHTML = "";

    // Missing scene
    if (!scene) {
      if (sceneTitleEl) sceneTitleEl.textContent = "Missing scene";
      if (sceneTextEl) sceneTextEl.textContent = `Scene not found: ${sceneId}`;
      if (imageEl) imageEl.style.display = "none";
      container.appendChild(
        hpCreateChoiceButton("Return to the main party", () => {
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(window.HP_CONFIG.START_SCENE_ID);
        })
      );
      return;
    }

    window.HP_STATE.currentSceneId = sceneId;

    const locKey = hpGetLocationKeyForScene(sceneId);
    const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

    // Location intro scenes update active location
    const isLocationIntro =
      !!locKey &&
      /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) &&
      !charKeyFromId;

    if (isLocationIntro) {
      window.HP_STATE.currentLocation = locKey;
      window.HP_STATE.currentCharacter = null;
    }

    // Title + text
    if (sceneTitleEl) sceneTitleEl.textContent = hpGetSceneTitle(sceneId) || "";
    if (sceneTextEl) sceneTextEl.textContent = scene.text || "";

    // Meta line: keep whatever your index.html expects (often shows Location: X)
    if (sceneLocationEl) {
      if (locKey) {
        const locName = (window.HP_CONFIG && window.HP_CONFIG.LOCATION_DISPLAY?.[locKey]) || locKey;
        sceneLocationEl.textContent = `Location: ${locName}`;
      } else {
        sceneLocationEl.textContent = "";
      }
    }

    // Image
    if (imageEl) {
      const imgPath = hpResolveImageForScene(sceneId, scene);
      if (imgPath) {
        imageEl.src = imgPath;
        imageEl.style.display = "block";

        // Progressive fallbacks (variant images), only if the "character_location_0N.jpg" pattern is relevant.
        imageEl.onerror = function () {
          const activeChar = window.HP_STATE.currentCharacter || charKeyFromId || "";
          const activeLoc =
            window.HP_STATE.currentLocation ||
            locKey ||
            (activeChar && typeof window.hpGuessLocationForCharacter === "function"
              ? window.hpGuessLocationForCharacter(activeChar)
              : "");

          if (activeChar && activeLoc) {
            let v = parseInt(imageEl.dataset.variant || "1", 10);
            if (Number.isNaN(v)) v = 1;

            if (v < 4) {
              v += 1;
              imageEl.dataset.variant = String(v);
              imageEl.src = `images/${activeChar}_${activeLoc}_0${v}.jpg`;
              return;
            }
          }

          // Location fallback
          if (locKey) {
            imageEl.onerror = null;
            imageEl.src = `images/${locKey}.jpg`;
            return;
          }

          // Final: hide the image (do not break the UI)
          imageEl.onerror = null;
          imageEl.style.display = "none";
        };

        // reset variant per scene
        imageEl.dataset.variant = "1";
      } else {
        imageEl.src = "";
        imageEl.style.display = "none";
      }
    }

    // Choices logic
    if (window.HP_CONFIG && sceneId === window.HP_CONFIG.START_SCENE_ID) {
      const hasChoices = scene && scene.choices && Object.keys(scene.choices).length > 0;
      if (hasChoices) hpRenderGenericChoices(scene, container);
      else hpRenderLocationOverview();
      return;
    }

    if (isLocationIntro) {
      hpRenderLocationIntroChoices(locKey, container);
      return;
    }

    hpRenderGenericChoices(scene, container);
  }

  // Expose globals
  window.hpGetLocationKeyForScene = window.hpGetLocationKeyForScene || hpGetLocationKeyForScene;
  window.hpGetCharacterKeyForScene = window.hpGetCharacterKeyForScene || hpGetCharacterKeyForScene;
  window.hpGetSceneTitle = window.hpGetSceneTitle || hpGetSceneTitle;
  window.hpResolveImageForScene = window.hpResolveImageForScene || hpResolveImageForScene;

  window.hpRenderLocationOverview = window.hpRenderLocationOverview || hpRenderLocationOverview;
  window.hpRenderLocationIntroChoices = window.hpRenderLocationIntroChoices || hpRenderLocationIntroChoices;
  window.hpRenderGenericChoices = window.hpRenderGenericChoices || hpRenderGenericChoices;
  window.hpRenderScene = window.hpRenderScene || hpRenderScene;
})();