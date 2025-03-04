import DiscworldSheetMixin from "./base-document-sheet.js";

const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * @extends ItemSheetV2
 */
export default class TraitSheet extends DiscworldSheetMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    position: {
      width: 525,
      height: "auto",
    },
    classes: ["trait-sheet"],
  };

  static PARTS = {
    main: {
      template: "systems/discworld/templates/trait-sheet.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.fields = {
      name: {
        field: this.document.schema.getField("name"),
        label: game.i18n.localize("Name"), // TODO: remove once v12 support is dropped
        value: this.isEditMode
          ? this.document._source.name
          : this.document.name,
      },
      type: {
        field: this.document.system.schema.getField("type"),
        value: this.isEditMode
          ? this.document.system._source.type
          : this.document.system.type,
      },
      severity: {
        field: this.document.system.schema.getField("severity"),
        value: this.isEditMode
          ? this.document.system._source.severity
          : this.document.system.severity,
      },
      notes: {
        field: this.document.system.schema.getField("notes"),
        value: this.isEditMode
          ? this.document.system._source.notes
          : this.document.system.notes,
      },
    };

    context.fields.severity.show = context.fields.type.value === "consequences";
    context.fields.notes.enriched = await TextEditor.enrichHTML(
      context.fields.notes.value,
      {
        rollData: this.document.getRollData(),
        relativeTo: this.document,
      },
    );

    return context;
  }

  /**
   * A user is most likely going to be editing the name field
   * when opening the trait sheet from a character sheet.
   * So, we override this method to add a new option to autofocus
   * that field.
   *
   * @override
   * @param {Object} options
   * @param {boolean} options.autofocus - Whether to autofocus the name field
   * @returns {Promise<ApplicationV2>} - See Foundry API docs.
   */
  async render(options) {
    const renderedApp = await super.render(options);
    const { autofocus } = options;

    if (autofocus) {
      const nameField = this.element.querySelector("input[name='name']");
      nameField.focus();
      nameField.select();
    }

    return renderedApp;
  }
}
