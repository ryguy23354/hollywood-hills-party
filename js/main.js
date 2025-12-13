// js/main.js
// Main routing & glue between the engine and the UI
// Classic-script safe, idempotent, globally bootstrappable

(function () {
  // Prevent double execution
  if (window.HP_MainLoaded) {
    return;
  }
  window.HP_MainLoaded = true;

  if (!window.HP_STATE) {
    window.HP_STATE = {};
  }

  function startGame() {
    if (!window.StoryEngine) {
      console.error("hpStartGame: StoryEngine is not available");
      return;
    }

    StoryEngine.loadScenes().then(() => {
      const startId =
        (window.HP_CONFIG && window.HP_CONFIG.START_SCENE_ID) ||
        "scene_00_intro";

      loadScene(startId);
    });
  }

  function loadScene(sceneId) {
    if (!window.StoryEngine) {
      console.error("hpLoadScene: StoryEngine is not available");
      return;
    }

    const activeChar = HP_STATE.currentCharacter || null;
    const scene = StoryEngine.getScene(sceneId, activeChar);
    if (!scene) {
      console.error("hpLoadScene: missing scene", sceneId);
      return;
    }

    HP_STATE.currentSceneId = sceneId;

	// If this is the intro scene, immediately show location overview
	if (
	  sceneId === (window.HP_CONFIG && window.HP_CONFIG.START_SCENE_ID)
	) {
	  if (typeof window.hpRenderLocationOverview === "function") {
		window.hpRenderLocationOverview();
		return;
	  }
	}


    // Delegate to your existing renderer if present
    if (typeof window.hpRenderScene === "function") {
      window.hpRenderScene(sceneId, scene);
    } else {
      // Minimal safety fallback (will not override real renderer)
      const container = document.getElementById("story");
      if (container) {
        container.innerHTML = "";

        const titleEl = document.createElement("h2");
        titleEl.textContent = scene.title || "";

        const textEl = document.createElement("p");
        textEl.textContent = scene.text || "";

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "options";

        (scene.options || []).forEach(opt => {
          const btn = document.createElement("button");
          btn.textContent = opt.text || "Continue";
          btn.addEventListener("click", () => chooseOption(opt));
          optionsDiv.appendChild(btn);
        });

        container.appendChild(titleEl);
        container.appendChild(textEl);
        container.appendChild(optionsDiv);
      }
    }
  }

  function chooseOption(option) {
    if (!option) return;

    const activeChar = HP_STATE.currentCharacter || null;

    if (activeChar && option.effect && window.StoryEngine) {
      StoryEngine.applyChoice(activeChar, option.effect);
    }

    if (option.nextSceneId) {
      loadScene(option.nextSceneId);
    }
  }

  function setActiveCharacter(characterId) {
    if (!window.HP_STATE || !HP_STATE.setActiveCharacter) return;
    HP_STATE.setActiveCharacter(characterId);
  }

  // 🔑 PUBLIC API
  window.hpStartGame = startGame;
  window.hpLoadScene = loadScene;
  window.hpChooseOption = chooseOption;
  window.hpSetActiveCharacter = setActiveCharacter;

  // 🔑 BOOTSTRAP ALIAS (THIS WAS MISSING)
  window.start = startGame;
})();
