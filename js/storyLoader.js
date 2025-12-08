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

  const statusEl = document.getElementById("jsonStatus");
  if (statusEl) {
    statusEl.textContent = "JSON status: ok";
    statusEl.style.color = "#52ffa8";
  }
}
