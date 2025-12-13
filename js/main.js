// js/main.js
// Main routing & glue between the engine and the UI
// Classic-script safe, idempotent, globally bootstrappable

(function () {
  // Prevent double execution
  if (window.HP_MainLoaded) return;
  window.HP_MainLoaded = true;

  if (!window.HP_STATE) window.HP_STATE = {};

  function startGame() {
    if (!window.StoryEngine) {
      console.error("hpStartGame: StoryEngine is not available");
      return;
    }

    // Ensure placements exist before the first interactive screen.
    if (!HP_STATE.locationAssignments && typeof window.hpAssignCharactersToLocations === "function") {
      window.hpAssignCharactersToLocations(HP_STATE.nightSeed ?? "");
    }

    StoryEngine.loadScenes().then(() => {
      const startId = (window.HP_CONFIG && window.HP_CONFIG.START_SCENE_ID) || "scene_00_intro";
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

    // Delegate to renderer (authoritative path)
    if (typeof window.hpRenderScene === "function") {
      window.hpRenderScene(sceneId, scene);
      return;
    }

    // Minimal safety fallback (shouldn't be used in your real app)
    const container = document.getElementById("story");
    if (container) {
      container.innerHTML = "";

      const titleEl = document.createElement("h2");
      titleEl.textContent = scene.title || "";

      const textEl = document.createElement("p");
      textEl.textContent = scene.text || "";

      const optionsDiv = document.createElement("div");
      optionsDiv.className = "options";

      const choices = scene.choices || {};
      for (const [choiceKey, targetId] of Object.entries(choices)) {
        const btn = document.createElement("button");
        btn.textContent = String(choiceKey);
        btn.addEventListener("click", () => loadScene(targetId));
        optionsDiv.appendChild(btn);
      }

      container.appendChild(titleEl);
      container.appendChild(textEl);
      container.appendChild(optionsDiv);
    }
  }

  function chooseOption(option) {
    // (kept for compatibility; your UI uses scene.choices mapping)
    if (!option) return;
    const activeChar = HP_STATE.currentCharacter || null;
    if (activeChar && option.effect && window.StoryEngine) StoryEngine.applyChoice(activeChar, option.effect);
    if (option.nextSceneId) loadScene(option.nextSceneId);
  }

  function setActiveCharacter(characterId) {
    if (!window.HP_STATE || !HP_STATE.setActiveCharacter) return;
    HP_STATE.setActiveCharacter(characterId);
  }

  // Public API
  window.hpStartGame = window.hpStartGame || startGame;
  window.hpLoadScene = window.hpLoadScene || loadScene;
  window.hpChooseOption = window.hpChooseOption || chooseOption;
  window.hpSetActiveCharacter = window.hpSetActiveCharacter || setActiveCharacter;

  // Bootstrap alias used by index.html
  window.start = window.start || startGame;
})();
