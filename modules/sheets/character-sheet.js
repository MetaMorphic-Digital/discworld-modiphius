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
      position: { width: 400, height: "auto" },
      window: { title: "Rolling a Trait!" },
      content,
      buttons: [
        {
          class: ["d4"],
          label: "d4",
          action: "d4",
        },
        {
          class: ["d6"],
          label: "d6",
          action: "d6",
        },
        {
          class: ["d10"],
          label: "d10",
          action: "d10",
        },
        {
          class: ["d12"],
          label: "d12",
          action: "d12",
        },
      ],
      rejectClose: false,
    });

    if (!dialogResult) return;

    const roll = await new Roll(dialogResult).evaluate();

    const messageData = {
      result: roll.result,
      term: dialogResult,
      actor: this.actor,
      trait,
    };
    const messageTemplate = await renderTemplate(
      "systems/discworld/templates/roll-card.hbs",
      messageData,
    );
    await roll.toMessage({ content: messageTemplate, flavor: "Trait Roll" });
  }
}
