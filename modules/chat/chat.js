import DiscworldRoll from "../rolls/rolls.js";

/**
 * The Discworld Chat Log. We extend this class to add custom button listeners.
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

  /**
   * Add custom button listeners to the chat log.
   *
   * @override
   * @param {jQuery} html - The jQuery object that represents the chat log.
   * @returns {void}
   */
  activateListeners(html) {
    // TODO: Remove once v12 support is dropped.
    super.activateListeners(html);

    const [chatLog] = html;
    chatLog.addEventListener("click", (event) => {
      // Delegate event handling based on the closest button clicked
      switch (true) {
        // Handle clicks on "narrativium" button
        case !!event.target.closest("button.narrativium"):
          DiscworldChatLog.#onRollNarrativium.call(this, event);
          break;

        // Handle clicks on "help" button
        case !!event.target.closest("button.help"):
          DiscworldChatLog.#onHelp.call(this, event);
          break;

        // Otherwise, do nada.
        default:
          break;
      }
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

    // Warn and prevent roll if character has no luck remaining.
    if (actor.system.luck.value) {
      // TODO: This can be cleaned up in v13.
      ui.notifications.warn(
        game.i18n.format("DISCWORLD.chat.warning.noLuck", {
          actorName: actor.name,
        }),
      );
      return;
    }

    const { message } = DiscworldChatLog.getClickedMessageData(event, target);

    // Wait for a Trait to be rolled.
    actor.resolveHelpMode(message);
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
    if (!game.user.isGM) {
      ui.notifications.warn("DISCWORLD.chat.warning.gmOnly", {
        localize: true,
      });
      return;
    }

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
    const targetElem = game.release.generation < 13 ? event.target : target;
    const messageElem = targetElem.closest(".message");
    const buttonElem = targetElem.closest("button");

    const message = game.messages.get(messageElem.dataset.messageId);
    const reroll = buttonElem.classList.contains("reroll");
    return { message, reroll };
  }
}
