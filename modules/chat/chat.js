/* eslint-disable max-classes-per-file */
import rollTraitDialog from "../dialog/roll-trait-dialog.js";
import DiscworldRoll from "../rolls/rolls.js";

/**
 * The Discworld Chat Log.
 * We extend this class to add custom button listeners.
 */
export default class DiscworldChatLog extends (foundry.applications?.sidebar
  ?.tabs?.ChatLog ?? ChatLog) {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      narrativium: DiscworldChatLog.#onRollNarrativium,
      help: DiscworldChatLog.#onHelp,
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  activateListeners(html) {
    // TODO: Remove once v12 support is dropped.
    super.activateListeners(html);

    html.on("click", "button.narrativium", (event) => {
      DiscworldChatLog.#onRollNarrativium.call(this, event);
    });

    html.on("click", "button.help", (event) => {
      DiscworldChatLog.#onHelp.call(this, event);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Respond to a user clicking the "Help" button by:
   *   1. Opening the user's character sheet in "help mode".
   *   2. Waiting for a Trait to be clicked.
   *   3. Creating the Trait help roll.
   *
   * @param {Event} event - The originating click event.
   * @param {HTMLElement} target - The target element of the event.
   * @returns {void}
   */
  static async #onHelp(event, target) {
    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length > 1) {
      ui.notifications.warn("DISCWORLD.chat.warning.singleTokenSelect", {
        localize: true,
      });
      return;
    }

    // Get the Actor from either the selected Token, or the User's character.
    const [token] = controlledTokens;
    const actor = token?.actor ?? game.user.character;

    if (!actor) {
      ui.notifications.warn("DISCWORLD.chat.warning.actorNotFound", {
        localize: true,
      });
      return;
    }

    // Wait for a Trait to be clicked.
    const trait = await actor.sheet.resolveHelpMode();
    if (!trait) return;

    const dialogResult = await rollTraitDialog(actor, trait);
    if (!dialogResult) return;

    const { message } = DiscworldChatLog.getClickedMessageData(event, target);
    DiscworldRoll.createHelpRoll({
      diceTerm: dialogResult,
      trait,
      message,
    });
  }

  /**
   * Respond to the GM clicking the "Narrativium" button
   * by creating a Narrativium (d8) Roll.
   *
   * @param {Event} event - The originating click event.
   * @param {HTMLElement} target - The target element of the event.
   * @returns {void}
   */
  static #onRollNarrativium(event, target) {
    if (!game.user.isGM) return;

    const messageData = DiscworldChatLog.getClickedMessageData(event, target);
    DiscworldRoll.createNarrativiumRoll(messageData);
  }

  /**
   * Retrieve message data from a clicked chat message element,
   * accounting for the current generation of Foundry.
   *
   * @param {Event} event - The originating click event.
   * @param {HTMLElement} target - The target element of the event.
   * @returns {Object} An object containing the chat message and reroll status.
   * @returns {ChatMessage} return.message - The clicked chat message.
   * @returns {boolean} return.reroll - Whether the message was marked as a reroll.
   */
  static getClickedMessageData(event, target) {
    // TODO: Remove once v12 support is dropped.
    const elem = game.release.generation < 13 ? event.currentTarget : target;

    const message = game.messages.get(
      elem.closest(".message").dataset.messageId,
    );
    const reroll = elem.classList.contains("reroll");
    return { message, reroll };
  }
}
