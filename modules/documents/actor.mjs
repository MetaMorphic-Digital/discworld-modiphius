import DISCWORLD from "../config.mjs";

export default class DiscworldActor extends foundry.documents.Actor {
  /**
   * @typedef WaitMode
   * @property {boolean} enabled                  Whether wait mode is enabled.
   * @property {object} promise                   The promise that resolves to the selected trait.
   * @property {Function|null} promise.resolve    The function to resolve the promise.
   * @property {Function|null} promise.reject     The function to reject the promise.
   */

  /** @type {WaitMode} */
  waitMode = {
    enabled: false,
    isHelpRoll: false,
    promise: {
      resolve: null,
      reject: null,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    const update = foundry.utils.mergeObject(
      {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        bar1: { attribute: "luck" },
      },
      data.prototypeToken ?? {},
      { insertKeys: false, insertValues: false, overwrite: true },
    );

    this.updateSource({ prototypeToken: update });
  }

  /* -------------------------------------------------- */

  /**
   * In Discworld, everything is a trait. So, you can pass anything that has a `name` property to `rollTrait`.
   * @typedef TraitLike
   * @property {string} name
   */

  /* -------------------------------------------------- */

  /**
   * Handles the logic for rolling a trait from the character sheet.
   * If wait mode is enabled, the trait is passed to the wait promise.
   * Otherwise, a dialog is shown asking the user to select a die to roll.
   * @param {Item|TraitLike} trait    The trait to be rolled.
   * @param {object} [options]
   * @param {string} [options.parentWindow]   The id of a parent window in which to render the prompt.
   * @returns {Promise<DiscworldMessage|null>}
   */
  async rollTrait(trait, options = {}) {
    // A wait roll will handle its own dialog/roll.
    if (this.waitMode.enabled) {
      this.waitMode.promise.resolve(trait);
      return null;
    }

    const dialogResult = await this.rollTraitDialog(trait, options);
    if (!dialogResult) return null;

    return discworld.rolls.DWTraitRoll.createBaseRoll(dialogResult, { actor: this, trait });
  }

  /* -------------------------------------------------- */

  /**
   * Displays a dialog to prompt the user to select a die to roll.
   * @param {Item} trait                              The trait to be rolled.
   * @param {object} [options]
   * @param {string} [options.parentWindow]           The id of a parent window in which to render the prompt.
   * @returns {Promise<"d4"|"d6"|"d10"|"d12"|null>}   A promise that resolves to the selected die,
   *                                                  or null if the dialog is cancelled.
   */
  async rollTraitDialog(trait, options) {
    const { Dialog } = foundry.applications.api;
    const content = await foundry.applications.handlebars.renderTemplate(
      `systems/${DISCWORLD.id}/templates/mixins/trait-quote.hbs`,
      { traitName: trait.name, actorName: this.name },
    );

    const playerDice = ["d4", "d6", "d10", "d12"];
    const buttons = playerDice.map((die) => {
      return { class: [die], label: die, action: die, default: die === "d6" };
    });

    return Dialog.wait({
      buttons,
      content,
      classes: ["discworld"],
      position: { width: 400 },
      window: {
        title: "DISCWORLD.dialog.rollTrait.title",
      },
      renderOptions: {
        window: {
          windowId: options.parentWindow,
        },
      },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Enable wait mode and render the character sheet, which awaits a trait roll.
   * @param {DiscworldMessage} message    The message that triggered wait mode.
   * @param {object} options              An object with additional options.
   * @param {boolean} isHelpRoll          Whether this is a help roll.
   * @param {string} [groupMember]        The group member id this roll targets, if any.
   * @returns {Promise<DiscworldMessage|null>}
   */
  async resolveWaitMode(message, { isHelpRoll, groupMember }) {
    this.waitMode.enabled = true;
    this.waitMode.isHelpRoll = isHelpRoll;

    // Check if sheet is already open
    const close = !this.sheet.rendered;

    // Render (or rerender) sheet in wait mode.
    await this.sheet.render({ force: true });

    let trait;
    let dialogResult;
    // Wait for the user to select and roll a trait.
    while (!dialogResult) {
      // Wait for the user to select a trait.
      trait = await this.waitForTraitSelection();
      // If sheet is closed or wait mode is cancelled, return.
      if (!trait) return null;

      // Present user with the dice selection dialog.
      dialogResult = await this.rollTraitDialog(trait, { parentWindow: this.sheet.window.windowId });
    }

    // Deduct a luck point (we've already determined the character has at least one).
    if ((this.type === "character") && isHelpRoll) {
      this.update({ "system.luck.value": this.system.luck.value - 1 });
    }

    // Close the sheet if it wasn't already opened.
    if (close) this.sheet.close();

    // Leave wait mode.
    this.leaveWaitMode();

    // Create the roll and send to chat.
    return discworld.rolls.DWTraitRoll.createWaitRoll({
      term: dialogResult,
      actor: this,
      message,
      trait,
      isHelpRoll,
      groupMember,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Returns a promise that resolves to the trait selected while in wait mode.
   * Resolves to null if wait mode is cancelled.
   * @returns {Promise<Item|null>}    A promise that resolves to the selected
   *                                  trait, or null if wait mode is cancelled.
   */
  waitForTraitSelection() {
    return new Promise((resolve) => {
      this.waitMode.promise.resolve = (trait) => {
        resolve(trait);
      };
      this.waitMode.promise.reject = () => resolve(null);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Leave wait mode and re-render the character sheet, if open.
   */
  leaveWaitMode() {
    this.resetWaitMode();
    this.sheet.render();
  }

  /* -------------------------------------------------- */

  /**
   * Resets the wait mode flag and rejects any pending wait promises.
   * This is called when the character sheet is closed,
   * or when the wait mode flag is explicitly toggled off.
   */
  resetWaitMode() {
    this.waitMode.enabled = false;
    this.waitMode.isHelpRoll = false;
    this.waitMode.promise.reject?.();
    this.waitMode.promise = {
      resolve: null,
      reject: null,
    };
  }
}
