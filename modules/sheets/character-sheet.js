import DiscworldRoll from "../rolls/rolls.js";
import DiscworldSheetMixin from "./base-document-sheet.js";
import rollTraitDialog from "../dialog/roll-trait-dialog.js";

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

  static async #editTrait(trait) {
    const { sheet } = trait;
    await sheet.render(true);
    const nameField = sheet.element.querySelector("input[name='name']");
    nameField.focus();
    nameField.select();
  }

  static async #deleteTrait(trait) {
    const promptResult = await Dialog.confirm({
      content: `Are you sure you want to delete the trait, "${trait.name}"?`,
    });
    if (!promptResult) return;
    trait.delete();
  }

  static async #rollTrait(trait) {
    const dialogResult = await rollTraitDialog(this.actor, trait);
    if (!dialogResult) return;

    DiscworldRoll.createBaseRoll(dialogResult, { actor: this.actor, trait });
  }
}
