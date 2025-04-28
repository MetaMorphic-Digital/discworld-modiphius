import DiscworldSheetMixin from "./base-document-sheet.js";
import DISCWORLD from "../config.js";

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * @extends ActorSheetV2
 */
export default class CharacterSheet extends DiscworldSheetMixin(ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 525,
      height: 685,
    },
    classes: ["actor-sheet"],
    actions: {
      traitAction: CharacterSheet.#traitAction,
      leaveHelpMode: CharacterSheet.#leaveHelpMode,
      rollNameAsTrait: CharacterSheet.#rollNameAsTrait,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: `systems/${DISCWORLD.id}/templates/character-sheet/header.hbs`,
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    traits: {
      template: `systems/${DISCWORLD.id}/templates/character-sheet/traits-tab.hbs`,
      scrollable: [""],
    },
    description: {
      template: `systems/${DISCWORLD.id}/templates/character-sheet/description-tab.hbs`,
      scrollable: [".editor-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [{ id: "traits" }, { id: "description" }],
      initial: "traits",
      labelPrefix: "DISCWORLD.sheet.tabs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * Helper to check if the actor is currently in help mode.
   *
   * @type {boolean}
   * @readonly
   */
  get isHelpMode() {
    return this.actor.helpMode.enabled;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.helpMode = this.isHelpMode;

    // Prepare input fields.
    context.fields = this._getFields();

    // Enrich the description field.
    context.fields.description.enriched =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        context.fields.description.value,
        {
          rollData: this.document.getRollData(),
          relativeTo: this.document,
        },
      );

    // Construct arrays of traits, filtered by category.
    context.traitGroups = this._getTraitGroups();

    // Translation of trait types.
    context.traitTypeTranslationMap = DISCWORLD.traitTypes;

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    // By default, this returns the same mutated context.
    // eslint-disable-next-line no-param-reassign
    context = await super._preparePartContext(partId, context, options);

    context.tab = context.tabs[partId];

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Create context for input fields.
   * @returns {object} Organized context for fields.
   */
  _getFields() {
    const { document } = this;
    const { system } = document;
    return {
      name: {
        field: document.schema.getField("name"),
        value: this.isEditMode ? document._source.name : document.name,
      },
      description: {
        field: system.schema.getField("description"),
        value: this.isEditMode
          ? system._source.description
          : system.description,
      },
      luckMax: {
        field: system.schema.getField("luck.max"),
        value: this.isEditMode ? system._source.luck.max : system.luck.max,
      },
      luckValue: {
        field: system.schema.getField("luck.value"),
        value: this.isEditMode ? system._source.luck.value : system.luck.value,
      },
      pronouns: {
        field: system.schema.getField("pronouns"),
        placeholder: game.i18n.localize("DISCWORLD.character.pronouns"),
        value: this.isEditMode ? system._source.pronouns : system.pronouns,
      },
    };
  }

  /* -------------------------------------------------- */

  /**
   *
   * @returns {Record<keyof DISCWORLD.traitTypes, Item[]>}
   */
  _getTraitGroups() {
    const traitGroups = {};
    for (const traitType of Object.keys(DISCWORLD.traitTypes)) {
      traitGroups[traitType] = this.actor.items.filter(
        (item) => item.system.type === traitType,
      );
    }

    return traitGroups;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    this._createContextMenu(
      this.#prepareTraitContextOptions,
      "[data-action=traitAction]",
      {
        container: this.element,
        hookName: "getTraitContextOptions",
        parentClassHooks: false,
        fixed: true,
      },
    );

    // Add Trait by double-clicking trait category label.
    const sheetBody = this.element.querySelector("section.traits");
    sheetBody.addEventListener("dblclick", (event) => {
      const { traitType } = event.target.closest(".trait-category").dataset;
      if (!traitType) return;

      CharacterSheet.#addTrait.call(this, traitType);
    });

    // Make each description direct child element rollable.
    const descriptionParts = this.element.querySelectorAll(
      "prose-mirror.inactive .editor-content .trait-rollable",
    );
    descriptionParts.forEach((part) =>
      part.addEventListener("click", (event) => {
        const html = event.currentTarget.outerHTML;
        CharacterSheet.#rollDescriptionAsTrait.call(this, html);
      }),
    );

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

  /* -------------------------------------------------- */

  /**
   * Prepare the list of context menu options for traits.
   * @returns {object[]}    Context options.
   */
  #prepareTraitContextOptions() {
    const getItem = (li) => this.document.items.get(li.dataset.itemId);
    return [
      {
        name: "DISCWORLD.sheet.context.actor.trait.use",
        icon: "<i class='fa-solid fa-fw fa-hand-fist'></i>",
        condition: () => this.document.isOwner,
        callback: (li) => this.document.rollTrait(getItem(li)),
      },
      {
        name: "DISCWORLD.sheet.context.actor.trait.edit",
        icon: "<i class='fa-solid fa-fw fa-edit'></i>",
        condition: () => this.document.isOwner,
        callback: (li) => getItem(li).sheet.render({ force: true }),
      },
      {
        name: "DISCWORLD.sheet.context.actor.trait.delete",
        icon: "<i class='fa-solid fa-fw fa-trash'></i>",
        condition: () => this.document.isOwner,
        callback: (li) => getItem(li).deleteDialog(),
      },
      {
        name: "DISCWORLD.sheet.context.actor.trait.duplicate",
        icon: "<i class='fa-solid fa-fw fa-copy'></i>",
        condition: () => this.document.isOwner,
        callback: (li) => {
          const item = getItem(li);
          item.clone(
            { name: game.i18n.format("DOCUMENT.CopyOf", { name: item.name }) },
            { save: true, renderSheet: true },
          );
        },
      },
    ];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async close() {
    const result = await super.close();

    if (this.isHelpMode) this.actor.leaveHelpMode();

    return result;
  }

  /* -------------------------------------------------- */

  /**
   * Leave help mode and re-render the character sheet,
   * if open.
   */
  static #leaveHelpMode() {
    this.actor.leaveHelpMode();
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /**
   * Add a new trait of the given type to the character.
   *
   * @param {string} traitType - The type of trait to add. Must be one of the
   *                             {@link DISCWORLD.traitTypes} constants.
   * @returns {Promise<void>}
   */
  static async #addTrait(traitType) {
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

  /* -------------------------------------------------- */

  /**
   * Opens the Trait sheet for editing with autofocus enabled on the name field.
   *
   * @param {Item} trait - The trait item to be edited.
   * @returns {Promise<void>}
   */
  static async #editTrait(trait) {
    trait.sheet.render({ force: true, autofocus: true });
  }

  /* -------------------------------------------------- */

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
    trait.deleteDialog({ content: `<p>${content}</p>` });
  }

  /* -------------------------------------------------- */

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

  /**
   * Rolls the character's name/pronouns as a trait.
   *
   * @returns {Promise<void>}
   */
  static #rollNameAsTrait() {
    const { actor } = this;

    // Add pronouns if field is non-empty.
    let traitText = actor.name;
    if (actor.system.pronouns) {
      traitText += ` - ${actor.system.pronouns}`;
    }

    actor.rollTrait({ actor, name: traitText });
  }

  /**
   * Rolls a part of the character's description as a trait (TraitLike).
   *
   * @param {string} html - The html of the TraitLike to be rolled.
   *                        @see DiscworldCharacter.rollTrait
   * @returns {Promise<void>}
   */
  static async #rollDescriptionAsTrait(html) {
    const { actor } = this;
    const enrichedText =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(html, {
        rollData: actor.getRollData(),
        relativeTo: actor,
      });
    actor.rollTrait({ actor, name: enrichedText });
  }
}
