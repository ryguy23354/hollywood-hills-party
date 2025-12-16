// main.js — entry + scene routing

function start() {
  const startId = "scene_00_intro";

  // 🔒 FIX: wait for HP_STATE.loaded instead of StoryEngine.scenes
  if (!window.HP_STATE || !window.HP_STATE.loaded) {
    console.warn("main.js: scenes not ready yet, retrying start...");
    setTimeout(start, 50);
    return;
  }

  loadScene(startId);
}

function loadScene(sceneId) {
  // Guard: approach / affinity choices are objects, not scene IDs
  if (typeof sceneId === "object" && sceneId !== null) {
    if (typeof window.handleApproachChoice === "function") {
      window.handleApproachChoice(sceneId);
    } else {
      console.warn("main.js: approach choice received but handler missing", sceneId);
    }
    return;
  }

  if (!window.StoryEngine || typeof window.StoryEngine.getScene !== "function") {
    console.error("main.js: StoryEngine not available");
    return;
  }

  const scene = window.StoryEngine.getScene(sceneId);

  if (!scene) {
    console.error("hpLoadScene: missing scene", sceneId);
    return;
  }

  HP_STATE.currentSceneId = sceneId;

  // Preferred render path
  if (typeof window.hpRenderScene === "function") {
    window.hpRenderScene(sceneId, scene);
    return;
  }

  // Fallback render (unchanged legacy behavior)
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

// Expose start globally (unchanged)
window.start = start;
