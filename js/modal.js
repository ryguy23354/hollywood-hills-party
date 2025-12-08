// Meet the Characters modal (Classic A1 layout)
// This version is INFORMATION-ONLY and does NOT depend on nightly placement.
// It always shows the same five character profiles with portrait, archetype,
// long-form description, and signature drink.

const HP_CHARACTER_BIOS = {
  sienna: {
    description:
      "A fiery pop star with her heart on her sleeve. Sienna lives for big feelings, late-night conversations, and the kind of chemistry you can feel across a crowded room. She’s dramatic in all the good ways — quick to laugh, quick to blush, and impossible to ignore once her attention is on you.",
    drink: "Vodka cranberry"
  },
  riley: {
    description:
      "An athletic firecracker with a fearless grin. Riley moves like she’s always mid-performance — bumping shoulders, laughing too loud, and turning every moment into a playful challenge. If you can keep up with her energy, she’ll happily pull you into the center of the party.",
    drink: "Midori Sour"
  },
  luna: {
    description:
      "A high-fashion model with an otherworldly calm. Luna drifts through a room like a soft tide, all storm-gray eyes and quiet, lingering glances. She doesn’t say much at first, but when she focuses on you, it feels like the rest of the party fades into the background.",
    drink: "Vodka soda with lime"
  },
  harper: {
    description:
      "A movie star who knows exactly how to own a room. Harper leads with smirks, sharp banter, and the kind of confidence that dares you to keep up. She loves the game of flirtation almost as much as the win — especially with someone bold enough to push back.",
    drink: "Old Fashioned"
  },
  mara: {
    description:
      "An indie actress with a soft voice and a quietly dangerous warmth. Mara watches more than she speaks, choosing her words — and the people she lets close — very carefully. Her charm sneaks up on you: one gentle question, one lingering look, and suddenly the room feels strangely intimate.",
    drink: "White wine"
  }
};

function hpOpenCharactersModal() {
  const modal = document.getElementById("charactersModal");
  const grid = document.getElementById("charactersGrid");
  if (!modal || !grid) return;

  grid.innerHTML = "";

  for (const charKey of HP_CONFIG.CHARACTERS) {
    const display = HP_CONFIG.CHARACTER_DISPLAY[charKey] || {};
    const bio = HP_CHARACTER_BIOS[charKey] || {};

    const card = document.createElement("div");
    card.className = "hp-character-card";

    // Portrait
    const imgWrap = document.createElement("div");
    imgWrap.className = "hp-character-image-wrap";
    const img = document.createElement("img");
    img.className = "hp-character-image";
    img.src = `images/${charKey}_profile.jpg`;
    img.alt = display.name || charKey;
    img.loading = "lazy";
    imgWrap.appendChild(img);

    // Text content container
    const content = document.createElement("div");
    content.className = "hp-character-content";

    const nameEl = document.createElement("div");
    nameEl.className = "hp-character-name";
    nameEl.textContent = display.name || charKey;

    const archetypeEl = document.createElement("div");
    archetypeEl.className = "hp-character-archetype";
    archetypeEl.textContent = display.archetype || "";

    const descEl = document.createElement("p");
    descEl.className = "hp-character-description";
    descEl.textContent = bio.description || "";

    const drinkEl = document.createElement("div");
    drinkEl.className = "hp-character-drink";
    if (bio.drink) {
      drinkEl.textContent = `Signature drink: ${bio.drink}`;
    }

    content.appendChild(nameEl);
    if (archetypeEl.textContent) {
      content.appendChild(archetypeEl);
    }
    content.appendChild(descEl);
    if (drinkEl.textContent) {
      content.appendChild(drinkEl);
    }

    card.appendChild(imgWrap);
    card.appendChild(content);
    grid.appendChild(card);
  }

  modal.classList.add("hp-modal-open");
  modal.setAttribute("aria-hidden", "false");
}

function hpCloseCharactersModal() {
  const modal = document.getElementById("charactersModal");
  if (!modal) return;
  modal.classList.remove("hp-modal-open");
  modal.setAttribute("aria-hidden", "true");
}

function hpWireModalEvents() {
  const modal = document.getElementById("charactersModal");
  if (!modal) return;

  modal.addEventListener("click", (evt) => {
    if (evt.target.hasAttribute("data-modal-close")) {
      hpCloseCharactersModal();
    }
  });
}
