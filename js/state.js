
// Global mutable state for Hollywood Party

const HP_STATE = {
  scenes: {},                // id -> scene data
  loaded: false,
  currentSceneId: null,
  locationAssignments: {}    // location -> [charKey, charKey]
};
