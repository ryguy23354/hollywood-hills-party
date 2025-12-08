// Load and merge all JSON story files

async function hpLoadAllScenes() {
  const sceneMap = {};
  const failures = [];

  for (const file of HP_CONFIG.STORY_FILES) {
    try {
      const res = await fetch(file);
      if (!res.ok) {
        console.warn("Failed to load", file, res.status);
        failures.push(file);
        continue;
      }
      const data = await res.json();
      for (const [id, scene] of Object.entries(data)) {
        sceneMap[id] = scene;
      }
    } catch (err) {
      console.error("Error loading", file, err);
      failures.push(file);
    }
  }

  HP_STATE.scenes = sceneMap;
  HP_STATE.loaded = true;

  if (failures.length) {
    hpSetStatus("JSON loaded with some errors: " + failures.join(", "), true);
  } else {
    hpSetStatus("All JSON loaded.");
  }
}
