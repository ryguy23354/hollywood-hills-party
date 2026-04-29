// Load & merge all story JSON
async function hpLoadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function hpLoadAllScenes() {
  const allScenes = {};
  for (const file of HP_CONFIG.STORY_FILES) {
    const data = await hpLoadJson(file);
    for (const [id, scene] of Object.entries(data)) {
      allScenes[id] = scene;
    }
  }
  HP_STATE.scenes = allScenes;
  HP_STATE.loaded = true;

  // Load romance configs into HP_STATE.romance so HubEngine can find them
  if (HP_CONFIG.ROMANCE_FILES && typeof HP_CONFIG.ROMANCE_FILES === "object") {
    HP_STATE.romance = {};
    for (const [charKey, path] of Object.entries(HP_CONFIG.ROMANCE_FILES)) {
      try {
        HP_STATE.romance[charKey] = await hpLoadJson(path);
      } catch (e) {
        console.error(`storyLoader: failed to load romance config for ${charKey}:`, e);
      }
    }
  }

  const statusEl = document.getElementById("jsonStatus");
  if (statusEl) {
    statusEl.textContent = "JSON status: ok";
    statusEl.style.color = "#52ffa8";
  }
  if (window.StoryEngine) {
	window.StoryEngine.scenes = HP_STATE.scenes;
  }
}
