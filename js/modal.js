// ------------------------------------------------------------
// Meet the Characters Modal (A1-Classic)
// Clean version using ONLY character_profiles.json.image
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("charactersModal");
    const openBtn = document.getElementById("openCharactersModal");
    const closeBtn = document.getElementById("closeCharactersModal");
    const listContainer = document.getElementById("charactersList");

    if (!modal || !openBtn || !closeBtn || !listContainer) {
        console.warn("Modal elements missing from DOM.");
        return;
    }

    let profilesLoaded = null;

    // ------------------------------------------------------------
    // Load character_profiles.json
    // ------------------------------------------------------------
    async function loadProfiles() {
        try {
            const response = await fetch("character_profiles.json");
            if (!response.ok) throw new Error("Failed to load character_profiles.json");

            const data = await response.json();
            profilesLoaded = data;
            renderProfiles();
        } catch (err) {
            console.error(err);
            listContainer.innerHTML = `<p style="color:white;">Error loading character profiles.</p>`;
        }
    }

    // ------------------------------------------------------------
    // Render profile cards
    // ------------------------------------------------------------
    function renderProfiles() {
        if (!profilesLoaded) return;

        listContainer.innerHTML = ""; // Clear previous content

        profilesLoaded.forEach(profile => {
            // Use EXACTLY /images/<character>_profile.jpg with no extra prefixes
            const imgSrc = profile.image
                ? `images/${profile.image}`     // ← correct folder path
                : `images/placeholder.jpg`;     // ← only used if actually missing

            const card = document.createElement("div");
            card.className = "characterCard";

            card.innerHTML = `
                <div class="characterCardImageWrapper">
                    <img class="characterCardImage" 
                         src="${imgSrc}" 
                         alt="${profile.name}">
                </div>

                <div class="characterCardContent">
                    <h3>${profile.name}</h3>
                    <p>${profile.description}</p>
                </div>
            `;

            listContainer.appendChild(card);
        });
    }

    // ------------------------------------------------------------
    // Modal open / close controls
    // ------------------------------------------------------------
    openBtn.addEventListener("click", () => {
        modal.setAttribute("aria-hidden", "false");
        if (!profilesLoaded) loadProfiles();
        else renderProfiles();
    });

    closeBtn.addEventListener("click", () => {
        modal.setAttribute("aria-hidden", "true");
    });

    // Close when clicking the background overlay
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.setAttribute("aria-hidden", "true");
        }
    });
});
