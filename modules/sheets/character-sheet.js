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

  /**
   * Helper to check if the actor is currently in help mode.
   *
   * @type {boolean}
   * @readonly
   */
  get isHelpMode() {
    return this.actor.helpMode.enabled;
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext();

    context.helpMode = this.isHelpMode;

    const { document } = this;
    const { system } = document;

    // Prepare input fields.
    context.fields = {
      name: {
        field: document.schema.getField("name"),
        placeholder: game.i18n.localize("Name"), // TODO: remove once v12 support is dropped
        value: this.isEditMode ? document._source.name : document.name,
      },
      description: {
        field: system.schema.getField("description"),
        value: this.isEditMode
          ? system._source.description
          : system.description,
      },
      luckMax: {
        field: system.schema.getField("luck").getField("max"),
        value: this.isEditMode ? system._source.luck.max : system.luck.max,
      },
      luckValue: {
        field: system.schema.getField("luck").getField("value"),
        value: this.isEditMode ? system._source.luck.value : system.luck.value,
      },
      pronouns: {
        field: system.schema.getField("pronouns"),
        placeholder: game.i18n.localize("DISCWORLD.character.pronouns"),
        value: this.isEditMode ? system._source.pronouns : system.pronouns,
      },
    };

    // Enrich the description field.
    context.fields.description.enriched = await TextEditor.enrichHTML(
      context.fields.description.value,
      {
        rollData: this.document.getRollData(),
        relativeTo: this.document,
      },
    );

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

    // Edit Trait by right-click.
    const sheetBody = this.element.querySelector("section.sheet-body");
    sheetBody.addEventListener("contextmenu", (event) => {
      const { itemId } = event.target.dataset;
      if (!itemId) return;

      const trait = this.actor.items.get(itemId);
      CharacterSheet.#editTrait.call(this, trait);
    });

    // Add Trait by double-clicking trait category label.
    sheetBody.addEventListener("dblclick", (event) => {
      const { traitType } = event.target.closest(".trait-category").dataset;
      if (!traitType) return;

      CharacterSheet.#addTrait.call(this, traitType);
    });

    // Add/remove class depending on Help Mode.
    if (this.isHelpMode) {
      this.element.classList.add("help-mode");
    } else {
      this.element.classList.remove("help-mode");
    }

    // Select luck input fields on focus.
    this.element
      .querySelectorAll(".luck-container input")
      .forEach((input) =>
        input.addEventListener("focus", (event) =>
          event.currentTarget.select(),
        ),
      );
  }

  /** @override */
  async close() {
    await super.close();

    if (this.isHelpMode) this.actor.leaveHelpMode();
  }

  /**
   * Leave help mode and re-render the character sheet,
   * if open.
   */
  static #leaveHelpMode() {
    this.actor.leaveHelpMode();
  }

  /**
   * Handle clicks on trait actions (add, edit, delete, roll).
   *
   * @param {Event} event - The originating click event.
   * @param {HTMLElement} target - The target element of the event.
   * @returns {void}
   */
  static #traitAction(event, target) {
    const { actionType, itemId } = target.dataset;
    const trait = this.actor.items.get(itemId);

    switch (actionType) {
      case "add": {
        const { traitType } = target.closest(".trait-category").dataset;
        CharacterSheet.#addTrait.call(this, traitType);
        break;
      }
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
    const content = game.i18n.format("DISCWORLD.dialog.deleteTrait.content", {
      traitName: trait.name,
    });

    // TODO: remove this when v12 support is dropped.
    if (game.release.generation < 13) {
      const { DialogV2 } = foundry.applications.api;
      const promptResult = await DialogV2.confirm({
        window: {
          title: "DISCWORLD.dialog.deleteTrait.title",
        },
        content,
      });
      if (!promptResult) return;
      trait.delete();
    } else {
      trait.deleteDialog({ content: `<p>${content}</p>` });
    }
  }

  /**
   * Prompts the user to select a die to roll and then rolls the trait.
   *
   * @param {Item} trait - The trait to be rolled.
   * @returns {Promise<void>}
   */
  static async #rollTrait(trait) {
    const { actor } = this;
    actor.rollTrait(trait);
  }
}
