// js/renderer.js
// Renderer for classic-script architecture.
// IMPORTANT: Exposes all needed functions on window (no import/export).

(function () {
  if (window.HP_RendererLoaded) return;
  window.HP_RendererLoaded = true;

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
    if (sceneId === HP_CONFIG.START_SCENE_ID) return "Hollywood Hills Party";
    const locKey = hpGetLocationKeyForScene(sceneId);
    if (locKey) return HP_CONFIG.LOCATION_DISPLAY?.[locKey] || locKey;
    const charKey = hpGetCharacterKeyForScene(sceneId);
    if (charKey) return HP_CONFIG.CHARACTER_DISPLAY?.[charKey]?.name || charKey;
    return "";
  }

  function hpResolveImageForScene(sceneId, scene) {
    const base = "images/";
    const isIntro = window.HP_CONFIG && sceneId === HP_CONFIG.START_SCENE_ID;
    const locKeyFromId = hpGetLocationKeyForScene(sceneId);
    const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

    // 1) Global intro
    if (isIntro) return base + "scene_00_intro.jpg";

    // 2) Location intro: scene_<loc>_01 (and not character intro)
    if (
      locKeyFromId &&
      /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) &&
      !charKeyFromId
    ) {
      return base + locKeyFromId + ".jpg";
    }

    // 3) Character intro: scene_<char>_00_intro (use active location variant)
    if (charKeyFromId && /^scene_(sienna|riley|luna|harper|mara)_00_intro$/i.test(sceneId)) {
      const activeLoc = (window.HP_STATE && window.HP_STATE.currentLocation) ||
        (typeof window.hpGuessLocationForCharacter === "function"
          ? window.hpGuessLocationForCharacter(charKeyFromId)
          : null);
      if (activeLoc) return base + `${charKeyFromId}_${activeLoc}_01.jpg`;
    }

    // 4) Explicit image from JSON
    if (scene && typeof scene.image === "string" && scene.image.trim() !== "") {
      const name = scene.image.trim();
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

  function hpFormatChoiceLabel(choiceKey) {
    const map = {
      bar_area: "Head to the bar",
      pool_area: "Drift toward the pool",
      lounge_area: "Slide into the lounge",
      balcony_area: "Step out onto the balcony",
      gameloft_area: "Climb up to the game loft",
      return_to_party: "Return to the main party",
      return: "Return",
      continue: "Continue"
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
    btn.className = "hp-choice-btn";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function hpRenderLocationOverview() {
    if (!window.HP_CONFIG) return;
    if (!window.HP_STATE) window.HP_STATE = {};

    // Ensure we have location assignments
    if (!HP_STATE.locationAssignments && typeof window.hpAssignCharactersToLocations === "function") {
      window.hpAssignCharactersToLocations(HP_STATE.nightSeed ?? "");
    }

    const choicesContainer = document.getElementById("choicesContainer");
    if (!choicesContainer) return;
    choicesContainer.innerHTML = "";

    const locs = window.HP_LOCATIONS || ["bar", "pool", "lounge", "balcony", "gameloft"];

    for (const locKey of locs) {
      const label = HP_CONFIG.LOCATION_DISPLAY?.[locKey] || locKey;
      const targetSceneId = `scene_${locKey}_01`;
      choicesContainer.appendChild(
        hpCreateChoiceButton(label, () => {
          HP_STATE.currentLocation = locKey;
          HP_STATE.currentCharacter = null;
          if (typeof window.hpLoadScene === "function") {
            window.hpLoadScene(targetSceneId);
          } else {
            hpRenderScene(targetSceneId);
          }
        })
      );
    }
  }

  function hpRenderLocationIntroChoices(locKey, container) {
    const assigned = (window.HP_STATE && window.HP_STATE.locationAssignments && window.HP_STATE.locationAssignments[locKey]) || [];
    for (const charKey of assigned) {
      const display = window.HP_CONFIG && HP_CONFIG.CHARACTER_DISPLAY?.[charKey];
      const label = display ? `Approach ${display.name.split(" ")[0]}` : `Approach ${charKey}`;
      const targetId = `scene_${charKey}_00_intro`;

      container.appendChild(
        hpCreateChoiceButton(label, () => {
          if (!window.HP_STATE) window.HP_STATE = {};
          HP_STATE.currentLocation = locKey;
          HP_STATE.currentCharacter = charKey;
          if (typeof window.hpLoadScene === "function") {
            window.hpLoadScene(targetId);
          } else {
            hpRenderScene(targetId);
          }
        })
      );
    }

    container.appendChild(
      hpCreateChoiceButton("Return to the main party", () => {
        if (!window.HP_STATE) window.HP_STATE = {};
        HP_STATE.currentCharacter = null;
        HP_STATE.currentLocation = null;
        if (typeof window.hpLoadScene === "function") {
          window.hpLoadScene(HP_CONFIG.START_SCENE_ID);
        } else {
          hpRenderScene(HP_CONFIG.START_SCENE_ID);
        }
      })
    );
  }

  function hpRenderGenericChoices(scene, container) {
    // Your engine uses "choices" (object map) rather than "options" (array)
    const choices = (scene && scene.choices) ? scene.choices : {};
    const entries = Object.entries(choices);

    if (!entries.length) {
      container.appendChild(
        hpCreateChoiceButton("Return to the main party", () => {
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(HP_CONFIG.START_SCENE_ID);
          else hpRenderScene(HP_CONFIG.START_SCENE_ID);
        })
      );
      return;
    }

    for (const [choiceKey, targetId] of entries) {
      const label = hpFormatChoiceLabel(choiceKey);
      container.appendChild(
        hpCreateChoiceButton(label, () => {
          if (typeof window.hpLoadScene === "function") window.hpLoadScene(targetId);
          else hpRenderScene(targetId);
        })
      );
    }
  }

  // Main scene renderer. IMPORTANT: driven by StoryEngine.getScene output (passed in from main.js)
  function hpRenderScene(sceneId, scene) {
    if (!sceneId) return;
    if (!window.HP_STATE) window.HP_STATE = {};

    // If scene wasn't provided, try to fetch it.
    if (!scene && window.StoryEngine && typeof StoryEngine.getScene === "function") {
      scene = StoryEngine.getScene(sceneId, HP_STATE.currentCharacter || null);
    }

    const sceneTitleEl = document.getElementById("sceneTitle");
    const sceneLocationEl = document.getElementById("sceneLocation");
    const sceneTextEl = document.getElementById("sceneText");
    const imageEl = document.getElementById("sceneImage");
    const placeholderEl = document.getElementById("sceneImagePlaceholder");
    const choicesContainer = document.getElementById("choicesContainer");

    // Minimal missing-scene UI
    if (!scene) {
      if (sceneTitleEl) sceneTitleEl.textContent = "Missing scene";
      if (sceneTextEl) sceneTextEl.textContent = `Scene not found: ${sceneId}`;
      if (choicesContainer) choicesContainer.innerHTML = "";
      if (imageEl && placeholderEl) {
        imageEl.style.display = "none";
        placeholderEl.style.display = "block";
      }
      return;
    }

    HP_STATE.currentSceneId = sceneId;

    const locKey = hpGetLocationKeyForScene(sceneId);
    const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

    // Update active location on location-intro scenes
    const isLocationIntro =
      !!locKey &&
      /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) &&
      (!charKeyFromId);

    if (isLocationIntro) {
      HP_STATE.currentLocation = locKey;
      HP_STATE.currentCharacter = null;
    }

    // Titles
    if (sceneTitleEl) sceneTitleEl.textContent = hpGetSceneTitle(sceneId) || "";
    if (sceneLocationEl) {
      sceneLocationEl.textContent = locKey
        ? `Location: ${(window.HP_CONFIG && HP_CONFIG.LOCATION_DISPLAY?.[locKey]) || locKey}`
        : "";
    }
    if (sceneTextEl) sceneTextEl.textContent = scene.text || "";

    // Image
    if (imageEl && placeholderEl) {
      const imgPath = hpResolveImageForScene(sceneId, scene);
      if (imgPath) {
        const activeChar = HP_STATE.currentCharacter || charKeyFromId || "";
        const activeLoc =
          HP_STATE.currentLocation ||
          locKey ||
          (activeChar && typeof window.hpGuessLocationForCharacter === "function"
            ? window.hpGuessLocationForCharacter(activeChar)
            : "");

        imageEl.dataset.char = activeChar;
        imageEl.dataset.loc = activeLoc;
        imageEl.dataset.variant = "1";
        imageEl.src = imgPath;
        imageEl.style.display = "block";
        placeholderEl.style.display = "none";

        imageEl.onerror = function () {
          const c = imageEl.dataset.char || "";
          const l = imageEl.dataset.loc || "";
          let v = parseInt(imageEl.dataset.variant || "1", 10);

          if (c && l && v < 4) {
            v += 1;
            imageEl.dataset.variant = String(v);
            imageEl.onerror = null;
            imageEl.src = `images/${c}_${l}_0${v}.jpg`;
          } else {
            imageEl.onerror = null;
            if (l) imageEl.src = `images/${l}.jpg`;
            else if (locKey) imageEl.src = `images/${locKey}.jpg`;
            else {
              imageEl.style.display = "none";
              placeholderEl.style.display = "block";
            }
          }
        };
      } else {
        imageEl.src = "";
        imageEl.style.display = "none";
        placeholderEl.style.display = "block";
      }
    }

    // Choices
    if (!choicesContainer) return;
    choicesContainer.innerHTML = "";

    // Intro scene: render generic choices if present, otherwise render location overview
    if (window.HP_CONFIG && sceneId === HP_CONFIG.START_SCENE_ID) {
      const hasChoices = scene && scene.choices && Object.keys(scene.choices).length > 0;
      if (hasChoices) {
        hpRenderGenericChoices(scene, choicesContainer);
      } else {
        hpRenderLocationOverview();
      }
      return;
    }

    if (isLocationIntro) {
      hpRenderLocationIntroChoices(locKey, choicesContainer);
      return;
    }

    hpRenderGenericChoices(scene, choicesContainer);
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
