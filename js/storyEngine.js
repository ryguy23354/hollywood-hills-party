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
        HP_STATE.scenes = merged; // debug / inspection only
      }

      const statusEl = document.getElementById("jsonStatus");
      if (statusEl) {
        statusEl.textContent = "JSON status: ok";
        statusEl.style.color = "#52ffa8";
      }
    },

    /**
     * Resolve a scene by id, optionally in the context of a character.
     * This:
     *  - Normalizes different scene formats (choices vs options)
     *  - Applies affinity-based filters / endings
     *  - Applies random choice-count rules (2 options 75%, 3 options 25%)
     */
    getScene(sceneId, explicitCharacter) {
      if (!sceneId) return null;
      const base = this.scenes[sceneId];
      if (!base) {
        console.warn("StoryEngine.getScene: missing scene", sceneId);
        return null;
      }

      const scene = { ...base };

      // determine active character
      const activeCharacter =
        explicitCharacter ||
        (window.HP_STATE && HP_STATE.currentCharacter) ||
        scene.characterId ||
        null;

      // normalize options:
      // - if the scene already has "options", use that
      // - otherwise, if it has "choices" (characters_intro.json), convert them
      let rawOptions = [];

      if (Array.isArray(scene.options)) {
        rawOptions = scene.options.map(o => ({ ...o }));
      } else if (Array.isArray(scene.choices)) {
        rawOptions = scene.choices.map(choice => {
          const opt = {
            id: choice.id,
            text: choice.label,
            nextSceneId: choice.nextSceneId
          };
          if (typeof choice.affinityDelta === "number") {
            opt.effect = { affinity: choice.affinityDelta };
          }
          return opt;
        });
      }

      let baseOptions = rawOptions;
      const endingOptions = [];

      if (activeCharacter && window.HP_STATE) {
        const affinity = HP_STATE.getAffinity(activeCharacter);
        const interactions = HP_STATE.getInteractions(activeCharacter);

        // filter locked options
        baseOptions = baseOptions.filter(o => {
          const req = o.requirements;
          if (!req) return true;
          if (typeof req.minAffinity === "number" && affinity < req.minAffinity) return false;
          if (typeof req.maxAffinity === "number" && affinity > req.maxAffinity) return false;
          if (typeof req.minInteractions === "number" && interactions < req.minInteractions) return false;
          return true;
        });

        // bonus options (scene.bonusOptions) -> only sometimes included
        if (Array.isArray(scene.bonusOptions) && Math.random() < 0.25) {
          for (const bo of scene.bonusOptions) {
            baseOptions.push({ ...bo });
          }
        }

        // endings unlock after 4+ interactions
        if (interactions >= 4 && Array.isArray(scene.endings)) {
          for (const ending of scene.endings) {
            const minA = ending.minAffinity;
            const maxA = ending.maxAffinity;
            const meetsMin = (typeof minA !== "number") || affinity >= minA;
            const meetsMax = (typeof maxA !== "number") || affinity <= maxA;

            if (meetsMin && meetsMax) {
              endingOptions.push({
                id: ending.id || ending.nextSceneId || "ending",
                text: ending.text,
                nextSceneId: ending.nextSceneId,
                isEnding: true
              });
            }
          }
        }
      }

      // randomize base options and enforce 2 vs 3 rule
      if (baseOptions.length > 1) {
        baseOptions = [...baseOptions].sort(() => Math.random() - 0.5);
      }

      let maxBase = baseOptions.length;

      if (baseOptions.length > 2) {
        // 75% chance -> 2 options, 25% chance -> up to 3
        const wantThree = Math.random() < 0.25;
        maxBase = wantThree ? Math.min(3, baseOptions.length) : 2;
      }

      const finalBase = baseOptions.slice(0, maxBase);

      const finalOptions = finalBase.concat(endingOptions);

      return {
        ...scene,
        id: sceneId,
        options: finalOptions
      };
    },

    /**
     * Apply a choice's effect to affinity + interaction counts.
     */
    applyChoice(character, effect) {
      if (!character || !effect || !window.HP_STATE) return;
      if (typeof effect.affinity === "number") {
        HP_STATE.modifyAffinity(character, effect.affinity);
      }
      HP_STATE.incrementInteractions(character);
    }
  };

  window.StoryEngine = StoryEngine;
})();
