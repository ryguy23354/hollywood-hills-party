// js/placement.js
// Safe, idempotent placement logic for classic scripts

(function () {
  // Prevent double execution
  if (window.HP_PlacementLoaded) {
    return;
  }
  window.HP_PlacementLoaded = true;

  // Canonical character + location lists
  const CHARACTERS = ["sienna", "riley", "luna", "harper", "mara"];
  const LOCATIONS = ["bar", "pool", "lounge", "balcony", "gameloft"];

  // Fixed placement patterns (2 characters per location)
  const PLACEMENT_PATTERNS = [
    {
      bar: ["sienna", "harper"],
      pool: ["riley", "mara"],
      lounge: ["sienna", "luna"],
      balcony: ["harper", "mara"],
      gameloft: ["riley", "luna"]
    },
    {
      bar: ["sienna", "riley"],
      pool: ["harper", "mara"],
      lounge: ["luna", "harper"],
      balcony: ["sienna", "mara"],
      gameloft: ["riley", "luna"]
    },
    {
      bar: ["luna", "mara"],
      pool: ["sienna", "harper"],
      lounge: ["riley", "harper"],
      balcony: ["sienna", "luna"],
      gameloft: ["riley", "mara"]
    },
    {
      bar: ["riley", "luna"],
      pool: ["sienna", "mara"],
      lounge: ["harper", "mara"],
      balcony: ["sienna", "harper"],
      gameloft: ["riley", "luna"]
    }
  ];

  function seedToPatternIndex(seed) {
    let hash = 2166136261;
    const s = String(seed ?? "");
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash % PLACEMENT_PATTERNS.length;
  }

  function getCharacterPlacement(seed) {
    const index = seedToPatternIndex(seed);
    const pattern = PLACEMENT_PATTERNS[index];
    const result = {};

    for (const loc of LOCATIONS) {
      result[loc] = [...pattern[loc]];
    }

    return result;
  }

  function getCharactersForLocation(locationId, placement) {
    return placement[locationId] ? [...placement[locationId]] : [];
  }

  // Public API
  window.hpGetCharacterPlacement = getCharacterPlacement;
  window.hpGetCharactersForLocation = getCharactersForLocation;
})();
