// renderer.js (rewritten) - robust scene/image/choice rendering for the Hollywood Hills Party UI
// Goals:
// - Render scene title, location, narrative text, and image (if available)
// - Render choices from either an object-map or an array format
// - Support affinity/approach choices whose "target" is an object (romance_style/delta, etc.)
// - Be tolerant of differing index.html element IDs (older/newer UI variants)
// - Avoid hard crashes; log actionable warnings instead

console.log("renderer.js v 22-Dec 5:31 PM");

(function () {
  "use strict";

  // ---------- Utilities ----------
	function hpInjectDynamicLocationChoices(sceneId, scene) {
	  if (!scene || scene.sceneRole !== "location") return;

	  const assignments = window.HP_STATE?.locationAssignments;
	  if (!assignments) return;

	  const loc = scene.location || hpLocationKeyFromSceneId(sceneId) || scene.id || sceneId;

	  const chars = assignments[loc];
	  if (!Array.isArray(chars) || chars.length !== 2) return;

	  // Normalize choices to an array (some scenes define choices as an object)
	  if (!Array.isArray(scene.choices)) {
		  scene.choices = [];
	  }
		
	  scene.choices = [
		  ...(scene.choices || []),
		  {
		    label: `Approach ${chars[0].charAt(0).toUpperCase()}${chars[0].slice(1)}`,
		    target: `scene_${loc}_${chars[0]}_01`
		  },
		  {
		    label: `Approach ${chars[1].charAt(0).toUpperCase()}${chars[1].slice(1)}`,
		    target: `scene_${loc}_${chars[1]}_01`
		  },
		  {
		    label: 'Return to the main party',
		    target: 'scene_00_intro'
		  }
		];

	  console.log("[injector]", sceneId, scene.choices);
	}

  function hpLogWarn(...args) {
    try { console.warn(...args); } catch (_) {}
  }
  function hpLogErr(...args) {
    try { console.error(...args); } catch (_) {}
  }

  function hpSafeGet(obj, path, fallback) {
    try {
      let cur = obj;
      for (const k of path) cur = cur?.[k];
      return cur ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function hpHumanizeChoiceKey(key) {
    if (!key) return "";
    // keep already-nice labels
    if (/\s/.test(key) && /[A-Za-z]/.test(key)) return key;
    // strip common prefixes
    let s = String(key).replace(/^go_to_/, "").replace(/^approach_/, "").replace(/^return_to_/, "return to ");
    s = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (!s) return String(key);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function hpCreateButton(label, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function hpClear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function hpFirstExistingElementId(ids) {
    // Allow both hpFirstExistingElementId(["a","b"])
    // and hpFirstExistingElementId("a","b")
    if (!Array.isArray(ids)) {
  	  ids = Array.from(arguments);
	}
  for (const id of ids) {
	const el = document.getElementById(id);
	if (el) return el;
    }
	  return null;
  }


  function hpGetStoryEngine() {
    return window.StoryEngine || window.storyEngine || null;
  }

  function hpGetScene(sceneId) {
    const SE = hpGetStoryEngine();
    if (SE && typeof SE.getScene === "function") return SE.getScene(sceneId);
    // fallback to common storage spots
    const scenes =
      hpSafeGet(SE, ["scenes"], null) ||
      hpSafeGet(window, ["HP_STATE", "scenes"], null) ||
      hpSafeGet(window, ["STATE", "scenes"], null);
    return scenes ? scenes[sceneId] : undefined;
  }

  function hpGetScenesObject() {
    const SE = hpGetStoryEngine();
    return (
      hpSafeGet(SE, ["scenes"], null) ||
      hpSafeGet(window, ["HP_STATE", "scenes"], null) ||
      hpSafeGet(window, ["STATE", "scenes"], null) ||
      {}
    );
  }

  function hpGetCurrentSceneId() {
    return (
      hpSafeGet(window, ["HP_STATE", "currentSceneId"], null) ||
      hpSafeGet(window, ["HP_STATE", "sceneId"], null) ||
      hpSafeGet(window, ["STATE", "currentSceneId"], null) ||
      hpSafeGet(window, ["STATE", "sceneId"], null) ||
      null
    );
  }

  function hpSetCurrentSceneId(sceneId) {
    if (window.HP_STATE) window.HP_STATE.currentSceneId = sceneId;
    if (window.STATE) window.STATE.currentSceneId = sceneId;
  }

  function hpGetActiveCharacter() {
    const SE = hpGetStoryEngine();
    return (
      hpSafeGet(window, ["HP_STATE", "activeCharacter"], null) ||
      hpSafeGet(window, ["HP_STATE", "currentCharacter"], null) ||
      hpSafeGet(SE, ["activeCharacter"], null) ||
      hpSafeGet(SE, ["currentCharacter"], null) ||
      null
    );
  }

  function hpIsAffinityChoiceTarget(t) {
    // An affinity choice "target" is an object with romance_style / romanceStyle and optional delta.
    return !!t && typeof t === "object" && ("romance_style" in t || "romanceStyle" in t || "style" in t || "delta" in t);
  }

/**
 * DOM lookup helper that supports multiple historical IDs.
 * Prevents silent render failures when index.html element IDs differ.
 */
function hpGetEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}


  // ---------- Image Resolution ----------

  function hpResolveSceneImage(sceneId, scene) {
    // Try engine-provided resolver first
    const SE = hpGetStoryEngine();
	if (SE && typeof SE.getSceneImage === "function") {
	  try {
		const img = SE.getSceneImage(sceneId, scene);
		if (typeof img === "string" && img.trim()) {
		  return img;
		}
	  } catch (e) {
		hpLogWarn("renderer: getSceneImage failed", e);
	  }
	}


    // Common field names in JSON
    const direct = scene?.image || scene?.img || scene?.imagePath || scene?.image_path;
    if (typeof direct === "string" && direct.trim()) return direct;

    // Images manifest map (several possible shapes)
    const manifest =
      hpSafeGet(window, ["HP_STATE", "images"], null) ||
      hpSafeGet(window, ["HP_STATE", "imagesManifest"], null) ||
      hpSafeGet(window, ["HP_IMAGES"], null) ||
      null;

    if (manifest) {
      // { sceneId: "path" }
      if (typeof manifest[sceneId] === "string") return manifest[sceneId];

      // { scenes: { sceneId: "path" } }
      const fromScenes = hpSafeGet(manifest, ["scenes", sceneId], null);
      if (typeof fromScenes === "string") return fromScenes;

      // { locations: { bar: "..." }, characters: {...} } – attempt best-effort
      const loc = hpSafeGet(scene, ["location"], null) || hpLocationKeyFromSceneId(sceneId);
      const ch = hpSafeGet(scene, ["character"], null) || hpCharacterKeyFromSceneId(sceneId);
      const locImg = loc ? hpSafeGet(manifest, ["locations", loc], null) : null;
      if (typeof locImg === "string") return locImg;
      const chImg = ch ? hpSafeGet(manifest, ["characters", ch], null) : null;
      if (typeof chImg === "string") return chImg;
    }

    return null;
  }

  function hpLocationKeyFromSceneId(sceneId) {
    const m = /^scene_(bar|pool|lounge|balcony|gameloft)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  function hpCharacterKeyFromSceneId(sceneId) {
    const m = /^scene_(sienna|riley|luna|harper|mara)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  // ---------- Choice Normalization ----------

  function hpNormalizeChoices(scene) {
	// 🔥 DYNAMIC HUB OVERRIDE (authoritative)
	const assignments = window.HP_STATE?.locationAssignments;
	const loc = scene?.location || hpLocationKeyFromSceneId(scene?.id) || scene?.id;

	if (assignments && loc && Array.isArray(assignments[loc])) {
	  const approachChoices = assignments[loc].map(charKey => ({
		key: `approach_${charKey}`,
		label: `Approach ${charKey.charAt(0).toUpperCase()}${charKey.slice(1)}`,
		target: {
		  type: "hub",
		  character: charKey,
		  location: loc
		}
	  }));

	  return [
		...approachChoices,
		{
		  key: 'return_main_party',
		  label: 'Return to the main party',
		  target: 'scene_00_intro'
		}
	  ];
	}

	  
    // Returns array of { key, label, target }
    const raw = scene?.choices ?? scene?.options ?? scene?.buttons ?? null;

    // If already an array:
    if (Array.isArray(raw)) {
      const out = [];
      for (let i = 0; i < raw.length; i++) {
        const it = raw[i];
        if (typeof it === "string") {
          out.push({ key: it, label: hpHumanizeChoiceKey(it), target: it });
          continue;
        }
        if (it && typeof it === "object") {
          // common shapes:
          // { id, label, target } OR { label, next } OR { text, goto } OR { key: "x", value: "scene_y" }
          const key = it.id ?? it.key ?? it.choiceKey ?? it.name ?? `choice_${i}`;
          const label = it.label ?? it.text ?? it.title ?? hpHumanizeChoiceKey(key);
          let target = (
			it.target ??
			it.next ??
			it.goto ??
			it.scene ??
			it.to ??
			it.value ??
			null
			);

		// Romance-style choices: { label, reactions }
		if (!target && Array.isArray(it.reactions)) {
		  target = it;
		}

          out.push({ key, label, target });
          continue;
        }
      }
      return out;
    }

    // If map/object:
    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([key, target]) => ({
        key,
        label: hpHumanizeChoiceKey(key),
        target
      }));
    }

    return [];
  }

  // ---------- Rendering ----------

  function hpSetText(el, text) {
    if (!el) return;
    el.textContent = text ?? "";
  }

  function hpRenderImage(sceneId, scene) {
	const src = (
	scene?.image ??
	hpResolveSceneImage(sceneId, scene) ??
	"");


  let container = document.getElementById("sceneImageContainer");


  // Create image container if missing (mirrors choices behavior)
  if (!container) {
    container = document.createElement("div");
    container.id = "sceneImage";
    container.className = "scene-image";

    const story =
	document.getElementById("story") ||
	document.getElementById("story-container");

	if (!story) {
	  console.warn("renderer: no story container — abort image render");
	  return;
	}

	story.insertBefore(container, story.firstChild);


    hpLogWarn("renderer: image container missing — created dynamically");
  }

  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.loading = "eager";
  img.style.maxWidth = "100%";
  img.style.borderRadius = "12px";

  container.appendChild(img);
  }


  function hpRenderNarrative(sceneId, scene) {
  // Targeted fix: NEVER treat the #story container as the narrative text element.
  // Use the dedicated elements in index.html when present, with legacy fallbacks.
  const titleEl = hpGetEl("scene-title", "sceneTitle", "title");
  const locEl = hpGetEl("meta-line", "sceneLocation", "location");
  const textEl = hpGetEl("scene-text", "sceneText", "narrative", "text");

  const title = (
	  scene?.title ??
	  scene?.name ??
	  scene?.id ??
	  hpHumanizeSceneId?.(sceneId) ??
	  String(sceneId ?? "Scene")
	);

  const location = scene?.location_display ?? scene?.locationDisplay ?? scene?.location ?? hpLocationKeyFromSceneId(sceneId) ?? "";
  const text =
    scene?.text ??
    scene?.description ??
    scene?.narrative ??
    scene?.body ??
    "";

  hpSetText(titleEl, title);
  if (locEl) hpSetText(locEl, location ? String(location) : "");
  hpSetText(textEl, text ? String(text) : "");
}


	function hpRenderChoices(sceneId, scene) {
	  const container = document.getElementById("choicesContainer");

	  if (!container) {
		console.error(
		  "[renderer] choicesContainer not found in DOM — cannot render choices",
		  sceneId
		);
		return;
	  }

	  hpClear(container);

	  const choices = hpNormalizeChoices(scene);
	  if (!choices.length) return;

	  for (const c of choices) {
		const label = c.label || hpHumanizeChoiceKey(c.key);
		const target = c.target;

		container.appendChild(
		  hpCreateButton(label, () => {
			// Affinity-style targets
			if (hpIsAffinityChoiceTarget(target)) {
			  const style = target.romance_style ?? target.romanceStyle ?? target.style;
			  const delta = Number(target.delta ?? 0);

			  const SE = hpGetStoryEngine();
			  if (SE && typeof SE.applyChoice === "function" && style) {
				SE.applyChoice(hpGetActiveCharacter(), style, delta);
			  }

			  if (SE && typeof SE.enterHub === "function") {
				SE.enterHub(hpGetActiveCharacter());
			  }

			  const cur = hpGetCurrentSceneId() || sceneId;
			  if (typeof window.hpRenderScene === "function") {
				window.hpRenderScene(cur);
			  }
			  return;
			}

			// String scene targets
			if (typeof target === "string") {
			  if (typeof window.hpLoadScene === "function") {
				window.hpLoadScene(target);
			  } else if (typeof window.hpRenderScene === "function") {
				window.hpRenderScene(target);
			  }
			  return;
			}

			// Function targets
			if (typeof target === "function") {
			  target();
			  return;
			}

			console.warn("renderer: unsupported choice target", target);
		  })
		);
	  }
	}


  function hpRenderScene(sceneId) {
	  if (!sceneId) {
		hpLogWarn("renderer: hpRenderScene called with empty sceneId");
		return;
	  }

	  hpSetCurrentSceneId(sceneId);

	  const scene = hpGetScene(sceneId);
	  if (!scene) {
		hpRenderNarrative(sceneId, {
		  title: "Missing scene",
		  text: `Scene not found: ${sceneId}`
		});
		hpRenderChoices(sceneId, { choices: {} });
		return;
	  }

	  // 🔥 THIS IS THE WIRING
	 hpRenderNarrative(sceneId, scene);
	 hpRenderImage(sceneId, scene);

	 hpInjectDynamicLocationChoices(sceneId, scene);

	 hpRenderChoices(sceneId, {
		...scene,
		choices: scene._injectedChoices || scene.choices
	 });

	}


  // ---------- Public API ----------

  window.hpRenderScene = hpRenderScene;

  // Convenience: allow renderer to be used even if other code calls hpRenderSceneId / hpRender
  window.hpRender = window.hpRender || hpRenderScene;
  window.hpRenderSceneId = window.hpRenderSceneId || hpRenderScene;

  // If the page already has a current scene id, try to render it (but don’t fight main.js if it controls flow)
  try {
    const existing = hpGetCurrentSceneId();
    if (existing) {
      // Defer to end of current tick so scripts can finish init
      setTimeout(() => {
        // Render only if choices container exists (avoid rendering into incomplete DOM)
        const container = hpFirstExistingElementId(["choicesContainer", "choices", "options", "buttons"]);
        if (container) hpRenderScene(existing);
      }, 0);
    }
  } catch (_) {}
})();
