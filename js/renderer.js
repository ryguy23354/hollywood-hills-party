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
  const scene =
    (window.StoryEngine && window.StoryEngine.getScene)
      ? window.StoryEngine.getScene(sceneId)
      : (HP_STATE.scenes ? HP_STATE.scenes[sceneId] : null);

  if (!scene) {
    console.warn("hpRenderScene: scene not found:", sceneId);
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  const container = document.getElementById("sceneContainer");
  if (!container) return;

  container.innerHTML = "";

  /* =========================
     IMAGE (AUTHORITATIVE)
     ========================= */
  if (scene.image) {
    const img = document.createElement("img");
    img.src = scene.image;
    img.alt = "Scene image";
    img.className = "scene-image";
    container.appendChild(img);
  }

  /* =========================
     TEXT / NARRATIVE
     ========================= */
  if (scene.text) {
    const textEl = document.createElement("div");
    textEl.className = "scene-text";
    textEl.textContent = scene.text;
    container.appendChild(textEl);
  }

  /* =========================
     OPTIONS (MODERN PATH)
     ========================= */
  if (Array.isArray(scene.options) && scene.options.length > 0) {
    const choicesEl = document.createElement("div");
    choicesEl.className = "scene-choices";

    scene.options.forEach(opt => {
      if (!opt || !opt.label) return;

      const btn = document.createElement("button");
      btn.textContent = opt.label;

      btn.addEventListener("click", () => {
        if (opt.go_to) {
          hpRenderScene(opt.go_to);
        } else {
          console.warn("Choice missing go_to:", opt);
        }
      });

      choicesEl.appendChild(btn);
    });

    container.appendChild(choicesEl);
    return; // ⬅️ IMPORTANT: do NOT fall through to legacy logic
  }

  /* =========================
     LEGACY / HUB FALLBACK
     ========================= */
  if (typeof hpRenderLocationIntroChoices === "function") {
    hpRenderLocationIntroChoices(container);
    return;
  }

  /* =========================
     FINAL SAFETY FALLBACK
     ========================= */
  const backBtn = document.createElement("button");
  backBtn.textContent = "Return to the main party";
  backBtn.onclick = () => hpRenderScene("scene_00_intro");
  container.appendChild(backBtn);
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
