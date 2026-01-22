import CharacterSheet from "./modules/sheets/character-sheet.mjs";
import CharacterDataModel from "./modules/datamodels/character-schema.mjs";
import DiscworldChatLog from "./modules/chat/chat.mjs";
import TraitDataModel from "./modules/datamodels/trait-schema.mjs";
import TraitSheet from "./modules/sheets/trait-sheet.mjs";
import preloadTemplates, { registerHelpers } from "./modules/utils/handlebars.mjs";
import registerKeybindings from "./modules/utils/keybindings.mjs";
import * as Rolls from "./modules/rolls/index.mjs";
import DISCWORLD from "./modules/config.mjs";
import DiscworldMessage from "./modules/chat/chat-message.mjs";
import DiscworldCharacter from "./modules/documents/character.mjs";
import DiscworldJournalEntrySheet from "./modules/sheets/journal-entry-sheet.mjs";
import * as utils from "./modules/utils/_module.mjs";

// Export globals.
globalThis.discworld = {
  utils,
  config: DISCWORLD,
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  const { Actors, Items, Journal } = foundry.documents.collections;

  // Configuration.
  CONFIG.Discworld = DISCWORLD;

  // Register Actor classes.
  CONFIG.Actor.documentClass = DiscworldCharacter;
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  Actors.registerSheet(DISCWORLD.id, CharacterSheet, {
    makeDefault: true,
  });

  // Register Item classes.
  CONFIG.Item.dataModels.trait = TraitDataModel;
  Items.registerSheet(DISCWORLD.id, TraitSheet, {
    makeDefault: true,
  });

  // Register Chat classes.
  CONFIG.ui.chat = DiscworldChatLog;
  CONFIG.ChatMessage.documentClass = DiscworldMessage;

  // Register Dice
  for (const Roll of Object.values(Rolls)) CONFIG.Dice.rolls.push(Roll);
  Object.assign(CONFIG.Dice, Rolls);

  // Register Journal
  Journal.registerSheet(DISCWORLD.id, DiscworldJournalEntrySheet, {
    makeDefault: true,
  });

  // Run various utils.
  registerKeybindings();
  registerHelpers();
  preloadTemplates();
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  // Localize all strings in the system configuration object.
  const localize = (o, k, v) => {
    const type = foundry.utils.getType(v);
    if ((type === "string") && v.startsWith("DISCWORLD")) {

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
