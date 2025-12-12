// Main routing & glue between the engine and the UI

(function () {
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
        (window.HP_CONFIG && HP_CONFIG.START_SCENE_ID) ||
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

    // Delegate to your existing renderer if present
    if (typeof window.hpRenderScene === "function") {
      window.hpRenderScene(sceneId, scene);
    } else {
      // Simple fallback renderer for safety (won't overwrite your custom UI if hpRenderScene exists)
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

  // Expose for other scripts (randomizer, UI buttons, etc.)
  window.hpStartGame = startGame;
  window.hpLoadScene = loadScene;
  window.hpChooseOption = chooseOption;
  window.hpSetActiveCharacter = setActiveCharacter;
})();
