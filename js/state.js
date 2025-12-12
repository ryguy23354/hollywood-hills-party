
// Global state for affinity + interactions
export const HP_STATE = {
    affinity: {},
    interactions: {},

    resetFor(character) {
        this.affinity[character] = 0;
        this.interactions[character] = 0;
    },

    getAffinity(character) {
        return this.affinity[character] ?? 0;
    },

    modifyAffinity(character, value) {
        if (!this.affinity[character]) this.affinity[character] = 0;
        this.affinity[character] += value;
    },

    getInteractions(character) {
        return this.interactions[character] ?? 0;
    },

    incrementInteractions(character) {
        if (!this.interactions[character]) this.interactions[character] = 0;
        this.interactions[character] += 1;
    }
};
