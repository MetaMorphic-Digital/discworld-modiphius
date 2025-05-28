import DISCWORLD from "../config.mjs";
import DiscworldSheetMixin from "./base-document-sheet.mjs";

const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * @extends ItemSheetV2
 */
export default class TraitSheet extends DiscworldSheetMixin(ItemSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 525,
      height: 450,
    },
    classes: ["trait-sheet"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: `systems/${DISCWORLD.id}/templates/trait-sheet/header.hbs`,
    },
    description: {
      template: `systems/${DISCWORLD.id}/templates/trait-sheet/description.hbs`,
      scrollable: [".editor-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.fields = {
      name: {
        field: this.document.schema.getField("name"),
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
    context.fields.notes.enriched =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        context.fields.notes.value,
        {
          rollData: this.document.getRollData(),
          relativeTo: this.document,
        },
      );

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * A user is most likely going to be editing the name field
   * when opening the trait sheet from a character sheet.
   * So, we override this method to add a new option to autofocus
   * that field.
   *
   * @inheritdoc
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
