import DiscworldSheetMixin from "./base-document-sheet.mjs";
import DISCWORLD from "../config.mjs";

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
   * @type {boolean}
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
    context.fields.description.enriched = await CONFIG.ux.TextEditor.enrichHTML(
      context.fields.description.value,
      { rollData: this.document.getRollData(), relativeTo: this.document },
    );

    // Construct arrays of traits, filtered by category.
    context.traitGroups = this._getTraitGroups();

    // Translation of trait types.
    context.traitTypeTranslationMap = DISCWORLD.traitTypes;

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Create context for input fields.
   * @returns {object}    Organized context for fields.
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
    const items = Object.groupBy(this.actor.items, item => item.system.type);
    return Object.keys(DISCWORLD.traitTypes).reduce((acc, traitType) => {
      acc[traitType] = items[traitType] ?? [];
      return acc;
    }, {});
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
    const getItem = (target) => this.document.items.get(target.dataset.itemId);
    return [
      {
        label: "DISCWORLD.sheet.context.actor.trait.use",
        icon: "fa-solid fa-hand-fist",
        visible: () => this.document.isOwner,
        onClick: (event, target) => this.document.rollTrait(
          getItem(target),
          { parentWindow: this.window.windowId },
        ),
      },
      {
        label: "DISCWORLD.sheet.context.actor.trait.edit",
        icon: "fa-solid fa-edit",
        visible: () => this.document.isOwner,
        onClick: (event, target) => getItem(target).sheet.render({ force: true }),
      },
      {
        label: "DISCWORLD.sheet.context.actor.trait.delete",
        icon: "fa-solid fa-trash",
        visible: () => this.document.isOwner,
        onClick: (event, target) => getItem(target).deleteDialog({
          renderOptions: { window: { windowId: this.window.windowId } },
        }),
      },
      {
        label: "DISCWORLD.sheet.context.actor.trait.duplicate",
        icon: "fa-solid fa-copy",
        visible: () => this.document.isOwner,
        onClick: (event, target) => {
          const item = getItem(target);
          item.clone(
            { name: _loc("DOCUMENT.CopyOf", { name: item.name }) },
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
   * Leave help mode and re-render the character sheet, if open.
   * @this CharacterSheet
   */
  static #leaveHelpMode() {
    this.actor.leaveHelpMode();
  }

  /* -------------------------------------------------- */

  /**
   * Handle clicks on trait actions (add, edit, delete, roll).
   * @this CharacterSheet
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
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
   * @this CharacterSheet
   * @param {string} traitType    The type of trait to add. Must be one of the {@link DISCWORLD.traitTypes} constants.
   */
  static async #addTrait(traitType) {
    const newTrait = await getDocumentClass("Item").create(
      {
        name: _loc("DOCUMENT.New", { type: _loc(`DISCWORLD.trait.type.${traitType}`) }),
        type: "trait",
        system: { type: traitType },
      },
      { parent: this.document, renderSheet: false },
    );

    newTrait.sheet.render({ force: true, autofocus: true });
  }

  /* -------------------------------------------------- */

  /**
   * Opens the Trait sheet for editing with autofocus enabled on the name field.
   * @this CharacterSheet
   * @param {Item} trait    The trait item to be edited.
   */
  static async #editTrait(trait) {
    trait.sheet.render({ force: true, autofocus: true });
  }

  /* -------------------------------------------------- */

  /**
   * Prompts the user for confirmation before deleting a Trait.
   * @this CharacterSheet
   * @param {Item} trait    The trait item to be deleted.
   */
  static async #deleteTrait(trait) {
    const content = _loc("DISCWORLD.dialog.deleteTrait.content", { traitName: trait.name });
    trait.deleteDialog({ content: `<p>${content}</p>` });
  }

  /* -------------------------------------------------- */

  /**
   * Prompts the user to select a die to roll and then rolls the trait.
   * @this CharacterSheet
   * @param {Item} trait    The trait to be rolled.
   */
  static async #rollTrait(trait) {
    this.actor.rollTrait(trait, { parentWindow: this.window.windowId });
  }

  /**
   * Rolls the character's name/pronouns as a trait.
   * @this CharacterSheet
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

  /* -------------------------------------------------- */

  /**
   * Rolls a part of the character's description as a trait (TraitLike).
   * @this CharacterSheet
   * @param {string} html   The html of the TraitLike to be rolled.
   * @see DiscworldCharacter.rollTrait
   */
  static async #rollDescriptionAsTrait(html) {
    const { actor } = this;
    const enrichedText = await CONFIG.ux.TextEditor.enrichHTML(html, {
      rollData: actor.getRollData(), relativeTo: actor,
    });
    actor.rollTrait({ actor, name: enrichedText });
  }
}
