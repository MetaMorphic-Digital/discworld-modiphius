import * as applications from "./modules/applications/_module.mjs";
import * as documents from "./modules/documents/_module.mjs";
import * as utils from "./modules/utils/_module.mjs";
import * as rolls from "./modules/rolls/_module.mjs";

import DISCWORLD from "./modules/config.mjs";

import preloadTemplates, { registerHelpers } from "./modules/utils/handlebars.mjs";
import registerKeybindings from "./modules/utils/keybindings.mjs";
import registerSettings from "./modules/utils/settings.mjs";

import CharacterDataModel from "./modules/datamodels/character-schema.mjs";
import NPCDataModel from "./modules/datamodels/npc-schema.mjs";
import PartyDataModel from "./modules/datamodels/party-schema.mjs";
import TraitDataModel from "./modules/datamodels/trait-schema.mjs";
import GroupTestMessageSchema from "./modules/datamodels/group-test-message-schema.mjs";
import BaseMessageSchema from "./modules/datamodels/base-message-schema.mjs";

// Export globals.
globalThis.discworld = {
  id: DISCWORLD.id,
  applications,
  documents,
  rolls,
  utils,
  config: DISCWORLD,
  data: {
    // TODO: Consider restructure of `datamodels/` repo to be `data/` with `actors/`, `fields/`, etc.
    CharacterDataModel,
    NPCDataModel,
    PartyDataModel,
    TraitDataModel,
  },
};

Object.defineProperty(globalThis.discworld, "sheets", {
  get() {
    foundry.utils.logCompatibilityWarning("globalThis.discworld.sheets should now be accessed under globalThis.discworld.applications.sheets.", {
      since: "2.0.0",
      until: "2.1.0",
      once: true,
    });
    return { ...this.applications.sheets, ...this.applications.sheets.actors };
  },
});

Object.defineProperty(globalThis.discworld, "collections", {
  get() {
    foundry.utils.logCompatibilityWarning("globalThis.discworld.collections should now be accessed under globalThis.discworld.documents.collections.", {
      since: "2.0.0",
      until: "2.1.0",
      once: true,
    });
    return this.documents.collections;
  },
});

/* -------------------------------------------------- */

Hooks.once("init", () => {
  // Configuration.
  CONFIG.Discworld = DISCWORLD;

  // Register Actor classes.
  CONFIG.Actor.collection = documents.collections.DiscworldActors;

  CONFIG.Actor.documentClass = documents.DiscworldActor;
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.CharacterSheet,
    { types: ["character"], makeDefault: true },
  );

  CONFIG.Actor.dataModels.npc = NPCDataModel;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.NPCSheet,
    { types: ["npc"], makeDefault: true },
  );

  CONFIG.Actor.dataModels.party = PartyDataModel;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.PartySheet,
    { types: ["party"], makeDefault: true },
  );

  // Register Item classes.
  CONFIG.Item.dataModels.trait = TraitDataModel;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    DISCWORLD.id,
    applications.sheets.TraitSheet,
    { makeDefault: true },
  );

  // Register Actor Directory.
  CONFIG.ui.actors = applications.sidebar.tabs.DiscworldActorDirectory;

  // Register Chat classes.
  CONFIG.ui.chat = applications.sidebar.tabs.DiscworldChatLog;
  CONFIG.ChatMessage.documentClass = documents.DiscworldMessage;
  CONFIG.ChatMessage.dataModels.groupTest = GroupTestMessageSchema;
  CONFIG.ChatMessage.dataModels.baseTest = BaseMessageSchema;

  // Register Dice
  for (const RollCls of Object.values(discworld.rolls)) CONFIG.Dice.rolls.push(RollCls);
  Object.assign(CONFIG.Dice, discworld.rolls);

  // Register Journal
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntry,
    DISCWORLD.id,
    applications.sheets.DiscworldJournalEntrySheet,
    { makeDefault: true },
  );

  // Run various utils.
  registerSettings();
  registerKeybindings();
  registerHelpers();
  preloadTemplates();
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  utils.preLocalize("DISCWORLD", DISCWORLD);
});
