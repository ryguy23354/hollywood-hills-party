// Scene rendering and image logic

function hpGetLocationKeyForScene(sceneId) {
  // scene_bar_01, scene_pool_02, etc.
  const match = /^scene_(bar|pool|lounge|balcony|gameloft)_/i.exec(sceneId);
  return match ? match[1].toLowerCase() : null;
}

function hpGetCharacterKeyForScene(sceneId) {
  const match = /^scene_(sienna|riley|luna|harper|mara)_/i.exec(sceneId);
  return match ? match[1].toLowerCase() : null;
}

function hpGetSceneTitle(sceneId) {
  if (sceneId === HP_CONFIG.START_SCENE_ID) {
    return "Hollywood Hills Party";
  }

  const locKey = hpGetLocationKeyForScene(sceneId);
  if (locKey) {
    return HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey;
  }

  const charKey = hpGetCharacterKeyForScene(sceneId);
  if (charKey) {
    return HP_CONFIG.CHARACTER_DISPLAY[charKey]?.name || charKey;
  }

  return "";
}

function hpResolveImageForScene(sceneId, scene) {
  const imgBasePath = "images/";
  const isIntro = sceneId === HP_CONFIG.START_SCENE_ID;
  const locKeyFromId = hpGetLocationKeyForScene(sceneId);
  const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

  // 1. Global intro
  if (isIntro) {
    return imgBasePath + "scene_00_intro.jpg";
  }

  // 2. Location intro: scene_<loc>_01 and no explicit character here
  if (locKeyFromId && /^scene_[^_]+_01$/i.test(sceneId) && !charKeyFromId) {
    return imgBasePath + locKeyFromId + ".jpg"; // bar.jpg, pool.jpg, etc.
  }

  // 3. Character scenes:
  //    Prefer explicit image name from JSON (Option A).
  if (scene && typeof scene.image === "string" && scene.image.trim() !== "") {
    const name = scene.image.trim();
    // If user included extension, respect it; otherwise assume .jpg
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name)) {
      return imgBasePath + name;
    } else {
      return imgBasePath + name + ".jpg";
    }
  }

  //    Otherwise use <character>_<location>_01.jpg based on active state.
  const activeChar = HP_STATE.currentCharacter || charKeyFromId;
  const activeLoc =
    HP_STATE.currentLocation ||
    locKeyFromId ||
    (activeChar ? hpGuessLocationForCharacter(activeChar) : null);

  if (activeChar && activeLoc) {
    return imgBasePath + `${activeChar}_${activeLoc}_01.jpg`;
  }

  // 4. Fallback: if we know a location, use its generic image
  if (locKeyFromId) {
    return imgBasePath + locKeyFromId + ".jpg";
  }

  // 5. Final fallback (optional default)
  return imgBasePath + "default.jpg";
}

// Helper: if we somehow have only character, guess one of tonight's locations.
function hpGuessLocationForCharacter(charKey) {
  const locs = hpGetLocationsForCharacter(charKey);
  if (locs.length > 0) return locs[0];
  return null;
}

