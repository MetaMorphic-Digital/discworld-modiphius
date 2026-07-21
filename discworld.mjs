import * as applications from "./modules/applications/_module.mjs";
import * as documents from "./modules/documents/_module.mjs";
import * as utils from "./modules/utils/_module.mjs";
import * as rolls from "./modules/rolls/_module.mjs";
import * as data from "./modules/data/_module.mjs";

import DISCWORLD from "./modules/config.mjs";

import preloadTemplates, { registerHelpers } from "./modules/utils/handlebars.mjs";
import registerKeybindings from "./modules/utils/keybindings.mjs";
import registerSettings from "./modules/utils/settings.mjs";

// Export globals.
globalThis.discworld = {
  id: DISCWORLD.id,
  applications,
  data: { ...data },
  documents,
  rolls,
  utils,
  config: DISCWORLD,
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

Object.defineProperties(globalThis.discworld.data, {
  CharacterDataModel: {
    get() {
      foundry.utils.logCompatibilityWarning("globalThis.discworld.data.CharacterDataModel should now be accessed under globalTHis.discworld.data.actors.CharacterData.", {
        since: "2.0.0",
        until: "2.1.0",
        once: true,
      });
      return discworld.data.actors.CharacterData;
    },
  },
  NPCDataModel: {
    get() {
      foundry.utils.logCompatibilityWarning("globalThis.discworld.data.NPCDataModel should now be accessed under globalTHis.discworld.data.actors.NPCData.", {
        since: "2.0.0",
        until: "2.1.0",
        once: true,
      });
      return discworld.data.actors.NPCData;
    },
  },
  PartyDataModel: {
    get() {
      foundry.utils.logCompatibilityWarning("globalThis.discworld.data.PartyDataModel should now be accessed under globalTHis.discworld.data.actors.PartyData.", {
        since: "2.0.0",
        until: "2.1.0",
        once: true,
      });
      return discworld.data.actors.PartyData;
    },
  },
  TraitDataModel: {
    get() {
      foundry.utils.logCompatibilityWarning("globalThis.discworld.data.TraitDataModel should now be accessed under globalTHis.discworld.data.items.TraitData.", {
        since: "2.0.0",
        until: "2.1.0",
        once: true,
      });
      return discworld.data.items.TraitData;
    },
  },
});

/* -------------------------------------------------- */

Hooks.once("init", () => {
  // Configuration.
  CONFIG.Discworld = DISCWORLD;

  // Register Actor classes.
  CONFIG.Actor.collection = documents.collections.DiscworldActors;

  CONFIG.Actor.documentClass = documents.DiscworldActor;
  CONFIG.Actor.dataModels.character = data.actors.CharacterData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.CharacterSheet,
    { types: ["character"], makeDefault: true },
  );

  CONFIG.Actor.dataModels.npc = data.actors.NPCData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.NPCSheet,
    { types: ["npc"], makeDefault: true },
  );

  CONFIG.Actor.dataModels.party = data.actors.PartyData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    DISCWORLD.id,
    applications.sheets.actors.PartySheet,
    { types: ["party"], makeDefault: true },
  );

  // Register Item classes.
  CONFIG.Item.dataModels.trait = data.items.TraitData;
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
  CONFIG.ChatMessage.dataModels.groupTest = data.messages.GroupTestData;
  CONFIG.ChatMessage.dataModels.baseTest = data.messages.BaseMessageData;

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
