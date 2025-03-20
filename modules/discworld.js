import CharacterSheet from "./sheets/character-sheet.js";
import CharacterDataModel from "./datamodels/character-schema.js";
import DiscworldChatLog from "./chat/chat.js";
import TraitDataModel from "./datamodels/trait-schema.js";
import TraitSheet from "./sheets/trait-sheet.js";
import preloadTemplates, { registerHelpers } from "./utils/handlebars.js";
import registerKeybindings from "./utils/keybindings.js";
import * as Rolls from "./rolls/index.js";
import DISCWORLD from "./config.js";
import DiscworldMessage from "./chat/chat-message.js";
import DiscworldCharacter from "./documents/character.js";
import transitionClass from "./utils/animations.js";

// Export globals.
globalThis.discworld = {
  config: DISCWORLD,
  utils: {
    transitionClass,
  },
};

Hooks.once("init", () => {
  const { Actors, Items } = foundry.documents.collections;

  // Configuration.
  CONFIG.Discworld = DISCWORLD;

  // Register Actor classes.
  CONFIG.Actor.documentClass = DiscworldCharacter;
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  Actors.registerSheet("discworld", CharacterSheet, {
    makeDefault: true,
  });

  // Register Item classes.
  CONFIG.Item.dataModels.trait = TraitDataModel;
  Items.registerSheet("discworld", TraitSheet, {
    makeDefault: true,
  });

  // Register Chat classes.
  CONFIG.ui.chat = DiscworldChatLog;
  CONFIG.ChatMessage.documentClass = DiscworldMessage;

  // Register Dice
  for (const Roll of Object.values(Rolls)) CONFIG.Dice.rolls.push(Roll);
  Object.assign(CONFIG.Dice, Rolls);

  // Run various utils.
  registerKeybindings();
  registerHelpers();
  preloadTemplates();
});

Hooks.once("i18nInit", () => {
  // Localize all strings in the system configuration object.
  const localize = (o, k, v) => {
    const type = foundry.utils.getType(v);
    if (type === "string" && v.startsWith("DISCWORLD")) {
      // eslint-disable-next-line no-param-reassign
      o[k] = game.i18n.localize(v);
    } else if (type === "Object") {
      for (const [x, y] of Object.entries(v)) {
        localize(v, x, y);
      }
    } else if (type === "Array") {
      for (const obj of v)
        if (foundry.utils.getType(obj) === "Object") {
          for (const [u, w] of Object.entries(obj)) {
            localize(obj, u, w);
          }
        }
    }
  };

  for (const [k, v] of Object.entries(DISCWORLD)) {
    localize(DISCWORLD, k, v);
  }
});
