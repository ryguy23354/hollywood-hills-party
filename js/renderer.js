/* =========================================================
   renderer.js — FULLY PATCHED (Affinity-safe, no regressions)
   ========================================================= */

/* -------------------------------
   Utilities
-------------------------------- */

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* -------------------------------
   Image Rendering
-------------------------------- */

function renderSceneImage(container, scene) {
  if (!scene.image) return;

  const img = document.createElement("img");
  img.className = "scene-image";
  img.src = window.hpResolveImage
    ? window.hpResolveImage(scene.image)
    : scene.image;

  img.alt = scene.title || "Scene image";
  container.appendChild(img);
}

/* -------------------------------
   Text Rendering
-------------------------------- */

function renderSceneText(container, scene) {
  if (!scene.text) return;

  const p = el("p", "scene-text");
  p.textContent = scene.text;
  container.appendChild(p);
}

/* -------------------------------
   Choice Button Factory
-------------------------------- */

function createChoiceButton(label, onClick) {
  const btn = el("button", "choice-button", label);
  btn.onclick = onClick;
  return btn;
}

/* -------------------------------
   AFFINITY HANDLER (KEY FIX)
-------------------------------- */

window.hpApplyAffinityChoice = function (choice) {
  if (!choice) return;

  // Update affinity state
  if (window.HP_STATE) {
    HP_STATE.affinityScore =
      (HP_STATE.affinityScore || 0) + (choice.delta || 0);

    if (choice.romance_style) {
      HP_STATE.romanceStyle = choice.romance_style;
    }
  }

  // Ask StoryEngine for next affinity-driven choices
  if (
    window.StoryEngine &&
    typeof StoryEngine.getAffinityChoices === "function"
  ) {
    const nextChoices = StoryEngine.getAffinityChoices(
      HP_STATE.currentCharacter,
      HP_STATE.affinityScore,
      HP_STATE.romanceStyle
    );

    // Re-render hub with updated choices
    hpRenderAffinityHub(nextChoices);
  }
};

/* -------------------------------
   AFFINITY HUB RENDER
-------------------------------- */

function hpRenderAffinityHub(choices) {
  const container = document.getElementById("choicesContainer");
  if (!container) return;

  clear(container);

  if (!choices || !choices.length) return;

  choices.forEach((choice) => {
    container.appendChild(
      createChoiceButton(choice.label, () => {
        // Ending?
        if (choice.ending) {
          hpLoadScene(choice.ending);
          return;
        }

        // Another affinity step
        window.hpApplyAffinityChoice(choice);
      })
    );
  });
}

/* -------------------------------
   MAIN SCENE RENDERER
-------------------------------- */

window.hpRenderScene = function (sceneId, scene) {
  const root = document.getElementById("story");
  if (!root) return;

  clear(root);

  const card = el("div", "scene-card");
  root.appendChild(card);

  // Title
  if (scene.title) {
    card.appendChild(el("h2", "scene-title", scene.title));
  }

  // Image
  renderSceneImage(card, scene);

  // Text
  renderSceneText(card, scene);

  // Choices
  const choicesContainer = el("div", "choices-container");
  choicesContainer.id = "choicesContainer";
  card.appendChild(choicesContainer);

  const choices = scene.choices || scene.options || {};

  Object.entries(choices).forEach(([label, target]) => {
    choicesContainer.appendChild(
      createChoiceButton(label, () => {
        // 🔹 AFFINITY CHOICE (object target)
        if (typeof target === "object") {
          window.hpApplyAffinityChoice(target);
          return;
        }

        // 🔹 SCENE TRANSITION (string target)
        if (typeof target === "string") {
          hpLoadScene(target);
        }
      })
    );
  });
};

/* -------------------------------
   LOCATION OVERVIEW (UNCHANGED)
-------------------------------- */

window.hpRenderLocationOverview = function (locationKey, data) {
  const root = document.getElementById("story");
  if (!root) return;

  clear(root);

  const card = el("div", "scene-card");
  root.appendChild(card);

  card.appendChild(el("h2", "scene-title", data.title || locationKey));
  card.appendChild(el("p", "scene-text", data.text || ""));

  const choices = el("div", "choices-container");
  card.appendChild(choices);

  (data.characters || []).forEach((char) => {
    choices.appendChild(
      createChoiceButton(`Approach ${char.name}`, () => {
        HP_STATE.currentCharacter = char.id;
        hpLoadScene(char.entryScene);
      })
    );
  });

  choices.appendChild(
    createChoiceButton("Return to Party", () => {
      hpLoadScene("scene_00_intro");
    })
  );
};

/* -------------------------------
   End of renderer.js
-------------------------------- */
