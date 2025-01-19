import DiscworldRoll from "../rolls/rolls.js";
import DiscworldSheetMixin from "./base-document-sheet.js";
import DISCWORLD from "../config.js";

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * @extends ActorSheetV2
 */
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

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext();

    context.helpMode = this.isHelpMode;

    // Construct arrays of traits, filtered by category.
    context.traitGroups = {};
    for (const traitType of Object.keys(DISCWORLD.traitTypes)) {
      context.traitGroups[traitType] = this.actor.items.filter(
        (item) => item.system.type === traitType,
      );
    }

    // Translation of trait types.
    context.traitTypeTranslationMap = DISCWORLD.traitTypes;

    return context;
  }

  /** @override */
  _onRender() {
    super._onRender();

    if (this.isHelpMode) {
      this.element.classList.add("help-mode");
    } else {
      this.element.classList.remove("help-mode");
    }

    // Select luck input fields on focus.
    this.element
      .querySelectorAll(".luck-container input")
      .forEach((input) =>
        input.addEventListener("focus", (event) => event.target.select()),
      );
  }

  /** @override */
  async close() {
    await super.close();

    this.resetHelpMode();
  }

  /**
   * Enable help mode and render the character sheet, which awaits a trait roll.
   *
   * @param {Object} [options]
   * @param {boolean} [options.close] - Whether the character sheet is currently
   *                                      rendered.
   * @returns {Promise<Item|null>} A promise that resolves to the selected trait,
   *                               or null if help mode is cancelled.
   */
  async resolveHelpMode({ close = true } = {}) {
    this.isHelpMode = true;

    await this.render({ force: true });

    return new Promise((resolve) => {
      this.helpPromise.resolve = (trait) => {
        resolve(trait);
        // Close the sheet if it wasn't already opened.
        if (close) this.close();
      };
      this.helpPromise.reject = () => resolve(null);
    });
  }

  /**
   * Leave help mode and re-render the character sheet.
   */
  static #leaveHelpMode() {
    this.resetHelpMode();
    this.render();
  }

  /**
   * Resets the help mode flag and rejects any pending help promises.
   *
   * This is called when the character sheet is closed, or when the help mode
   * flag is explicitly toggled off.
   *
   * @returns {void}
   */
  resetHelpMode() {
    this.helpPromise.reject?.();
    this.isHelpMode = false;
    this.helpPromise = {};
  }

  /**
   * Handle clicks on trait actions (add, edit, delete, roll).
   *
   * @param {Event} event - The originating click event.
   * @param {HTMLElement} target - The target element of the event.
   * @returns {void}
   */
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

  /**
   * Add a new trait of the given type to the character.
   *
   * @param {string} traitType - The type of trait to add. Must be one of the
   *                             {@link DISCWORLD.traitTypes} constants.
   * @returns {Promise<void>}
   */
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

    newTrait.sheet.render({ force: true, autofocus: true });
  }

  /**
   * Opens the Trait sheet for editing with autofocus enabled on the name field.
   *
   * @param {Item} trait - The trait item to be edited.
   * @returns {Promise<void>}
   */
  static async #editTrait(trait) {
    trait.sheet.render({ force: true, autofocus: true });
  }

  /**
   * Prompts the user for confirmation before deleting a Trait.
   *
   * @param {Item} trait - The trait item to be deleted.
   * @returns {Promise<void>}
   */
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

  /**
   * Handles the logic for rolling a trait from the character sheet.
   * If help mode is enabled, the trait is passed to the help promise.
   * Otherwise, a dialog is shown asking the user to select a die to roll.
   *
   * @param {Item} trait - The trait to be rolled.
   * @returns {Promise<void>}
   */
  static async #rollTrait(trait) {
    // A help roll will handle its own dialog/roll.
    if (this.isHelpMode) {
      this.helpPromise.resolve(trait);
      return;
    }

    const dialogResult = await this.rollTraitDialog(trait);
    if (!dialogResult) return;

    DiscworldRoll.createBaseRoll(dialogResult, { actor: this.actor, trait });
  }

  /**
   * Displays a dialog to prompt the user to select a die to roll.
   *
   * @param {Item} trait - The trait to be rolled.
   * @returns {Promise<string|null>} - A promise that resolves to the selected die, or null if the dialog is cancelled.
   */
  async rollTraitDialog(trait) {
    const { DialogV2 } = foundry.applications.api;
    const content = await renderTemplate(
      "systems/discworld/templates/roll-trait-prompt.hbs",
      { trait, actor: this.actor },
    );

    const playerDice = ["d4", "d6", "d10", "d12"];
    const buttons = playerDice.map((die) => {
      return { class: [die], label: die, action: die, default: die === "d6" };
    });

    return DialogV2.wait({
      classes: ["discworld"],
      position: { width: 400, height: "auto" },
      window: { title: "DISCWORLD.dialog.rollTrait.title" },
      content,
      buttons,
      rejectClose: false, // TODO: Redundant with v13.
    });
  }
}
