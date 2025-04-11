import DISCWORLD from "../config.js";
import DWHelpRoll from "../rolls/help-roll.js";
import DWTraitRoll from "../rolls/trait-roll.js";

export default class DiscworldCharacter extends Actor {
  /**
   * @typedef {Object} HelpMode
   * @prop {boolean} enabled - Whether help mode is enabled.
   * @prop {Object} promise - The promise that resolves to the selected trait.
   * @prop {Function|null} promise.resolve - The function to resolve the promise.
   * @prop {Function|null} promise.reject - The function to reject the promise.
   */

  /** @type {HelpMode} */
  helpMode = {
    enabled: false,
    promise: {
      resolve: null,
      reject: null,
    },
  };

  /**
   * Set default prototype token data.
   * @override
   */
  static async create(data, options = {}) {
    data.prototypeToken = foundry.utils.mergeObject(
      {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        "bar1.attribute": "luck",
      },
      data.prototypeToken ?? {},
    );

    return super.create(data, options);
  }

  /**
   * In Discworld, everything is a trait.
   * So, you can pass anything that has a `name`
   * property to `rolLTrait`.
   *
   * @typedef {object} TraitLike
   * @prop {string} name
   */
  /**
   * Handles the logic for rolling a trait from the character sheet.
   * If help mode is enabled, the trait is passed to the help promise.
   * Otherwise, a dialog is shown asking the user to select a die to roll.
   *
   * @param {Item|TraitLike} trait - The trait to be rolled.
   * @returns {Promise<DiscworldMessage|null>}
   */
  async rollTrait(trait) {
    // A help roll will handle its own dialog/roll.
    if (this.helpMode.enabled) {
      this.helpMode.promise.resolve(trait);
      return null;
    }

    const dialogResult = await this.rollTraitDialog(trait);
    if (!dialogResult) return null;

    return DWTraitRoll.createBaseRoll(dialogResult, { actor: this, trait });
  }

  /**
   * Displays a dialog to prompt the user to select a die to roll.
   *
   * @param {Item} trait - The trait to be rolled.
   * @returns {Promise<"d4"|"d6"|"d10"|"d12"|null>} - A promise that resolves to the selected die, or null if the dialog is cancelled.
   */
  async rollTraitDialog(trait) {
    const { DialogV2 } = foundry.applications.api;
    const content = await foundry.applications.handlebars.renderTemplate(
      `systems/${DISCWORLD.id}/templates/mixins/trait-quote.hbs`,
      { traitName: trait.name, actorName: this.name },
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

  /**
   * Enable help mode and render the character sheet, which awaits a trait roll.
   *
   * @param {DiscworldMessage} message - The message that triggered help mode.
   * @returns {DiscworldMessage|null}
   */
  async resolveHelpMode(message) {
    this.helpMode.enabled = true;

    // Check if sheet is already open
    const close = !this.sheet.rendered;

    // Render (or rerender) sheet in help mode.
    await this.sheet.render({ force: true });

    /* eslint-disable no-await-in-loop */
    let trait;
    let dialogResult;
    // Wait for the user to select and roll a trait.
    while (!dialogResult) {
      // Wait for the user to select a trait.
      trait = await this.waitForTraitSelection();
      // If sheet is closed or help mode is cancelled, return.
      if (!trait) return null;

      // Present user with the dice selection dialog.
      dialogResult = await this.rollTraitDialog(trait);
      /* eslint-enable */
    }

    // Deduct a luck point (we've already determined the character has at least one).
    this.update({
      "system.luck.value": this.system.luck.value - 1,
    });

    // Close the sheet if it wasn't already opened.
    if (close) this.sheet.close();

    // Leave help mode.
    this.leaveHelpMode();

    // Create the help roll and send to chat.
    return DWHelpRoll.createHelpRoll({
      term: dialogResult,
      trait,
      message,
    });
  }

  /**
   * Returns a promise that resolves to the trait selected while in help mode.
   * Resolves to null if help mode is cancelled.
   *
   * @returns {Promise<Item|null>} A promise that resolves to the selected
   *                               trait, or null if help mode is cancelled.
   */
  waitForTraitSelection() {
    return new Promise((resolve) => {
      this.helpMode.promise.resolve = (trait) => {
        resolve(trait);
      };
      this.helpMode.promise.reject = () => resolve(null);
    });
  }

  /** Leave help mode and re-render the character sheet, if open. */
  leaveHelpMode() {
    this.resetHelpMode();
    this.sheet.render();
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
    this.helpMode.enabled = false;
    this.helpMode.promise.reject?.();
    this.helpMode.promise = {
      resolve: null,
      reject: null,
    };
  }
}
