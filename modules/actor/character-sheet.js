import DiscworldSheetMixin from "../sheets/base-document-sheet.js";

const { ActorSheetV2 } = foundry.applications.sheets;

export default class CharacterSheet extends DiscworldSheetMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: "auto",
    },
    actions: {
      editTrait: CharacterSheet.#editTrait,
    },
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/character-sheet.hbs",
    },
  };

  static #editTrait(event) {
    const item = this.actor.items.get(event.target.dataset.itemId);
    item.sheet.render(true);
  }
}
