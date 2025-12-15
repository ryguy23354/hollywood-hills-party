// main.js

function start() {
  const startId = "scene_00_intro";
  loadScene(startId);
}

function loadScene(sceneId) {
  // 🔴 PATCH START — guard against choice objects
  if (typeof sceneId === "object" && sceneId !== null) {
    handleApproachChoice(sceneId);
    return;
  }
  // 🔴 PATCH END

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

  if (typeof window.hpRenderScene === "function") {
    window.hpRenderScene(sceneId, scene);
    return;
  }

  // fallback (unchanged)
  const container = document.getElementById("story");
  if (!container) return;

  container.innerHTML = "";
  const titleEl = document.createElement("h2");
  titleEl.textContent = scene.title || "";
  container.appendChild(titleEl);

  const textEl = document.createElement("p");
  textEl.textContent = scene.text || "";
  container.appendChild(textEl);
}

/**
 * 🔴 NEW: Handle approach choices (bold / warm / playful / reserved)
 * These are NOT scene transitions.
 */
function handleApproachChoice(choice) {
  const char = HP_STATE.currentCharacter;

  if (!char) {
    console.warn("Approach selected with no active character");
    return;
  }

  // Apply affinity delta
  if (window.AffinityEngine && typeof AffinityEngine.applyDelta === "function") {
    AffinityEngine.applyDelta(char, choice.delta || 0, choice.romance_style);
  }

  // Record entry style (optional but useful later)
  HP_STATE.characterEntryStyle = choice.romance_style;

  // Route into character hub (NOT a new scene per choice)
  const hubSceneId = `character_${char}_hub`;

  // Fallback safety if hub scene naming differs
  if (!StoryEngine.getScene(hubSceneId, char)) {
    loadScene(HP_STATE.currentSceneId);
    return;
  }

  loadScene(hubSceneId);
}

// expose for renderer
window.start = start;
window.loadScene = loadScene;
