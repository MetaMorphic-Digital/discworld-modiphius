import DiscworldSheetMixin from "./base-document-sheet.js";

const { ActorSheetV2 } = foundry.applications.sheets;

export default class CharacterSheet extends DiscworldSheetMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: "auto",
    },
    actions: {
      editTrait: CharacterSheet.#editTrait,
      rollTrait: CharacterSheet.#rollTrait,
    },
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/character-sheet.hbs",
    },
  };

  static #editTrait(event) {
    const trait = this.actor.items.get(event.target.dataset.itemId);
    trait.sheet.render(true);
  }

  static async #rollTrait(event) {
    const trait = this.actor.items.get(event.target.dataset.itemId);

    const { DialogV2 } = foundry.applications.api;
    const content = await renderTemplate(
      "systems/discworld/templates/roll-trait-prompt.hbs",
      {
        trait,
        actor: this.actor,
      },
    );
    const dialogResult = await DialogV2.wait({
      classes: ["discworld"],
      position: { width: "auto", height: "auto" },
      window: { title: "Rolling a Trait!" },
      content,
      buttons: [
        { label: "<img src='icons/dice/d4black.svg' /> d4", action: "d4" },
        { label: "<i class='fas fa-xl fa-dice-d6'></i> d6", action: "d6" },
        // { label: "<img src='icons/dice/d8black.svg' /> d10d8", action: "d8" },
        { label: "<img src='icons/dice/d10black.svg' /> d10", action: "d10" },
        { label: "<img src='icons/dice/d12black.svg' /> d12", action: "d12" },
      ],
      rejectClose: false,
    });

    if (!dialogResult) return;

    const roll = await new Roll(dialogResult).evaluate();
    roll.toMessage({ flavor: trait.name });
  }
}
