
// Story Engine with Affinity Support
import { HP_STATE } from './state.js';
import { HP_CONFIG } from './config.js';

export const StoryEngine = {
    scenes: {},
    loaded: false,

    async loadScenes() {
        if (this.loaded) return;
        for (const file of HP_CONFIG.STORY_FILES) {
            const res = await fetch(file);
            const json = await res.json();
            Object.assign(this.scenes, json);
        }
        this.loaded = true;
    },

    getScene(sceneId, character=null) {
        const scene = this.scenes[sceneId];
        if (!scene) return null;

        let options = [...scene.options];

        // Affinity-based branching
        if (character) {
            const affinity = HP_STATE.getAffinity(character);
            const interactions = HP_STATE.getInteractions(character);

            // Filter locked options
            options = options.filter(o => {
                if (!o.requirements) return true;
                if (o.requirements.minAffinity && affinity < o.requirements.minAffinity) return false;
                if (o.requirements.maxAffinity && affinity > o.requirements.maxAffinity) return false;
                if (o.requirements.minInteractions && interactions < o.requirements.minInteractions) return false;
                return true;
            });

            // 25% chance to add a bonus option
            if (Math.random() < 0.25 && scene.bonusOptions) {
                options.push(...scene.bonusOptions);
            }

            // Add ending options only after enough interactions
            if (interactions >= 4 && scene.endings) {
                for (const ending of scene.endings) {
                    const meetsAffinity =
                        (ending.minAffinity === undefined || affinity >= ending.minAffinity) &&
                        (ending.maxAffinity === undefined || affinity <= ending.maxAffinity);

                    if (meetsAffinity) {
                        options.push({
                            text: ending.text,
                            nextSceneId: ending.nextSceneId,
                            isEnding: true
                        });
                    }
                }
            }
        }

        // Shuffle and limit to 2 (except when bonus is added)
        if (options.length > 2) {
            options = options.sort(() => Math.random() - 0.5).slice(0, 2);
        }

        return { ...scene, options };
    },

    applyChoice(character, effect) {
        if (!character || !effect) return;
        if (effect.affinity) HP_STATE.modifyAffinity(character, effect.affinity);
        HP_STATE.incrementInteractions(character);
    }
};