function hpRenderScene(sceneId) {
  if (!HP_STATE.loaded) return;

  const scene = HP_STATE.scenes[sceneId];
  const sceneTitleEl = document.getElementById("sceneTitle");
  const sceneLocationEl = document.getElementById("sceneLocation");
  const sceneTextEl = document.getElementById("sceneText");
  const imageEl = document.getElementById("sceneImage");
  const placeholderEl = document.getElementById("sceneImagePlaceholder");
  const choicesContainer = document.getElementById("choicesContainer");

  if (!scene) {
    console.warn("Unknown scene id:", sceneId);
    if (sceneTitleEl) sceneTitleEl.textContent = "Missing scene";
    if (sceneTextEl) sceneTextEl.textContent = `Scene not found: ${sceneId}`;
    if (imageEl && placeholderEl) {
      imageEl.style.display = "none";
      placeholderEl.style.display = "block";
    }
    if (choicesContainer) choicesContainer.innerHTML = "";
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  const locKey = hpGetLocationKeyForScene(sceneId);
  const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

  // For location intros, set the active location and clear active character
  if (locKey && /^scene_[^_]+_01$/i.test(sceneId) && !charKeyFromId) {
    HP_STATE.currentLocation = locKey;
    HP_STATE.currentCharacter = null;
  }

  if (sceneTitleEl) {
    sceneTitleEl.textContent = hpGetSceneTitle(sceneId) || "";
  }

  if (sceneLocationEl) {
    if (locKey) {
      sceneLocationEl.textContent = `Location: ${
        HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey
      }`;
    } else {
      sceneLocationEl.textContent = "";
    }
  }

  if (sceneTextEl) {
    sceneTextEl.textContent = scene.text || "";
  }

  // IMAGE HANDLING
  if (imageEl && placeholderEl) {
    const imgPath = hpResolveImageForScene(sceneId, scene);
    if (imgPath) {
      imageEl.src = imgPath;
      imageEl.style.display = "block";
      placeholderEl.style.display = "none";
      imageEl.onerror = function () {
        // If the first attempt fails, fall back to location generic if possible.
        const loc = hpGetLocationKeyForScene(sceneId) || HP_STATE.currentLocation;
        if (loc) {
          imageEl.onerror = null;
          imageEl.src = "images/" + loc + ".jpg";
        } else {
          imageEl.onerror = null;
          imageEl.style.display = "none";
          placeholderEl.style.display = "block";
        }
      };
    } else {
      imageEl.src = "";
      imageEl.style.display = "none";
      placeholderEl.style.display = "block";
    }
  }

  // CHOICES
  if (!choicesContainer) return;
  choicesContainer.innerHTML = "";

  const isLocationIntro =
    locKey && /^scene_[^_]+_01$/i.test(sceneId) && sceneId !== HP_CONFIG.START_SCENE_ID;

  if (isLocationIntro) {
    hpRenderLocationIntroChoices(locKey, choicesContainer);
  } else {
    hpRenderGenericChoices(scene, choicesContainer);
  }
}

function hpRenderLocationIntroChoices(locKey, container) {
  const assignedChars = HP_STATE.locationAssignments[locKey] || [];

  if (!assignedChars.length) {
    const btn = hpCreateChoiceButton("Return to the main party", HP_CONFIG.START_SCENE_ID);
    container.appendChild(btn);
    return;
  }

  for (const charKey of assignedChars) {
    const display = HP_CONFIG.CHARACTER_DISPLAY[charKey];
    const label = display
      ? `Approach ${display.name.split(" ")[0]}`
      : `Approach ${charKey}`;

    const targetId = `scene_${charKey}_00_intro`;
    const btn = hpCreateChoiceButton(label, targetId, {
      setCharacter: charKey,
      setLocation: locKey
    });
    container.appendChild(btn);
  }

  const returnBtn = hpCreateChoiceButton(
    "Return to the main party",
    HP_CONFIG.START_SCENE_ID,
    { clearCharacter: true, clearLocation: true }
  );
  container.appendChild(returnBtn);
}

function hpRenderGenericChoices(scene, container) {
  const choices = scene.choices || {};
  const entries = Object.entries(choices);
  if (!entries.length) {
    const btn = hpCreateChoiceButton("Return to the main party", HP_CONFIG.START_SCENE_ID, {
      clearCharacter: false
    });
    container.appendChild(btn);
    return;
  }

  for (const [choiceKey, targetId] of entries) {
    const label = hpFormatChoiceLabel(choiceKey);
    const btn = hpCreateChoiceButton(label, targetId, null);
    container.appendChild(btn);
  }
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

  return choiceKey
    .replace(/^go_to_/, "")
    .replace(/^approach_/, "Approach ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function hpCreateChoiceButton(label, targetSceneId, options) {
  const btn = document.createElement("button");
  btn.className = "hp-choice-btn";
  btn.textContent = label;

  btn.addEventListener("click", () => {
    if (options && options.setLocation) {
      HP_STATE.currentLocation = options.setLocation;
    }
    if (options && options.setCharacter) {
      HP_STATE.currentCharacter = options.setCharacter;
    }
    if (options && options.clearCharacter) {
      HP_STATE.currentCharacter = null;
    }
    if (options && options.clearLocation) {
      HP_STATE.currentLocation = null;
    }
    hpRenderScene(targetSceneId);
  });

  return btn;
}
