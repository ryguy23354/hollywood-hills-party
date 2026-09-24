// Load & merge all story JSON
async function hpLoadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Image discovery
// Browsers cannot list a folder, so we probe the naming convention instead:
//   images/<character>_<location>_NN.jpg          -> "default" pool
//   images/<character>_<location>_<tier>_NN.jpg   -> tier pool
// For each pool we try _01, _02, ... and stop at the first missing number,
// so numbering must have no gaps. Each pool costs one expected 404 in the
// browser console (the "end of set" check); players never see it.
// ---------------------------------------------------------------------------
async function hpImageExists(url) {
  try {
    // "no-cache" revalidates with the server, so newly added files are found
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function hpProbeImagePool(prefix, maxVariants) {
  const found = [];
  for (let i = 1; i <= maxVariants; i++) {
    const url = `${prefix}_${String(i).padStart(2, "0")}.jpg`;
    if (!(await hpImageExists(url))) break;
    found.push(url);
  }
  return found;
}

// Probes every pool in the background and calls onPool(char, loc, key, urls)
// as each one finishes. Returns a promise that resolves when all are done.
async function hpDiscoverImages(onPool) {
  const chars = HP_CONFIG.CHARACTERS || [];
  const locs = HP_CONFIG.LOCATIONS || [];
  const tiers = (HP_CONFIG.AFFINITY_TIERS || []).map(t => t.name);
  const dir = HP_CONFIG.IMAGE_DIR || "images";
  const maxVariants = HP_CONFIG.IMAGE_MAX_VARIANTS || 20;
  // Only a few checks at a time, so the game's own requests are never stuck
  // behind hundreds of image checks on slower connections.
  const concurrency = HP_CONFIG.IMAGE_DISCOVERY_CONCURRENCY || 4;

  const tasks = [];
  for (const c of chars) {
    for (const l of locs) {
      for (const key of ["default", ...tiers]) {
        const prefix = key === "default" ? `${dir}/${c}_${l}` : `${dir}/${c}_${l}_${key}`;
        tasks.push({ c, l, key, prefix });
      }
    }
  }

  let total = 0;
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const t = tasks[next++];
      const pool = await hpProbeImagePool(t.prefix, maxVariants);
      total += pool.length;
      onPool(t.c, t.l, t.key, pool);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  console.info(`storyLoader: discovered ${total} character images in ${dir}/`);
}

// Discovered pools replace the manifest's pool for the same character/location/tier.
// Pools where nothing was found keep whatever the manifest had.
function hpApplyDiscoveredPool(c, l, key, pool) {
  if (!pool.length) return;
  const images = (HP_STATE.images = HP_STATE.images || {});
  images[c] = images[c] || {};
  let entry = images[c][l];
  if (Array.isArray(entry)) entry = images[c][l] = { default: entry }; // legacy flat pool
  if (!entry) entry = images[c][l] = {};
  entry[key] = pool;
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

  // Load the images manifest (optional fallback) so HubEngine can resolve character+location images
  if (HP_CONFIG.IMAGE_MANIFEST_FILE) {
    try {
      HP_STATE.images = await hpLoadJson(HP_CONFIG.IMAGE_MANIFEST_FILE);
    } catch (e) {
      console.warn("storyLoader: no image manifest loaded (using folder discovery only):", e);
    }
  }

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

  // Discover character images directly from the images folder, so new files
  // show up without editing the manifest. Started last and run in the background
  // (a few checks at a time) so the game starts immediately; each pool is
  // updated as soon as it has been checked.
  if (HP_CONFIG.IMAGE_DISCOVERY !== false) {
    HP_STATE.imagesDiscovered = false;
    HP_STATE.imagesReady = hpDiscoverImages(hpApplyDiscoveredPool)
      .then(() => { HP_STATE.imagesDiscovered = true; })
      .catch(e => console.error("storyLoader: image discovery failed, using manifest only:", e));
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
