import DISCWORLD from "../../config.mjs";
import DiscworldSheetMixin from "./base-document-sheet.mjs";

const { ItemSheetV2 } = foundry.applications.sheets;

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
    const { document } = this;
    const { system } = this.document;

    // Prepare choices for the trait type field.
    const { traitTypes } = discworld.config;
    let typeChoices = traitTypes[system.actorType] ?? traitTypes.character;
    if (!Object.keys(typeChoices).includes(system.type) && system.type) {
      // If the trait type isn't in the list, add it.
      // This happens in the edge case that a module which
      // adds trait types has been disabled.
      typeChoices = foundry.utils.mergeObject(
        typeChoices,
        { [system.type]: _loc(`DISCWORLD.trait.type.${system.type}`) },
        { inplace: false },
      );
    }

    context.fields = {
      name: {
        field: document.schema.getField("name"),
        value: this.isEditMode
          ? document._source.name
          : document.name,
      },
      actorType: {
        field: system.schema.getField("actorType"),
        value: this.isEditMode
          ? system._source.actorType
          : system.actorType,
        choices: DISCWORLD.actorTypes,
      },
      type: {
        field: system.schema.getField("type"),
        value: this.isEditMode
          ? system._source.type
          : system.type,
        choices: typeChoices,
      },
      severity: {
        field: system.schema.getField("severity"),
        value: this.isEditMode
          ? system._source.severity
          : system.severity,
      },
      notes: {
        field: system.schema.getField("notes"),
        value: this.isEditMode
          ? system._source.notes
          : system.notes,
      },
    };

    context.fields.actorType.show = !document.isOwned && (Object.keys(DISCWORLD.actorTypes).length > 1);
    context.fields.severity.show = context.fields.type.value === "consequences";
    context.fields.notes.enriched = await CONFIG.ux.TextEditor.enrichHTML(
      context.fields.notes.value,
      { rollData: this.document.getRollData(), relativeTo: this.document },
    );

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async render(options) {
    const renderedApp = await super.render(options);
    const { autofocus } = options;

    // A user is most likely going to be editing the name field when opening the trait
    // sheet from a character sheet. So, we override this method to add a new option
    // to autofocus that field.

    if (autofocus) {
      const nameField = this.element.querySelector("input[name='name']");
      nameField?.focus();
      nameField?.select();
    }

    return renderedApp;
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _onChangeForm(formConfig, event) {
    const { target } = event;

    // Handle changes to actorType, assigning a valid trait type.
    if (target?.name === "system.actorType") {
      const [defaultType] = Object.keys(discworld.config.traitTypes[target.value]);
      this.document.update(
        { "system.type": defaultType },
        { render: false },
      );
    }
    return super._onChangeForm(formConfig, event);
  }
}
