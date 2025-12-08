// Character placement randomizer

function hpShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Each character appears in exactly 2 locations.
// Each location gets exactly 2 characters.
function hpAssignCharactersToLocations() {
  const pool = [];
  for (const char of HP_CONFIG.CHARACTERS) {
    pool.push(char, char);
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

// Utility to see where a character is tonight
function hpGetLocationsForCharacter(charKey) {
  const result = [];
  for (const [loc, chars] of Object.entries(HP_STATE.locationAssignments)) {
    if (chars.includes(charKey)) {
      result.push(loc);
    }
  }
  return result;
}
