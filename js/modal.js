// ------------------------------------------------------------
// Meet the Characters Modal (A1-Classic, FINAL FIXED VERSION)
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
    // Load character_profiles.json (root-level file)
    // ------------------------------------------------------------
    async function loadProfiles() {
        try {
            const response = await fetch("character_profiles.json");
            if (!response.ok) throw new Error("Failed to load character_profiles.json");

            profilesLoaded = await response.json();
            renderProfiles();
        } catch (err) {
            console.error(err);
            listContainer.innerHTML =
                `<p style="color:white;">Error loading character profiles.</p>`;
        }
    }

    // ------------------------------------------------------------
    // Render cards — USE profile.profileImage AS-IS
    // ------------------------------------------------------------
    function renderProfiles() {
        if (!profilesLoaded) return;

        listContainer.innerHTML = ""; // reset

        profilesLoaded.forEach(profile => {
            // DO NOT prefix with "images/"
            // JSON already contains "images/<x>.jpg"
            const imgSrc = profile.profileImage || "images/placeholder.jpg";

            const card = document.createElement("div");
            card.className = "characterCard";

            card.innerHTML = `
                <div class="characterCardImageWrapper">
                    <img class="characterCardImage" src="${imgSrc}" alt="${profile.name}">
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
    // Open / Close Modal
    // ------------------------------------------------------------
    openBtn.addEventListener("click", () => {
        modal.setAttribute("aria-hidden", "false");
        if (!profilesLoaded) loadProfiles();
        else renderProfiles();
    });

    closeBtn.addEventListener("click", () => {
        modal.setAttribute("aria-hidden", "true");
    });

    modal.addEventListener("click", e => {
        if (e.target === modal) {
            modal.setAttribute("aria-hidden", "true");
        }
    });
});
