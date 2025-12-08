// Character placement
function hpShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hpAssignCharactersToLocations() {
  const pool = [];
  for (const c of HP_CONFIG.CHARACTERS) {
    pool.push(c, c);
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

function hpGetLocationsForCharacter(charKey) {
  const result = [];
  for (const [loc, chars] of Object.entries(HP_STATE.locationAssignments)) {
    if (chars.includes(charKey)) result.push(loc);
  }
  return result;
}
