// Global state for affinity, interactions and routing

window.HP_STATE = {
  // per-character affinity score
  affinity: {},

  // per-character interaction count (number of choices taken while focused on them)
  interactions: {},

  // which character the player is currently focusing on (e.g. "sienna")
  currentCharacter: null,

  // id of the last scene that was rendered
  currentSceneId: null,

  // whether all story JSON has been loaded
  loaded: false,

  resetFor(character) {
    if (!character) return;
    this.affinity[character] = 0;
    this.interactions[character] = 0;
  },

  setActiveCharacter(character) {
    this.currentCharacter = character || null;
    if (character) {
      this.resetFor(character);
    }
  },

  getAffinity(character) {
    if (!character) return 0;
    return this.affinity[character] ?? 0;
  },

  modifyAffinity(character, delta) {
    if (!character || !delta) return;
    if (this.affinity[character] == null) {
      this.affinity[character] = 0;
    }
    this.affinity[character] += delta;
  },

  getInteractions(character) {
    if (!character) return 0;
    return this.interactions[character] ?? 0;
  },

  incrementInteractions(character) {
    if (!character) return;
    if (this.interactions[character] == null) {
      this.interactions[character] = 0;
    }
    this.interactions[character] += 1;
  }
};
