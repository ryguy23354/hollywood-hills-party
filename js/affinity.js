
// Affinity system scaffold
const HP_AFFINITY = { sienna:0, riley:0, luna:0, harper:0, mara:0 };

function hpModifyAffinity(charKey, delta){
  if(!(charKey in HP_AFFINITY)) return;
  HP_AFFINITY[charKey]+=delta;
  if(HP_CONFIG.DEBUG_MODE) hpDebugRender();
}
