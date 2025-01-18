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
      leaveHelpMode: CharacterSheet.#leaveHelpMode,
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

  isHelpMode = false;

  helpPromise = {};

  async _prepareContext() {
    const context = await super._prepareContext();

    context.helpMode = this.isHelpMode;

    return context;
  }

  _onRender() {
    super._onRender();

    if (this.isHelpMode) {
      this.element.classList.add("help-mode");
    } else {
      this.element.classList.remove("help-mode");
    }
  }

  async close() {
    super.close();

    this.helpPromise.reject?.();
    this.isHelpMode = false; // reset
    this.helpPromise = {}; // reset
  }

  async resolveHelpMode() {
    this.isHelpMode = true;

    // TODO: Remove this once v12 support is dropped.
    if (game.release.generation < 13) await this.render(true);
    else await this.render({ force: true });

    return new Promise((resolve) => {
      this.helpPromise.resolve = (trait) => resolve(trait);
      this.helpPromise.reject = () => resolve(false);
    });
  }

  static #leaveHelpMode() {
    this.helpPromise.reject?.();
    this.isHelpMode = false;
    this.helpPromise = {};
    this.render();
  }

  static #traitAction(event, target) {
    const { actionType, itemId, traitType } = target.dataset;
    const trait = this.actor.items.get(itemId);

    switch (actionType) {
      case "add":
        CharacterSheet.#addTrait.call(this, traitType);
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
    // eslint-disable-next-line no-undef
    const newTrait = await getDocumentClass("Item").create(
      {
        type: "trait",
        name: game.i18n.format("DOCUMENT.New", {
          type: game.i18n.localize(`DISCWORLD.trait.type.${traitType}`),
        }),
        system: { type: traitType },
      },
      { parent: this.document, renderSheet: true },
    );

    // TODO: This remaining code can be removed (see comment regarding autofocus).
    const { sheet } = newTrait;
    await sheet.render(true);

    const nameField = sheet.element.querySelector("input[name='name']");
    nameField.focus();
    nameField.select();
  }

  static async #editTrait(trait) {
    const { sheet } = trait;
    await sheet.render(true);
    // TODO: This remaining code can be removed (see comment regarding autofocus).
    const nameField = sheet.element.querySelector("input[name='name']");
    nameField.focus();
    nameField.select();
  }

  static async #deleteTrait(trait) {
    const content = game.i18n.format("DISCWORLD.sheet.character.deletePrompt", {
      traitName: trait.name,
    });

    // TODO: remove this when v12 support is dropped.
    if (game.release.generation < 13) {
      const promptResult = await Dialog.confirm({ content });
      if (!promptResult) return;
      trait.delete();
    } else {
      trait.deleteDialog({ content: `<p>${content}</p>` });
    }
  }

  static async #rollTrait(trait) {
    // A help roll will handle its own dialog/roll.
    if (this.isHelpMode) {
      this.helpPromise.resolve(trait);
      this.close();
      return;
    }

    const dialogResult = await rollTraitDialog(this.actor, trait);
    if (!dialogResult) return;

    DiscworldRoll.createBaseRoll(dialogResult, { actor: this.actor, trait });
  }
}
