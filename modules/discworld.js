import CharacterSheet from "./actor/character-sheet.js";
import Character from "./actor/character.js";
import CharacterDataModel from "./datamodels/character-schema.js";
import TraitDataModel from "./datamodels/trait-schema.js";
import TraitSheet from "./item/trait-sheet.js";
import registerHelpers from "./utils/handlebars-helpers.js";

Hooks.on("init", () => {
  // Register Actor classes.
  CONFIG.Actor.documentClass = Character;
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  Actors.registerSheet("discworld", CharacterSheet, {
    makeDefault: true,
  });

  // Register Item classes.
  CONFIG.Item.dataModels.trait = TraitDataModel;
  Items.registerSheet("discworld", TraitSheet, {
    makeDefault: true,
  });

  // Run various utils.
  registerHelpers();
});
