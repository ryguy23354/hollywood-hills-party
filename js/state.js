// Global mutable state

const HP_STATE = {
  scenes: {},              // id -> scene object
  loaded: false,
  currentSceneId: null,
  currentLocation: null,   // active location (bar, pool, etc)
  currentCharacter: null,  // active character key (sienna, etc)
  locationAssignments: {}  // location -> [charKey, charKey]
};
