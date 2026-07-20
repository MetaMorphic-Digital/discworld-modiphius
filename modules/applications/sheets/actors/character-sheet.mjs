import DiscworldActorSheet from "./base-actor-sheet.mjs";

export default class CharacterSheet extends DiscworldActorSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["character-sheet"],
  };

  /* ------------------------------------------------- */

  /** @inheritdoc */
  _getFields() {
    const { system } = this.document;
    return {
      ...super._getFields(),
      luckMax: {
        field: system.schema.getField("luck.max"),
        value: this.isEditMode ? system._source.luck?.max : system.luck?.max,
      },
      luckValue: {
        field: system.schema.getField("luck.value"),
        value: this.isEditMode ? system._source.luck?.value : system.luck?.value,
      },
    };
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Select luck input fields on focus.
    this.element
      .querySelectorAll(".luck-container input")
      .forEach((input) =>
        input.addEventListener("focus", (event) =>
          event.currentTarget.select(),
        ),
      );
  }
}
