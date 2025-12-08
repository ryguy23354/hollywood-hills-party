// Bootstrapping

async function hpInit() {
  try {
    await hpLoadAllScenes();
    hpAssignCharactersToLocations();

    const meetBtn = document.getElementById("meetCharactersBtn");
    const restartBtn = document.getElementById("restartBtn");

    if (meetBtn) {
      meetBtn.addEventListener("click", hpOpenCharactersModal);
    }
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        hpAssignCharactersToLocations();
        HP_STATE.currentLocation = null;
        HP_STATE.currentCharacter = null;
        hpRenderScene(HP_CONFIG.START_SCENE_ID);
      });
    }

    hpWireModalEvents();
    hpRenderScene(HP_CONFIG.START_SCENE_ID);
  } catch (err) {
    console.error("Error during init:", err);
  }
}

document.addEventListener("DOMContentLoaded", hpInit);
