import DiscworldActorSheet from "./base-actor-sheet.mjs";

export default class CharacterSheet extends DiscworldActorSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["character-sheet"],
    actions: {
      leaveHelpMode: CharacterSheet.#leaveHelpMode,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.helpMode = this.isHelpMode;

    return context;
  }

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
}
