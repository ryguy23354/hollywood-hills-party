// modal.js — A1 Classic (Clean Personality-Only Version)

let modalOpen = false;
let characterData = null;

async function loadCharacterData() {
    try {
        const response = await fetch("character_profiles.json");
        if (!response.ok) {
            throw new Error("Failed to load character profiles");
        }
        characterData = await response.json();
        return characterData;
    } catch (e) {
        console.error("Error loading character profiles:", e);
        throw e;
    }
}

function openCharactersModal() {
    if (modalOpen) return;

    const modal = document.getElementById("charactersModal");
    const modalContent = document.getElementById("charactersModalContent");

    modal.classList.add("open");
    modalOpen = true;

    // Lock body scroll
    document.body.style.overflow = "hidden";

    if (!characterData) {
        modalContent.innerHTML = `
            <div class="hp-modal-error">Error loading character profiles.</div>
        `;
        return;
    }

    modalContent.innerHTML = `
        <h2 class="hp-modal-title">Meet the Characters</h2>
        <div class="characters-grid">
            ${characterData.characters.map(profile => `
                <div class="character-card">
                    <img 
                        class="character-card-image" 
                        src="images/${profile.profileImage}" 
                        alt="${profile.name}"
                    >
                    <h3 class="character-card-name">${profile.name}</h3>
                    <p class="character-card-description">${profile.description}</p>
                </div>
            `).join("")}
        </div>
    `;
}

function closeCharactersModal() {
    if (!modalOpen) return;

    const modal = document.getElementById("charactersModal");
    modal.classList.remove("open");
    modalOpen = false;

    // Restore scroll
    document.body.style.overflow = "";
}

// Ensure close button works
document.addEventListener("DOMContentLoaded", () => {
    const closeButton = document.getElementById("charactersModalClose");
    if (closeButton) {
        closeButton.addEventListener("click", closeCharactersModal);
    }
});

// Load profiles on page load so the modal opens instantly
loadCharacterData();
