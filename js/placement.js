// js/placement.js
// Classic-script safe placement + helpers.
// Exposes functions on window and is idempotent.

(function () {
  if (window.HP_PlacementLoaded) return;
  window.HP_PlacementLoaded = true;

  // Canonical character + location lists (keys used throughout the project)
  const CHARACTERS = ["sienna", "riley", "luna", "harper", "mara"];
  const LOCATIONS = ["bar", "pool", "lounge", "balcony", "gameloft"];

  // Fixed placement patterns (2 characters per location; each character appears in 2 locations)
  const HP_PLACEMENT_PATTERNS = [
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
    // stable FNV-1a-ish hash of the seed into pattern index
    let hash = 2166136261;
    const s = String(seed ?? "");
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash % HP_PLACEMENT_PATTERNS.length;
  }

  function hpGetCharacterPlacement(seed) {
    const index = seedToPatternIndex(seed);
    const pattern = HP_PLACEMENT_PATTERNS[index];
    const result = {};
    for (const loc of LOCATIONS) result[loc] = [...(pattern[loc] || [])];
    return result;
  }

  function hpAssignCharactersToLocations(seed) {
    if (!window.HP_STATE) window.HP_STATE = {};
    const placement = hpGetCharacterPlacement(seed ?? (window.HP_STATE.nightSeed ?? ""));
    window.HP_STATE.locationAssignments = placement;

    // Also compute reverse lookup for convenience.
    const reverse = {};
    for (const c of CHARACTERS) reverse[c] = [];
    for (const loc of LOCATIONS) {
      for (const c of (placement[loc] || [])) reverse[c].push(loc);
    }
    window.HP_STATE.characterLocations = reverse;

    return placement;
  }

  function hpGetCharactersForLocation(locationKey) {
    const a = (window.HP_STATE && window.HP_STATE.locationAssignments) || {};
    return a[locationKey] ? [...a[locationKey]] : [];
  }

  function hpGetLocationsForCharacter(characterKey) {
    const r = (window.HP_STATE && window.HP_STATE.characterLocations) || null;
    if (r && r[characterKey]) return [...r[characterKey]];

    // Fallback: compute from assignments if reverse map isn't present yet.
    const a = (window.HP_STATE && window.HP_STATE.locationAssignments) || {};
    const out = [];
    for (const loc of LOCATIONS) {
      if ((a[loc] || []).includes(characterKey)) out.push(loc);
    }
    return out;
  }

  function hpGuessLocationForCharacter(characterKey) {
    const locs = hpGetLocationsForCharacter(characterKey);
    return locs.length ? locs[0] : null;
  }

  // Public API (classic script globals)
  window.HP_CHARACTERS = window.HP_CHARACTERS || CHARACTERS;
  window.HP_LOCATIONS = window.HP_LOCATIONS || LOCATIONS;

  window.HP_PLACEMENT_PATTERNS = window.HP_PLACEMENT_PATTERNS || HP_PLACEMENT_PATTERNS;

  window.hpAssignCharactersToLocations = window.hpAssignCharactersToLocations || hpAssignCharactersToLocations;
  window.hpGetCharacterPlacement = window.hpGetCharacterPlacement || hpGetCharacterPlacement;
  window.hpGetCharactersForLocation = window.hpGetCharactersForLocation || hpGetCharactersForLocation;
  window.hpGetLocationsForCharacter = window.hpGetLocationsForCharacter || hpGetLocationsForCharacter;
  window.hpGuessLocationForCharacter = window.hpGuessLocationForCharacter || hpGuessLocationForCharacter;
})();
