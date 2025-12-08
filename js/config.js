// Global configuration

const HP_CONFIG = {
  START_SCENE_ID: "scene_00_intro",

  STORY_FILES: [
    "characters/shared_openings.json",
    "characters/shared_endings.json",
    "characters/sienna/narrative.json",
    "characters/riley/narrative.json",
    "characters/luna/narrative.json",
    "characters/harper/narrative.json",
    "characters/mara/narrative.json",
    "characters/intro.json",
    "main_story.json"
  ],

  CHARACTERS: ["sienna", "riley", "luna", "harper", "mara"],

  LOCATIONS: ["bar", "pool", "lounge", "balcony", "gameloft"],

  CHARACTER_DISPLAY: {
    sienna: { name: "Sienna Brooks", archetype: "Fiery Heartthrob" },
    riley:  { name: "Riley Storm",  archetype: "Playful Firecracker" },
    luna:   { name: "Luna Devreaux", archetype: "Ethereal Muse" },
    harper: { name: "Harper Vale",  archetype: "Teasing Siren" },
    mara:   { name: "Mara Quinn",   archetype: "Gentle Enchantress" }
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

  GLOBAL_FALLBACK_IMAGE: "default.jpg"
};
