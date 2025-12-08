// Meet the Characters modal

function hpOpenCharactersModal() {
  const modal = document.getElementById("charactersModal");
  const grid = document.getElementById("charactersGrid");
  if (!modal || !grid) return;

  grid.innerHTML = "";

  for (const charKey of HP_CONFIG.CHARACTERS) {
    const display = HP_CONFIG.CHARACTER_DISPLAY[charKey];
    const card = document.createElement("div");
    card.className = "hp-character-card";

    const nameEl = document.createElement("div");
    nameEl.className = "hp-character-name";
    nameEl.textContent = display?.name || charKey;

    const archEl = document.createElement("div");
    archEl.className = "hp-character-archetype";
    archEl.textContent = display?.archetype || "";

    const tonightEl = document.createElement("div");
    tonightEl.className = "hp-character-locations";

    const locs = hpGetLocationsForCharacter(charKey);
    if (locs.length) {
      const pretty = locs.map((l) => HP_CONFIG.LOCATION_DISPLAY[l] || l);
      tonightEl.textContent = "Tonight: " + pretty.join(" • ");
    } else {
      tonightEl.textContent = "Tonight: Not currently at the party";
    }

    card.appendChild(nameEl);
    card.appendChild(archEl);
    card.appendChild(tonightEl);
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
