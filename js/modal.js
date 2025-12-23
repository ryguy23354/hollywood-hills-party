// js/modal.js
// Meet the Characters modal – simple, self-contained, no image resolver.

  const MODAL_ID = "charactersModal";
  const LIST_ID = "charactersList";
  const TRIGGER_ID = "openCharactersModalBtn";
  const CLOSE_ID = "closeCharactersModalBtn";
  const PROFILES_URL = "character_profiles.json";

  let profilesCache = null;
  let isOpen = false;

  function getModalElements() {
    return {
      modal: document.getElementById(MODAL_ID),
      list: document.getElementById(LIST_ID),
      trigger: document.getElementById(TRIGGER_ID),
      closeBtn: document.getElementById(CLOSE_ID),
    };
  }

  async function loadProfiles() {
    if (profilesCache) return profilesCache;

    const res = await fetch(PROFILES_URL);
    if (!res.ok) {
      throw new Error(`Failed to load ${PROFILES_URL} (${res.status})`);
    }
    const data = await res.json();
    profilesCache = data;
    return data;
  }

  function createCharacterCard(profile) {
    const card = document.createElement("article");
    card.className = "character-card";

    // ----- image block -----
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "character-card-image";

    const img = document.createElement("img");
    // *** Direct, hard-coded path – no resolver, no placeholder ***
    const charKey = profile.id || (profile.name || "").toLowerCase().split(" ")[0];
    const imagePath =
      profile.profileImage || `images/${charKey}_profile.jpg`;

    img.src = imagePath;
    img.alt = profile.name || "Character portrait";
    img.loading = "lazy";

    imageWrapper.appendChild(img);

    // ----- text block -----
    const text = document.createElement("div");
    text.className = "character-card-text";

    const name = document.createElement("h3");
    name.className = "character-name";
    name.textContent = profile.name || "Unknown";

    const tagline = document.createElement("p");
    tagline.className = "character-tagline";
    tagline.textContent = profile.tagline || "";

    const description = document.createElement("p");
    description.className = "character-description";
    description.textContent = profile.description || "";

    text.appendChild(name);
    text.appendChild(tagline);
    text.appendChild(description);

    card.appendChild(imageWrapper);
    card.appendChild(text);

    return card;
  }

  function renderProfiles(listEl, profiles) {
    listEl.innerHTML = "";
    profiles.forEach((p) => {
      const card = createCharacterCard(p);
      listEl.appendChild(card);
    });
  }

  async function openModalInternal() {
    const { modal, list } = getModalElements();
    if (!modal || !list) return;

    try {
      const profiles = await loadProfiles();
      renderProfiles(list, profiles);
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("hp-modal--open");
      document.body.classList.add("hp-modal-open");
      isOpen = true;
    } catch (err) {
      console.error(err);
      list.innerHTML =
        '<p class="modal-error">Error loading character profiles.</p>';
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("hp-modal--open");
      document.body.classList.add("hp-modal-open");
      isOpen = true;
    }
  }

  function closeModalInternal() {
    const { modal } = getModalElements();
    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("hp-modal--open");
    document.body.classList.remove("hp-modal-open");
    isOpen = false;
  }

  // Expose global hooks used by the HTML
  window.hpOpenCharactersModal = function () {
    if (!isOpen) {
      openModalInternal();
    }
  };

  window.hpCloseCharactersModal = function () {
    if (isOpen) {
      closeModalInternal();
    }
  };

  window.showCharacterProfiles = window.hpOpenCharactersModal;
  window.closeCharacterProfiles = window.hpCloseCharactersModal;


  // Wire up click / ESC close
  function wireModalEvents() {
	  const { trigger, closeBtn, modal } = getModalElements();

	  if (trigger) {
		trigger.addEventListener("click", (e) => {
		  e.preventDefault();
		  window.hpOpenCharactersModal();
		});
	  }

	  if (closeBtn) {
		closeBtn.addEventListener("click", (e) => {
		  e.preventDefault();
		  window.hpCloseCharactersModal();
		});
	  }

	  if (modal) {
		modal.addEventListener("click", (e) => {
		  if (e.target === modal) {
			window.hpCloseCharactersModal();
		  }
		});
	  }

	  document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && isOpen) {
		  window.hpCloseCharactersModal();
		}
	  });
	}

	// run immediately — safe with defer
	wireModalEvents();
