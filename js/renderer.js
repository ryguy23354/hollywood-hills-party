// Scene rendering and choice wiring

function hpGetSceneTitle(sceneId, scene) {
  if (sceneId === HP_CONFIG.START_SCENE_ID) {
    return "Hollywood Hills Party";
  }
  const locKey = hpGetLocationKeyForScene(sceneId);
  if (locKey) {
    return HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey;
  }
  const charKey = hpGetCharacterKeyForScene(sceneId);
  if (charKey) {
    const display = HP_CONFIG.CHARACTER_DISPLAY[charKey];
    if (display && display.name) return display.name;
  }
  if (scene && scene.id && scene.id !== sceneId) return scene.id;
  return "";
}

function hpRenderScene(sceneId) {
  if (!HP_STATE.loaded) return;

  const scene = HP_STATE.scenes[sceneId];
  const sceneTitleEl = document.getElementById("sceneTitle");
  const sceneLocationEl = document.getElementById("sceneLocation");
  const sceneTextEl = document.getElementById("sceneText");
  const choicesContainer = document.getElementById("choicesContainer");

  if (!scene) {
    console.warn("Unknown scene id:", sceneId);
    HP_STATE.currentSceneId = sceneId;
    if (sceneTitleEl) sceneTitleEl.textContent = "Missing Scene";
    if (sceneLocationEl) sceneLocationEl.textContent = "";
    if (sceneTextEl) sceneTextEl.textContent = `Scene not found: ${sceneId}`;
    if (choicesContainer) choicesContainer.innerHTML = "";
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  const title = hpGetSceneTitle(sceneId, scene);
  if (sceneTitleEl) sceneTitleEl.textContent = title || "";

  const locKey = hpGetLocationKeyForScene(sceneId);
  if (sceneLocationEl) {
    if (locKey) {
      sceneLocationEl.textContent = "Location: " + (HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey);
    } else {
      sceneLocationEl.textContent = "";
    }
  }

  if (sceneTextEl) sceneTextEl.textContent = scene.text || "";

  hpSetSceneImage(sceneId, scene);

  if (!choicesContainer) return;
  choicesContainer.innerHTML = "";

  const isLocationIntro =
    locKey &&
    sceneId !== HP_CONFIG.START_SCENE_ID &&
    sceneId === `scene_${locKey}_01`;

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
    const label = display ? `Approach ${display.name.split(" ")[0]}` : `Approach ${charKey}`;
    const targetId = `scene_${charKey}_00_intro`;
    const btn = hpCreateChoiceButton(label, targetId);
    container.appendChild(btn);
  }

  const returnBtn = hpCreateChoiceButton("Return to the main party", HP_CONFIG.START_SCENE_ID);
  container.appendChild(returnBtn);
}

function hpRenderGenericChoices(scene, container) {
  const choices = scene.choices || {};
  const entries = Object.entries(choices);

  if (!entries.length) {
    const btn = hpCreateChoiceButton("Return to the main party", HP_CONFIG.START_SCENE_ID);
    container.appendChild(btn);
    return;
  }

  for (const [choiceKey, targetId] of entries) {
    const label = hpFormatChoiceLabel(choiceKey);
    const btn = hpCreateChoiceButton(label, targetId);
    container.appendChild(btn);
  }
}

function hpFormatChoiceLabel(choiceKey) {
  const customLabels = {
    bar_area: "Head to the bar",
    pool_area: "Drift toward the pool",
    lounge_area: "Slide into the lounge",
    balcony_area: "Step out onto the balcony",
    gameloft_area: "Climb up to the game loft",
    return_to_party: "Return to the main party",
    return: "Return",
    continue: "Continue"
  };

  if (choiceKey in customLabels) return customLabels[choiceKey];

  return choiceKey
    .replace(/^go_to_/, "")
    .replace(/^approach_/, "Approach ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function hpCreateChoiceButton(label, targetSceneId) {
  const btn = document.createElement("button");
  btn.className = "hp-choice-btn";
  btn.textContent = label;
  btn.addEventListener("click", () => hpRenderScene(targetSceneId));
  return btn;
}
