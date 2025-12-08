
// Character placement randomizer

function hpShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Each character appears in exactly 2 locations.
// Each location gets exactly 2 characters.
function hpAssignCharactersToLocations() {
  const pool = [];
  for (const char of HP_CONFIG.CHARACTERS) {
    pool.push(char, char); // duplicate each character
  }

  hpShuffle(pool);

  const assignments = {};
  let index = 0;
  for (const loc of HP_CONFIG.LOCATIONS) {
    assignments[loc] = [pool[index], pool[index + 1]];
    index += 2;
  }

  HP_STATE.locationAssignments = assignments;
}

// Utility: invert the mapping to get locations per character
function hpGetLocationsForCharacter(charKey) {
  const result = [];
  for (const [loc, chars] of Object.entries(HP_STATE.locationAssignments)) {
    if (chars.includes(charKey)) {
      result.push(loc);
    }
  }
  return result;
}
