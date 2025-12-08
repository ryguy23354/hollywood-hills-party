
// js/placement.js
const HP_CHARACTERS = ["sienna", "riley", "luna", "harper", "mara"];
const HP_LOCATIONS = ["bar", "pool", "lounge", "balcony", "gameloft"];

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

function hpSeedToPatternIndex(seedString) {
  let hash = 2166136261;
  const s = String(seedString ?? "");
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % HP_PLACEMENT_PATTERNS.length;
}

export function hpGetCharacterPlacement(seed) {
  const index = hpSeedToPatternIndex(seed);
  const pattern = HP_PLACEMENT_PATTERNS[index];
  const result = {};
  for (const loc of HP_LOCATIONS) {
    result[loc] = [...pattern[loc]];
  }
  return result;
}

export function hpGetCharactersForLocation(locationId, placement) {
  return placement[locationId] ? [...placement[locationId]] : [];
}
