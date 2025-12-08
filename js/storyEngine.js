// Bootstrapping

async function hpInit() {
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
      hpRenderScene(HP_CONFIG.START_SCENE_ID);
    });
  }

  hpWireModalEvents();
  hpRenderScene(HP_CONFIG.START_SCENE_ID);
}

document.addEventListener("DOMContentLoaded", () => {
  hpInit().catch((err) => {
    console.error(err);
    hpSetStatus("Error initializing story engine. Check console for details.", true);
  });
});
