import CharacterDataModel from "./datamodels/character-schema.js";
import TraitDataModel from "./datamodels/trait-schema.js";

Hooks.on("init", () => {
  // Register Actor data models.
  CONFIG.Actor.dataModels.character = CharacterDataModel;

  // Register Item data models.
  CONFIG.Item.dataModels.trait = TraitDataModel;
});
