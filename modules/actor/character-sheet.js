import DiscworldActorSheet from "../sheets/base-actor-sheet.js";

class CharacterSheet extends DiscworldActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["discworld"],
    position: {
      width: 600,
      height: 800,
    },
    window: { resizable: true },
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/character-sheet.hbs",
    },
  };

  _prepareContext(options) {
    const context = super._prepareContext(options);
    return {
      ...context,
      actor: this.actor,
    };
  }
}

export default CharacterSheet;
