// --- Meet the Characters Modal (A1-Classic, corrected image logic) ---

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("charactersModal");
  const openBtn = document.getElementById("openCharactersModal");
  const closeBtn = document.getElementById("closeCharactersModal");
  const container = document.getElementById("charactersList");

  if (!modal || !openBtn || !closeBtn || !container) return;

  // ------------------------------
  // Load character profiles JSON
  // ------------------------------
  async function loadProfiles() {
    try {
      const res = await fetch("character_profiles.json");
      if (!res.ok) throw new Error("Failed to load character profiles");

      const profiles = await res.json();
      renderProfiles(profiles);
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p style="color:white; padding:20px;">Error loading character profiles.</p>`;
    }
  }

  // ------------------------------------------------------
  // Render profile cards (fixed image handling)
  // ------------------------------------------------------
  function renderProfiles(profiles) {
    container.innerHTML = "";

    profiles.forEach(profile => {
      // Always respect the official key: profile.image
      const imgFile = profile.image ? `images/${profile.image}` : "images/placeholder.jpg";

      const card = document.createElement("div");
      card.className = "characterCard";

      card.innerHTML = `
        <div class="characterCardImageWrapper">
          <img class="characterCardImage" src="${imgFile}" alt="${profile.name}">
        </div>

        <div class="characterCardContent">
          <h3>${profile.name}</h3>
          <p>${profile.description}</p>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // ------------------------------
  // Modal Open/Close
  // ------------------------------
  openBtn.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "false");
    loadProfiles();
  });

  closeBtn.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
  });

  // Close on background click
  modal.addEventListener("click", e => {
    if (e.target === modal) {
      modal.setAttribute("aria-hidden", "true");
    }
  });
});
