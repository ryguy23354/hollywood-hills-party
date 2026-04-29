// js/config.js
// Core configuration (global, idempotent)

(function () {
  if (window.HP_CONFIG) {
    return; // prevent double-load
  }

  window.HP_CONFIG = {
    START_SCENE_ID: "scene_00_intro",

    STORY_FILES: [
      "main_story.json",
      "characters_intro.json",
      "shared_openings.json",
      "shared_endings.json",
      "characters/sienna/narrative.json",
      "characters/riley/narrative.json",
      "characters/luna/narrative.json",
      "characters/harper/narrative.json",
      "characters/mara/narrative.json"
    ],

    LOCATIONS: ["bar", "pool", "lounge", "balcony", "gameloft"],

    CHARACTERS: ["sienna", "riley", "luna", "harper", "mara"],

    CHARACTER_DISPLAY: {
      sienna: { name: "Sienna Brooks", archetype: "Fiery Heartthrob" },
      riley:  { name: "Riley Storm",   archetype: "Playful Firecracker" },
      luna:   { name: "Luna Devreaux", archetype: "Ethereal Muse" },
      harper: { name: "Harper Vale",   archetype: "Teasing Siren" },
      mara:   { name: "Mara Quinn",    archetype: "Gentle Enchantress" }
    },

    LOCATION_DISPLAY: {
      bar: "Bar",
      pool: "Pool",
      lounge: "Lounge",
      balcony: "Balcony",
      gameloft: "Game Loft"
    },

    LOCATION_DEFAULT_IMAGES: {
      bar: "bar.jpg",
      pool: "pool.jpg",
      lounge: "lounge.jpg",
      balcony: "balcony.jpg",
      gameloft: "gameloft.jpg"
    },

    GLOBAL_FALLBACK_IMAGE: "scene_00_intro.jpg",

    ROMANCE_FILES: {
      sienna: "characters/sienna/romance.json",
      riley:  "characters/riley/romance.json",
      luna:   "characters/luna/romance.json",
      harper: "characters/harper/romance.json",
      mara:   "characters/mara/romance.json"
    }
  };
})();
