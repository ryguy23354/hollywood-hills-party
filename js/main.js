function start() {
  const startId = "scene_00_intro";

  // 🔒 Ensure scenes are loaded before starting
  // FIX: use HP_STATE.loaded instead of StoryEngine.scenes length
  if (!window.HP_STATE || !window.HP_STATE.loaded) {
    console.warn("main.js: scenes not ready yet, retrying start...");
    setTimeout(start, 50);
    return;
  }

  loadScene(startId);
}

function loadScene(sceneId) {
  // 🔴 Guard: approach / affinity choices are objects, not scene IDs
  if (typeof sceneId === "object" && sceneId !== null) {
    handleApproachChoice(sceneId);
    return;
  }

  if (!window.StoryEngine || !window.StoryEngine.getScene) {
    console.error("main.js: StoryEngine not available");
    return;
  }

  const scene = window.StoryEngine.getScene(sceneId);

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

  const choicesEl = document.getElementById("choicesContainer");
  if (!choicesEl) return;

  choicesEl.innerHTML = "";

  if (scene.choices) {
    for (const [label, target] of Object.entries(scene.choices)) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.onclick = () => loadScene(target);
      choicesEl.appendChild(btn);
    }
  }
}

// Existing hook — unchanged
window.start = start;
