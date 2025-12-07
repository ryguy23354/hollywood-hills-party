
// Story JSON loading and merging

async function hpLoadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function hpLoadAllScenes() {
  const allScenes = {};

  for (const file of HP_CONFIG.STORY_FILES) {
    try {
      const data = await hpLoadJson(file);
      // Each file is a dictionary of sceneId -> sceneObject
      for (const [id, scene] of Object.entries(data)) {
        allScenes[id] = scene;
      }
    } catch (err) {
      console.error(err);
      const status = document.getElementById("jsonStatus");
      if (status) {
        status.textContent = `JSON status: error loading ${file}`;
        status.style.color = "#ff6b6b";
      }
      throw err;
    }
  }

  HP_STATE.scenes = allScenes;
  HP_STATE.loaded = true;

  const status = document.getElementById("jsonStatus");
  if (status) {
    status.textContent = "JSON status: ok";
    status.style.color = "#52ffa8";
  }
}
