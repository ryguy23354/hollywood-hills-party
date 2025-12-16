// Core story / affinity engine
// Depends on global HP_CONFIG and HP_STATE from config.js and state.js

(function () {
  const StoryEngine = {
    scenes: {},
    loaded: false,

    async loadScenes() {
      if (this.loaded) return;

      if (!window.HP_CONFIG || !Array.isArray(HP_CONFIG.STORY_FILES)) {
        console.error("StoryEngine: HP_CONFIG.STORY_FILES is not defined");
        return;
      }

      const merged = {};

      for (const path of HP_CONFIG.STORY_FILES) {
        try {
          const res = await fetch(path);
          if (!res.ok) {
            console.error("StoryEngine: failed to load", path, res.status);
            continue;
          }
          const json = await res.json();
          for (const [id, scene] of Object.entries(json)) {
            merged[id] = scene;
          }
        } catch (err) {
          console.error("StoryEngine: error loading", path, err);
        }
      }

      this.scenes = merged;
      this.loaded = true;

      if (window.HP_STATE) {
        HP_STATE.loaded = true;
        HP_STATE.scenes = merged; // debug only
      }
    },

    /* ===============================
       HUB INTEGRATION (NEW)
    =============================== */

    enterHub(characterId) {
      if (!characterId) return;
      if (!window.HP_STATE) window.HP_STATE = {};

      HP_STATE.mode = "hub";
      HP_STATE.currentCharacter = characterId;
    },

    applyHubChoice(choice) {
      if (!choice || !window.HP_STATE) return;
      if (!window.HubEngine) {
        console.error("StoryEngine.applyHubChoice: HubEngine missing");
        return;
      }

      HubEngine.applyChoice(choice);
    },

    /* ===============================
       SCENE RESOLUTION (UNCHANGED)
    =============================== */

    getScene(sceneId, explicitCharacter) {
      if (!sceneId) return null;
      const base = this.scenes[sceneId];
      if (!base) {
        console.warn("StoryEngine.getScene: missing scene", sceneId);
        return null;
      }

      const scene = { ...base };

      const activeCharacter =
        explicitCharacter ||
        (window.HP_STATE && HP_STATE.currentCharacter) ||
        scene.characterId ||
        null;

      let rawOptions = [];

      if (Array.isArray(scene.options)) {
        rawOptions = scene.options.map(o => ({ ...o }));
      } else if (Array.isArray(scene.choices)) {
        rawOptions = scene.choices.map(choice => {
          const opt = {
            id: choice.id || choice.label,
            text: choice.label
          };

          if (choice.romanceStyle) {
            opt.enterHub = true;
            opt.hubPayload = {
              romance_style: choice.romanceStyle,
              delta: typeof choice.affinityDelta === "number" ? choice.affinityDelta : 0
            };
          } else {
            opt.nextSceneId = choice.nextSceneId;
            if (typeof choice.affinityDelta === "number") {
              opt.effect = { affinity: choice.affinityDelta };
            }
          }

          return opt;
        });
      }

      return {
        ...scene,
        id: sceneId,
        options: rawOptions
      };
    },

    applyChoice(character, style, delta) {
      if (!character || !window.HP_STATE) return;
      if (typeof delta === "number") {
        HP_STATE.modifyAffinity(character, delta);
      }
      HP_STATE.incrementInteractions(character);
    }
  };

  window.StoryEngine = StoryEngine;
})();
