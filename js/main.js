// main.js (patched)
// Reliable bootstrap for StoryEngine + storyLoader + renderer.
// Exposes the globals expected by index.html and renderer.js:
//   - start()
//   - hpStartGame()
//   - hpLoadScene(sceneId)

(function () {
  'use strict';

  // Ensure HP_STATE exists.
  window.HP_STATE = window.HP_STATE || {};

  let starting = false;
  let started = false;

  /**
   * Returns true when scenes are actually present (not just a flag).
   */
  function scenesReady() {
    const scenes = window.HP_STATE && window.HP_STATE.scenes;
    return !!(scenes && typeof scenes === 'object' && Object.keys(scenes).length > 0);
  }

  /**
   * Loads/merges story JSON (storyLoader.js) and syncs it into StoryEngine.
   */
  async function ensureScenesLoaded() {
    // 1) If storyLoader provides an async loader, use it.
    if (typeof window.hpLoadAllScenes === 'function') {
      // hpLoadAllScenes sets HP_STATE.scenes and HP_STATE.loaded.
      await window.hpLoadAllScenes();
    }

    // 2) If StoryEngine can sync from HP_STATE.scenes, do it.
    if (window.StoryEngine && typeof window.StoryEngine.loadScenes === 'function') {
      try {
        window.StoryEngine.loadScenes();
      } catch (e) {
        console.warn('main.js: StoryEngine.loadScenes() threw; continuing', e);
      }
    }

    return scenesReady();
  }

  /**
   * Loads a scene by id and renders it using renderer.js.
   * This is what renderer.js calls for normal navigation.
   */
  function hpLoadScene(sceneId) {
    if (!sceneId) return;

    // Some callers may accidentally pass an object (e.g., affinity choice payload).
    // Do not attempt to treat that as a scene id.
    if (typeof sceneId === 'object') {
      console.warn('hpLoadScene: received non-string sceneId; ignoring', sceneId);
      return;
    }

    // Track current scene.
    window.HP_STATE.currentSceneId = sceneId;

    // Prefer renderer's entrypoint if present.
    if (typeof window.hpRenderScene === 'function') {
      window.hpRenderScene(sceneId);
      return;
    }

    // Fallback: attempt direct DOM update if renderer isn't loaded.
    console.warn('hpLoadScene: hpRenderScene is not available; cannot render', sceneId);
  }

  /**
   * Starts the game. Called by index.html via start().
   */
  async function hpStartGame() {
    if (starting || started) return;
    starting = true;

    try {
      const ok = await ensureScenesLoaded();
      if (!ok) {
        console.error('main.js: scenes failed to load (HP_STATE.scenes is empty).');
        return;
      }

      // Select a start scene id.
      const startSceneId =
        (window.HP_CONFIG && window.HP_CONFIG.START_SCENE_ID) ||
        window.HP_STATE.startSceneId ||
        'scene_00_intro';

      hpLoadScene(startSceneId);
      started = true;
    } catch (e) {
      console.error('main.js: failed to start game', e);
    } finally {
      starting = false;
    }
  }

  // --- Public globals expected by the rest of the app ---
  window.hpLoadScene = hpLoadScene;
  window.hpStartGame = hpStartGame;

  // index.html calls start() on DOMContentLoaded.
  // Keep compatibility with older naming.
  window.start = hpStartGame;

  // Optional: allow manual restart via console.
  window.hpRestartNight = async function hpRestartNight() {
    // Clear basic runtime state, but keep loaded scene map.
    window.HP_STATE.currentSceneId = null;
    if (window.StoryEngine && typeof window.StoryEngine.reset === 'function') {
      try { window.StoryEngine.reset(); } catch (_) {}
    }
    await hpStartGame();
  };
})();
