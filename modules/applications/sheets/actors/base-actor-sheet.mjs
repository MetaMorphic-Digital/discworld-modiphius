import DiscworldSheetMixin from "../base-document-sheet.mjs";
import DISCWORLD from "../../../config.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * @extends ActorSheetV2
 */
export default class DiscworldActorSheet extends DiscworldSheetMixin(ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 525,
      height: 685,
    },
    classes: ["actor-sheet"],
    actions: {
      traitAction: DiscworldActorSheet.#traitAction,
      rollNameAsTrait: DiscworldActorSheet.#rollNameAsTrait,
      leaveWaitMode: DiscworldActorSheet.#leaveWaitMode,
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
   * Helper to check if the actor is currently in wait mode.
   * @type {boolean}
   */
  get isWaitMode() {
    return this.actor.waitMode.enabled;
  }

  /* ------------------------------------------------- */

  /**
   * Helper to get the base actor type, e.g., removing any prefixes from modules.
   * @example "character" -> "character"; "discworld-core.npc" -> "npc"
   * @type {string}
   */
  get actorBaseType() {
    return this.actor.type.replace(/.*\./, "");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Prepare input fields.
    context.fields = this._getFields();

    // Enrich the description field.
    context.fields.description.enriched = await CONFIG.ux.TextEditor.enrichHTML(
      context.fields.description.value,
      { rollData: this.document.getRollData(), relativeTo: this.document },
    );

    const traitActorGroup = DISCWORLD.traitTypes[this.actorBaseType]; // Get just the base actor type.
    // Construct arrays of traits, filtered by category.
    context.traitGroups = this._getTraitGroups(traitActorGroup);

    // Translation of trait types.
    context.traitTypeTranslationMap = traitActorGroup;

    // Wait mode
    context.isWaitMode = this.isWaitMode;
    context.waitModeType = this.actor.waitMode.isHelpRoll ? "help" : "trait";

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
      pronouns: {
        field: system.schema.getField("pronouns"),
        value: this.isEditMode ? system._source.pronouns : system.pronouns,
      },
    };
  }

  /* -------------------------------------------------- */

  /**
   * Get trait groups by type.
   * @param {Object} traitTypes    Trait types for a particular sheet.
   * @returns {Record<keyof DISCWORLD.traitTypes[keyof DISCWORLD.actorTypes], Item[]>}
   */
  _getTraitGroups(traitTypes) {
    const items = Object.groupBy(this.actor.items, item => item.system.type);
    return Object.keys(traitTypes).reduce((acc, traitType) => {
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

    // Add/remove class depending on Wait Mode.
    if (this.isWaitMode) {
      this.element.classList.add("wait-mode");
    } else {
      this.element.classList.remove("wait-mode");
    }

    // Add Trait by double-clicking trait category label.
    const sheetBody = this.element.querySelector("section.traits");
    sheetBody.addEventListener("dblclick", (event) => {
      const { traitType } = event.target.closest(".trait-category").dataset;
      if (!traitType) return;

      DiscworldActorSheet.#addTrait.call(this, traitType);
    });

    // Make each description direct child element rollable.
    const descriptionParts = this.element.querySelectorAll(
      "prose-mirror.inactive .editor-content .trait-rollable",
    );
    descriptionParts.forEach((part) =>
      part.addEventListener("click", (event) => {
        const html = event.currentTarget.outerHTML;
        DiscworldActorSheet.#rollDescriptionAsTrait.call(this, html);
      }),
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async close() {
    const result = await super.close();

    if (this.isWaitMode) this.actor.leaveWaitMode();

    return result;
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

  /**
   * Handle clicks on trait actions (add, edit, delete, roll).
   * @this DiscworldActorSheet
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #traitAction(event, target) {
    const { actionType, itemId } = target.dataset;
    const trait = this.actor.items.get(itemId);

    switch (actionType) {
      case "add": {
        const { traitType } = target.closest(".trait-category").dataset;
        DiscworldActorSheet.#addTrait.call(this, traitType);
        break;
      }
      case "edit":
        DiscworldActorSheet.#editTrait.call(this, trait);
        break;
      case "delete":
        DiscworldActorSheet.#deleteTrait.call(this, trait);
        break;
      default:
        DiscworldActorSheet.#rollTrait.call(this, trait);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Add a new trait of the given type to the character.
   * @this DiscworldActorSheet
   * @param {string} traitType    The type of trait to add. Must be one of the {@link DISCWORLD.traitTypes} constants.
   */
  static async #addTrait(traitType, extraData = {}) {
    const createData = foundry.utils.mergeObject(
      {
        name: _loc("DOCUMENT.New", { type: _loc(`DISCWORLD.trait.type.${traitType}`) }),
        type: "trait",
        system: { type: traitType, actorType: this.actorBaseType },
      },
      extraData,
    );
    const newTrait = await getDocumentClass("Item").create(
      createData,
      { parent: this.document, renderSheet: false },
    );

    newTrait.sheet.render({ force: true, autofocus: true });
  }

  /* -------------------------------------------------- */

  /**
   * Opens the Trait sheet for editing with autofocus enabled on the name field.
   * @this DiscworldActorSheet
   * @param {Item} trait    The trait item to be edited.
   */
  static async #editTrait(trait) {
    trait.sheet.render({ force: true, autofocus: true });
  }

  /* -------------------------------------------------- */

  /**
   * Prompts the user for confirmation before deleting a Trait.
   * @this DiscworldActorSheet
   * @param {Item} trait    The trait item to be deleted.
   */
  static async #deleteTrait(trait) {
    const content = _loc("DISCWORLD.dialog.deleteTrait.content", { traitName: trait.name });
    trait.deleteDialog({ content: `<p>${content}</p>` });
  }

  /* -------------------------------------------------- */

  /**
   * Prompts the user to select a die to roll and then rolls the trait.
   * @this DiscworldActorSheet
   * @param {Item} trait    The trait to be rolled.
   */
  static async #rollTrait(trait) {
    this.actor.rollTrait(trait, { parentWindow: this.window.windowId });
  }

  /**
   * Rolls the character's name/pronouns as a trait.
   * @this DiscworldActorSheet
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
   * @this DiscworldActorSheet
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

  /* -------------------------------------------------- */

  /**
   * Leave wait mode and re-render the character sheet, if open.
   * @this DiscworldActorSheet
   */
  static #leaveWaitMode() {
    this.actor.leaveWaitMode();
  }

}
