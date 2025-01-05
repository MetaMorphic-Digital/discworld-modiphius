import DiscworldRoll from "../rolls/rolls.js";
import DiscworldSheetMixin from "./base-document-sheet.js";

const { ActorSheetV2 } = foundry.applications.sheets;

export default class CharacterSheet extends DiscworldSheetMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 500,
      height: 700,
    },
    actions: {
      traitAction: CharacterSheet.#traitAction,
    },
  };

  static PARTS = {
    header: {
      template: "systems/discworld/templates/character-sheet/header.hbs",
    },
    main: {
      template: "systems/discworld/templates/character-sheet/main.hbs",
    },
    footer: {
      template: "systems/discworld/templates/character-sheet/footer.hbs",
    },
  };

  static #traitAction(event, target) {
    const { actionType, itemId } = target.dataset;
    const trait = this.actor.items.get(itemId);

    switch (actionType) {
      case "add":
        {
          const { traitType } = target.dataset;
          CharacterSheet.#addTrait.call(this, traitType);
        }
        break;

      case "edit":
        CharacterSheet.#editTrait.call(this, trait);
        break;

      case "delete":
        CharacterSheet.#deleteTrait.call(this, trait);
        break;

      default:
        CharacterSheet.#rollTrait.call(this, trait);
        break;
    }
  }

  static async #addTrait(traitType) {
    const localizedTrait = game.i18n.localize(
      `DISCWORLD.trait.type.${traitType}`,
    );
    const name = `New ${localizedTrait}`;
    const [newTrait] = await this.actor.createEmbeddedDocuments("Item", [
      {
        type: "trait",
        name,
        system: { type: traitType },
      },
    ]);

    const { sheet } = newTrait;
    await sheet.render(true);

    const nameField = sheet.element.querySelector("input[name='name']");
    nameField.focus();
    nameField.select();
  }

  static #editTrait(trait) {
    trait.sheet.render(true);
  }

  static async #deleteTrait(trait) {
    const promptResult = await Dialog.confirm({
      content: `Are you sure you want to delete the trait, "${trait.name}"?`,
    });
    if (!promptResult) return;
    trait.delete();
  }

  static async #rollTrait(trait) {
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

    DiscworldRoll.createBaseRoll(dialogResult, { actor: this.actor, trait });
  }
}
