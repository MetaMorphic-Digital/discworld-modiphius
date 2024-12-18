import DiscworldSheetMixin from "../sheets/base-document-sheet.js";

const { ActorSheetV2 } = foundry.applications.sheets;

export default class CharacterSheet extends DiscworldSheetMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: "auto",
    },
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/character-sheet.hbs",
    },
  };
}
