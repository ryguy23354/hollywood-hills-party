// Image resolution + fallback logic (Option A with graceful fallbacks)

function hpGetLocationKeyForScene(sceneId) {
  if (!sceneId) return null;
  for (const loc of HP_CONFIG.LOCATIONS) {
    if (sceneId.startsWith(`scene_${loc}_`)) return loc;
  }
  return null;
}

function hpGetCharacterKeyForScene(sceneId) {
  if (!sceneId) return null;
  for (const char of HP_CONFIG.CHARACTERS) {
    if (sceneId.includes(`_${char}_`) || sceneId.startsWith(`scene_${char}_`) || sceneId.startsWith(`${char}_`)) {
      return char;
    }
  }
  return null;
}

function hpSetSceneImage(sceneId, scene) {
  const imageEl = document.getElementById("sceneImage");
  const placeholderEl = document.getElementById("sceneImagePlaceholder");
  if (!imageEl || !placeholderEl) return;

  const locKey = hpGetLocationKeyForScene(sceneId);

  let primaryFile = null;

  const isLocationIntro =
    locKey &&
    (sceneId === `scene_${locKey}_01`);

  if (isLocationIntro) {
    // For location intros, ALWAYS use the generic location image
    primaryFile = HP_CONFIG.LOCATION_DEFAULT_IMAGES[locKey] || `${locKey}.jpg`;
  } else if (scene && scene.image) {
    primaryFile = scene.image;
  } else if (locKey) {
    primaryFile = HP_CONFIG.LOCATION_DEFAULT_IMAGES[locKey] || `${locKey}.jpg`;
  } else if (HP_CONFIG.GLOBAL_FALLBACK_IMAGE) {
    primaryFile = HP_CONFIG.GLOBAL_FALLBACK_IMAGE;
  }

  if (!primaryFile) {
    imageEl.style.display = "none";
    placeholderEl.style.display = "block";
    return;
  }

  let triedLocationFallback = false;
  let triedGlobalFallback = false;

  imageEl.onload = () => {
    imageEl.style.display = "block";
    placeholderEl.style.display = "none";
  };

  imageEl.onerror = () => {
    // First attempt: location fallback if not already used and locKey is known
    if (locKey && !triedLocationFallback) {
      triedLocationFallback = true;
      const fallbackLocFile = HP_CONFIG.LOCATION_DEFAULT_IMAGES[locKey] || `${locKey}.jpg`;
      imageEl.src = `images/${fallbackLocFile}`;
      return;
    }

    // Second attempt: global fallback if defined
    if (HP_CONFIG.GLOBAL_FALLBACK_IMAGE && !triedGlobalFallback) {
      triedGlobalFallback = true;
      imageEl.src = `images/${HP_CONFIG.GLOBAL_FALLBACK_IMAGE}`;
      return;
    }

    // If everything fails, hide the image and show placeholder
    imageEl.style.display = "none";
    placeholderEl.style.display = "block";
  };

  imageEl.src = `images/${primaryFile}`;
}
