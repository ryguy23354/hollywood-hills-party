
// Scene rendering and choice wiring

function hpGetLocationKeyForScene(sceneId) {
  // Location intro scenes follow pattern: scene_<location>_01
  for (const loc of HP_CONFIG.LOCATIONS) {
    if (sceneId.startsWith(`scene_${loc}_`)) return loc;
  }
  return null;
}

function hpGetCharacterKeyForScene(sceneId) {
  for (const char of HP_CONFIG.CHARACTERS) {
    if (sceneId.includes(char)) return char;
  }
  return null;
}

function hpGetSceneTitle(sceneId) {
  if (sceneId === HP_CONFIG.START_SCENE_ID) {
    return "Hollywood Party";
  }
  const loc = hpGetLocationKeyForScene(sceneId);
  if (loc) {
    return HP_CONFIG.LOCATION_DISPLAY[loc] || loc;
  }
  const charKey = hpGetCharacterKeyForScene(sceneId);
  if (charKey) {
    return HP_CONFIG.CHARACTER_DISPLAY[charKey]?.name || charKey;
  }
  return "";
}

function hpRenderScene(sceneId) {
  if (!HP_STATE.loaded) return;

  const scene = HP_STATE.scenes[sceneId];
  if (!scene) {
    console.warn("Unknown scene id:", sceneId);
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  const sceneTitleEl = document.getElementById("sceneTitle");
  const sceneLocationEl = document.getElementById("sceneLocation");
  const sceneTextEl = document.getElementById("sceneText");
  const imageEl = document.getElementById("sceneImage");
  const placeholderEl = document.getElementById("sceneImagePlaceholder");
  const choicesContainer = document.getElementById("choicesContainer");

  const locKey = hpGetLocationKeyForScene(sceneId);
  const title = hpGetSceneTitle(sceneId);
  sceneTitleEl.textContent = title;

  if (locKey) {
    sceneLocationEl.textContent = `Location: ${HP_CONFIG.LOCATION_DISPLAY[locKey] || locKey}`;
  } else {
    sceneLocationEl.textContent = "";
  }

  sceneTextEl.textContent = scene.text || "";

  // Image handling: show if we have a path, otherwise show placeholder
  const imgPath = scene.image ? `images/${scene.image}` : null;
  if (imgPath) {
    imageEl.src = imgPath;
    imageEl.style.display = "block";
    placeholderEl.style.display = "none";
  } else {
    imageEl.src = "";
    imageEl.style.display = "none";
    placeholderEl.style.display = "inline-flex";
  }

  // Choices
  choicesContainer.innerHTML = "";

  const isLocationIntro = !!locKey && sceneId !== HP_CONFIG.START_SCENE_ID;

  if (isLocationIntro) {
    hpRenderLocationIntroChoices(locKey, choicesContainer);
  } else {
    hpRenderGenericChoices(scene, choicesContainer);
  }
}

function hpRenderLocationIntroChoices(locKey, container) {
  const assignedChars = HP_STATE.locationAssignments[locKey] || [];

  if (!assignedChars.length) {
    // Fallback: just a generic return button
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
  // Basic formatter: convert snake_case to nice labels
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
    .replace(/\w/g, (m) => m.toUpperCase());
}

function hpCreateChoiceButton(label, targetSceneId) {
  const btn = document.createElement("button");
  btn.className = "hp-choice-btn";
  btn.textContent = label;
  btn.addEventListener("click", () => hpRenderScene(targetSceneId));
  return btn;
}
