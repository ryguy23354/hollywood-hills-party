// Character placement with deterministic 2x2 mapping and 10-digit seeds

// Generate a random 10-digit numeric seed as a string
function hpGenerateSeed() {
  const n = Math.floor(1000000000 + Math.random() * 9000000000);
  return String(n);
}

// Deterministic hash of a seed string → pattern index
function hpSeedToPatternIndex(seedString) {
  let hash = 2166136261;
  const s = String(seedString == null ? "" : seedString);
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // keep as uint32
  }
  return hash % HP_PLACEMENT_PATTERNS.length;
}

// Canonical locations (must match HP_CONFIG.LOCATIONS)
const HP_LOCATIONS_INTERNAL = ["bar", "pool", "lounge", "balcony", "gameloft"];

// Pre-validated patterns: each character appears in exactly 2 locations,
// each location has 2 distinct characters.
const HP_PLACEMENT_PATTERNS = [
  {
    bar:      ["sienna", "harper"],
    pool:     ["riley", "mara"],
    lounge:   ["sienna", "luna"],
    balcony:  ["harper", "mara"],
    gameloft: ["riley", "luna"]
  },
  {
    bar:      ["sienna", "riley"],
    pool:     ["harper", "mara"],
    lounge:   ["luna", "harper"],
    balcony:  ["sienna", "mara"],
    gameloft: ["riley", "luna"]
  },
  {
    bar:      ["luna", "mara"],
    pool:     ["sienna", "harper"],
    lounge:   ["riley", "harper"],
    balcony:  ["sienna", "luna"],
    gameloft: ["riley", "mara"]
  },
  {
    bar:      ["riley", "luna"],
    pool:     ["sienna", "mara"],
    lounge:   ["harper", "mara"],
    balcony:  ["sienna", "harper"],
    gameloft: ["riley", "luna"]
  }
];

// Compute placement mapping for a given seed
function hpGetCharacterPlacementForSeed(seed) {
  const index = hpSeedToPatternIndex(seed);
  const pattern = HP_PLACEMENT_PATTERNS[index];
  const result = {};
  for (const loc of HP_LOCATIONS_INTERNAL) {
    result[loc] = pattern[loc].slice();
  }
  return result;
}

// Assign characters to locations using deterministic patterns
// Also sets HP_STATE.seed to the 10-digit seed used for this run,
// and resets affinity for a fresh night if HP_AFFINITY exists.
function hpAssignCharactersToLocations() {
  const seed = hpGenerateSeed();
  if (typeof HP_STATE !== "undefined") {
    HP_STATE.seed = seed;
  }

  const placement = hpGetCharacterPlacementForSeed(seed);
  HP_STATE.locationAssignments = placement;

  // reset affinity if present
  if (typeof HP_AFFINITY !== "undefined") {
    for (const k in HP_AFFINITY) {
      if (Object.prototype.hasOwnProperty.call(HP_AFFINITY, k)) {
        HP_AFFINITY[k] = 0;
      }
    }
  }
}

// Utility: get all locations where a given character appears
function hpGetLocationsForCharacter(charKey) {
  const result = [];
  const assignments = HP_STATE.locationAssignments || {};
  for (const loc in assignments) {
    const chars = assignments[loc] || [];
    if (chars.includes(charKey)) {
      result.push(loc);
    }
  }
  return result;
}
