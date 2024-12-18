import DiscworldSheetMixin from "../sheets/base-document-sheet.js";

const { ItemSheetV2 } = foundry.applications.sheets;

export default class TraitSheet extends DiscworldSheetMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: "auto",
    },
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/trait-sheet.hbs",
    },
  };
}
