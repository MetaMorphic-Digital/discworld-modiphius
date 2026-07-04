import DISCWORLD from "./modules/config.mjs";

import * as utils from "./modules/utils/_module.mjs";
import preloadTemplates, { registerHelpers } from "./modules/utils/handlebars.mjs";
import registerKeybindings from "./modules/utils/keybindings.mjs";

import CharacterDataModel from "./modules/datamodels/character-schema.mjs";
import TraitDataModel from "./modules/datamodels/trait-schema.mjs";

import DiscworldChatLog from "./modules/chat/chat.mjs";
import DiscworldMessage from "./modules/chat/chat-message.mjs";

import * as Rolls from "./modules/rolls/index.mjs";

import DiscworldCharacter from "./modules/documents/character.mjs";

import TraitSheet from "./modules/applications/sheets/trait-sheet.mjs";
import DiscworldJournalEntrySheet from "./modules/applications/sheets/journal-entry-sheet.mjs";

import DiscworldActorSheet from "./modules/applications/sheets/actors/base-actor-sheet.mjs";
import CharacterSheet from "./modules/applications/sheets/actors/character-sheet.mjs";

// Export globals.
globalThis.discworld = {
  utils,
  config: DISCWORLD,
  sheets: {
    DiscworldActorSheet,
    CharacterSheet,
    TraitSheet,
  },
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
  utils.preLocalize("DISCWORLD", DISCWORLD);
});
