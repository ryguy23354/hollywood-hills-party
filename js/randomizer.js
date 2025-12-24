(function () {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateAssignments(characters, locations) {
    const appearancesPerCharacter = 2;
    const slotsPerLocation = 2;

    const totalSlots =
      characters.length * appearancesPerCharacter;

    if (locations.length * slotsPerLocation !== totalSlots) {
      throw new Error(
        'Invalid configuration: characters × appearances must equal locations × slots'
      );
    }

    // Build appearance pool
    let pool = [];
    for (const c of characters) {
      for (let i = 0; i < appearancesPerCharacter; i++) {
        pool.push(c);
      }
    }

    // Try until valid (will converge very fast at this size)
    for (let attempt = 0; attempt < 1000; attempt++) {
      const shuffled = shuffle(pool);
      const assignments = {};
      let index = 0;
      let valid = true;

      for (const loc of locations) {
        const pair = [shuffled[index], shuffled[index + 1]];
        index += 2;

        // Enforce distinct characters per location
        if (pair[0] === pair[1]) {
          valid = false;
          break;
        }

        assignments[loc] = pair;
      }

      if (valid) {
        return assignments;
      }
    }

    throw new Error('Failed to generate valid character assignments');
  }

  // 🔌 Public API (same name you already use)
  window.hpAssignCharactersToLocations = function () {
    const characters = Object.keys(window.HP_STATE.characters || {});
    const locations = Object.values(window.HP_STATE.scenes || {})
      .filter(s => s.sceneRole === 'location')
      .map(s => s.location || s.id);

    const assignments = generateAssignments(characters, locations);
    window.HP_STATE.locationAssignments = assignments;

    console.log('[init] locationAssignments', assignments);
  };

})();
