// Core configuration for Hollywood Hills Party

const HP_CONFIG = {
  START_SCENE_ID: "scene_00_intro",

  STORY_FILES: [
    "main_story.json",
    "characters/intro.json",
    "characters/shared_openings.json",
    "characters/shared_endings.json",
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
  }
};
