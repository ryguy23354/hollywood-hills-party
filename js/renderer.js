// Rendering & image resolution

function hpGetLocationKeyForScene(sceneId) {
  const m = /^scene_(bar|pool|lounge|balcony|gameloft)_/i.exec(sceneId);
  return m ? m[1].toLowerCase() : null;
}

function hpGetCharacterKeyForScene(sceneId) {
  const m = /^scene_(sienna|riley|luna|harper|mara)_/i.exec(sceneId);
  return m ? m[1].toLowerCase() : null;
}

function hpGetSceneTitle(sceneId) {
  if (sceneId === HP_CONFIG.START_SCENE_ID) return "Hollywood Hills Party";
  const locKey = hpGetLocationKeyForScene(sceneId);
  if (locKey) return HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey;
  const charKey = hpGetCharacterKeyForScene(sceneId);
  if (charKey) return HP_CONFIG.CHARACTER_DISPLAY[charKey]?.name || charKey;
  return "";
}

// MAIN IMAGE RESOLUTION (Option C hybrid)
function hpResolveImageForScene(sceneId, scene) {
  const base = "images/";
  const isIntro = sceneId === HP_CONFIG.START_SCENE_ID;
  const locKeyFromId = hpGetLocationKeyForScene(sceneId);
  const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

  if (isIntro) return base + "scene_00_intro.jpg";

  if (locKeyFromId && /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) && !charKeyFromId) {
    return base + locKeyFromId + ".jpg";
  }

  if (charKeyFromId && /^scene_(sienna|riley|luna|harper|mara)_00_intro$/i.test(sceneId)) {
    const activeLoc = HP_STATE.currentLocation || hpGuessLocationForCharacter(charKeyFromId);
    if (activeLoc) return base + `${charKeyFromId}_${activeLoc}_01.jpg`;
  }

  if (scene && typeof scene.image === "string" && scene.image.trim() !== "") {
    const name = scene.image.trim();
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return base + name;
    return base + name + ".jpg";
  }

  const activeChar = HP_STATE.currentCharacter || charKeyFromId;
  const activeLoc =
    HP_STATE.currentLocation ||
    locKeyFromId ||
    (activeChar ? hpGuessLocationForCharacter(activeChar) : null);

  if (activeChar && activeLoc) return base + `${activeChar}_${activeLoc}_01.jpg`;
  if (locKeyFromId) return base + locKeyFromId + ".jpg";

  return base + "default.jpg";
}

function hpGuessLocationForCharacter(charKey) {
  const locs = hpGetLocationsForCharacter(charKey);
  return locs.length ? locs[0] : null;
}

function hpRenderScene(sceneId) {
  if (!HP_STATE.loaded) return;

  const scene =
    (window.StoryEngine && typeof StoryEngine.getScene === "function")
      ? StoryEngine.getScene(sceneId)
      : HP_STATE.scenes[sceneId];

  const sceneTitleEl = document.getElementById("sceneTitle");
  const sceneLocationEl = document.getElementById("sceneLocation");
  const sceneTextEl = document.getElementById("sceneText");
  const imageEl = document.getElementById("sceneImage");
  const placeholderEl = document.getElementById("sceneImagePlaceholder");
  const choicesContainer = document.getElementById("choicesContainer");

  if (!scene) {
    if (sceneTitleEl) sceneTitleEl.textContent = "Missing scene";
    if (sceneTextEl) sceneTextEl.textContent = `Scene not found: ${sceneId}`;
    if (imageEl && placeholderEl) {
      imageEl.style.display = "none";
      imageEl.removeAttribute("src");
      placeholderEl.style.display = "block";
    }
    if (choicesContainer) choicesContainer.innerHTML = "";
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  const locKey = hpGetLocationKeyForScene(sceneId);
  const charKeyFromId = hpGetCharacterKeyForScene(sceneId);

  if (locKey && /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) && !charKeyFromId) {
    HP_STATE.currentLocation = locKey;
    HP_STATE.currentCharacter = null;
  }

  if (sceneTitleEl) sceneTitleEl.textContent = hpGetSceneTitle(sceneId) || "";

  if (sceneLocationEl) {
    sceneLocationEl.textContent = locKey
      ? `Location: ${HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey}`
      : "";
  }

  if (sceneTextEl) sceneTextEl.textContent = scene.text || "";

  if (imageEl && placeholderEl) {
    const imgPath = hpResolveImageForScene(sceneId, scene);
    if (imgPath) {
      imageEl.src = imgPath;
      imageEl.style.display = "block";
      placeholderEl.style.display = "none";
    } else {
      imageEl.style.display = "none";
      imageEl.removeAttribute("src");
      placeholderEl.style.display = "block";
    }
  }

  if (!choicesContainer) return;
  choicesContainer.innerHTML = "";

  const isLocationIntro =
    locKey &&
    /^scene_(bar|pool|lounge|balcony|gameloft)_01$/i.test(sceneId) &&
    sceneId !== HP_CONFIG.START_SCENE_ID &&
    !charKeyFromId;

  if (isLocationIntro) {
    hpRenderLocationIntroChoices(locKey, choicesContainer);
  } else {
    hpRenderGenericChoices(scene, choicesContainer);
  }
}

function hpRenderLocationIntroChoices(locKey, container) {
  const assignedChars =
    (HP_STATE.locationAssignments && HP_STATE.locationAssignments[locKey]) || [];

  for (const charKey of assignedChars) {
    const display = HP_CONFIG.CHARACTER_DISPLAY[charKey];
    const label = display
      ? `Approach ${display.name.split(" ")[0]}`
      : `Approach ${charKey}`;

    const targetId = `scene_${charKey}_00_intro`;
    container.appendChild(
      hpCreateChoiceButton(label, targetId, {
        setCharacter: charKey,
        setLocation: locKey
      })
    );
  }

  container.appendChild(
    hpCreateChoiceButton(
      "Return to the main party",
      HP_CONFIG.START_SCENE_ID,
      { clearCharacter: true, clearLocation: true }
    )
  );
}

function hpRenderGenericChoices(scene, container) {
  let options = [];

  if (Array.isArray(scene.options)) {
    options = scene.options.map(opt => ({
      label: opt.label,
      target: opt.go_to || opt.target
    }));
  } else if (scene.choices && typeof scene.choices === "object") {
    options = Object.entries(scene.choices).map(([k, v]) => ({
      label: hpFormatChoiceLabel(k),
      target: v
    }));
  }

  if (!options.length) {
    container.appendChild(
      hpCreateChoiceButton("Return to the main party", HP_CONFIG.START_SCENE_ID)
    );
    return;
  }

  for (const opt of options) {
    container.appendChild(hpCreateChoiceButton(opt.label, opt.target));
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
    if (options && options.setLocation) HP_STATE.currentLocation = options.setLocation;
    if (options && options.setCharacter) HP_STATE.currentCharacter = options.setCharacter;
    if (options && options.clearCharacter) HP_STATE.currentCharacter = null;
    if (options && options.clearLocation) HP_STATE.currentLocation = null;

    if (window.hpLoadScene) {
      window.hpLoadScene(targetSceneId);
    } else {
      hpRenderScene(targetSceneId);
    }
  });

  return btn;
}
