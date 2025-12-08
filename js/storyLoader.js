// Story JSON loading and merging

async function hpLoadJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }
  return res.json();
}

async function hpLoadAllScenes() {
  const allScenes = {};

  for (const file of HP_CONFIG.STORY_FILES) {
    try {
      const data = await hpLoadJson(file);
      for (const [id, scene] of Object.entries(data)) {
        allScenes[id] = scene;
      }
    } catch (err) {
      console.error(err);
      const statusEl = document.getElementById("jsonStatus");
      if (statusEl) {
        statusEl.textContent = `JSON status: error loading ${file}`;
        statusEl.style.color = "#ff6b6b";
      }
      throw err;
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
