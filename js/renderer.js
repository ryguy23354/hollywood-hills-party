// js/renderer.js
// Renderer for classic-script architecture.
// IMPORTANT: Exposes all needed functions on window (no import/export).

(function () {
  if (window.HP_RendererLoaded) return;
  window.HP_RendererLoaded = true;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function elById(primaryId, fallbackId) {
    return (
      document.getElementById(primaryId) ||
      (fallbackId ? document.getElementById(fallbackId) : null) ||
      null
    );
  }

  function getSceneTitleEl() {
    return elById("scene-title", "sceneTitle");
  }

  function getSceneTextEl() {
    return elById("scene-text", "sceneText");
  }

  function getSceneLocationEl() {
    return elById("meta-line", "sceneLocation");
  }

  function getSceneImageEl() {
    return elById("scene-image", "sceneImage");
  }

  function getChoicesContainerEl() {
    return elById("choices", "choicesContainer");
  }

  /* ------------------------------------------------------------------ */
  /* Scene parsing helpers                                              */
  /* ------------------------------------------------------------------ */

  function hpGetLocationKeyForScene(sceneId) {
    const m = /^scene_(bar|pool|lounge|balcony|gameloft)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  function hpGetCharacterKeyForScene(sceneId) {
    const m = /^scene_(sienna|riley|luna|harper|mara)_/i.exec(sceneId || "");
    return m ? m[1].toLowerCase() : null;
  }

  function hpGetSceneTitle(sceneId) {
    if (!window.HP_CONFIG) return "";
    if (sceneId === window.HP_CONFIG.START_SCENE_ID) return "Hollywood Party";

    const locKey = hpGetLocationKeyForScene(sceneId);
    if (locKey) return window.HP_CONFIG.LOCATION_DISPLAY?.[locKey] || locKey;

    const charKey = hpGetCharacterKeyForScene(sceneId);
    if (charKey) return window.HP_CONFIG.CHARACTER_DISPLAY?.[charKey]?.name || charKey;

    return "";
  }

  /* ------------------------------------------------------------------ */
  /* Image resolution                                                   */
  /* ------------------------------------------------------------------ */

  function hpResolveImageForScene(sceneId, scene) {
    const base = "images/";

    if (window.HP_CONFIG && sceneId === window.HP_CONFIG.START_SCENE_ID) {
      return base + "scene_00_intro.jpg";
    }

    if (scene?.image) {
      return scene.image.startsWith("http") ? scene.image : base + scene.image;
    }

    const charKey = hpGetCharacterKeyForScene(sceneId);
    const locKey =
      hpGetLocationKeyForScene(sceneId) ||
      (window.HP_STATE && window.HP_STATE.currentLocation);

    if (charKey && locKey) {
      return `${base}${charKey}_${locKey}_01.jpg`;
    }

    if (locKey) return `${base}${locKey}.jpg`;

    return "";
  }

  /* ------------------------------------------------------------------ */
  /* Button helpers                                                     */
  /* ------------------------------------------------------------------ */

  function hpFormatChoiceLabel(choiceKey) {
    if (choiceKey.startsWith("approach_")) {
      return "Approach " + choiceKey.replace("approach_", "").replace(/\b\w/g, c => c.toUpperCase());
    }

    return choiceKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function hpCreateChoiceButton(label, onClick) {
    const btn = document.createElement("button");
    btn.className = "btn choice-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering logic                                                    */
  /* ------------------------------------------------------------------ */

  function hpRenderGenericChoices(scene, container) {
    const choices = scene?.choices || {};
    const entries = Object.entries(choices);

    if (!entries.length) return;

    for (const [choiceKey, target] of entries) {
      const label = hpFormatChoiceLabel(choiceKey);

      container.appendChild(
        hpCreateChoiceButton(label, () => {
          // 🚨 PATCH: approach choices must resolve dynamically
          if (choiceKey.startsWith("approach_")) {
            if (window.StoryEngine && typeof window.StoryEngine.advanceRomance === "function") {
              const nextSceneId = window.StoryEngine.advanceRomance(
                window.HP_STATE.currentCharacter,
                choiceKey
              );

              if (nextSceneId) {
                window.hpLoadScene(nextSceneId);
              } else {
                console.error("Romance engine returned no next scene");
              }
            }
            return;
          }

          // Normal static scene transition
          if (typeof window.hpLoadScene === "function") {
            window.hpLoadScene(target);
          }
        })
      );
    }
  }

  function hpRenderScene(sceneId, scene) {
    if (!scene && window.StoryEngine) {
      scene = window.StoryEngine.getScene(sceneId, window.HP_STATE.currentCharacter);
    }

    if (!scene) {
      console.error("Missing scene:", sceneId);
      return;
    }

    window.HP_STATE.currentSceneId = sceneId;

    const titleEl = getSceneTitleEl();
    const textEl = getSceneTextEl();
    const locEl = getSceneLocationEl();
    const imgEl = getSceneImageEl();
    const choicesEl = getChoicesContainerEl();

    if (titleEl) titleEl.textContent = hpGetSceneTitle(sceneId);
    if (textEl) textEl.textContent = scene.text || "";
    if (locEl) locEl.textContent = "";

    if (imgEl) {
      const src = hpResolveImageForScene(sceneId, scene);
      if (src) {
        imgEl.src = src;
        imgEl.style.display = "block";
      } else {
        imgEl.style.display = "none";
      }
    }

    if (choicesEl) {
      choicesEl.innerHTML = "";
      hpRenderGenericChoices(scene, choicesEl);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Expose globals                                                     */
  /* ------------------------------------------------------------------ */

  window.hpRenderScene = window.hpRenderScene || hpRenderScene;
})();
