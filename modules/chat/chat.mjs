import DWNarrativiumRoll from "../rolls/narrativium-roll.mjs";
import DWTraitRoll from "../rolls/trait-roll.mjs";

/**
 * The Discworld Chat Log. We extend this class to add custom button listeners.
 */
export default class DiscworldChatLog extends foundry.applications.sidebar.tabs.ChatLog {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      help: DiscworldChatLog.#onHelp,
      trait: DiscworldChatLog.#onRollTrait,
      narrativium: DiscworldChatLog.#onRollNarrativium,
    },
  };

  /* -------------------------------------------------- */

  static async #onRollTrait(event, target) {
    const { message } = DiscworldChatLog.getClickedMessageData(event, target);
    console.info(message);
    DWTraitRoll.createBaseRoll;
  }

  /* -------------------------------------------------- */

  /**
   * Respond to a user clicking the "Help" button by:
   *   1. Opening the user's character sheet in "help mode".
   *   2. Waiting for a Trait to be clicked.
   *   3. Creating the Trait help roll.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #onHelp(event, target) {
    const { message } = DiscworldChatLog.getClickedMessageData(event, target);
    if (message.helpRoll) return;

    if (!canvas.ready) return;

    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length > 1) {
      ui.notifications.warn("DISCWORLD.chat.warning.singleTokenSelect", { localize: true });
      return;
    }

    // Get the Actor from either the selected Token, or the User's character.
    const [token] = controlledTokens;
    const actor = token?.actor ?? game.user.character;

    if (!actor) {
      ui.notifications.warn("DISCWORLD.chat.warning.actorNotFound", { localize: true });
      return;
    }

    // Warn and prevent roll if character has no luck remaining.
    if (!actor.system.luck.value) {
      ui.notifications.warn("DISCWORLD.chat.warning.noLuck", { format: { actorName: actor.name } });
      return;
    }

    // Wait for a Trait to be rolled.
    actor.resolveWaitMode(message);
  }

  /* -------------------------------------------------- */

  /**
   * Respond to the GM clicking the "Narrativium" button
   * by creating a Narrativium (d8) Roll.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #onRollNarrativium(event, target) {
    if (!game.user.isGM) {
      ui.notifications.warn("DISCWORLD.chat.warning.gmOnly", { localize: true });
      return;
    }
    const messageData = DiscworldChatLog.getClickedMessageData(event, target);
    DWNarrativiumRoll.createNarrativiumRoll(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * @typedef ClickedMessageData
   * @property {ChatMessage} message    The clicked chat message.
   * @property {boolean} reroll         Whether the message was marked as a reroll.
   */

  /**
   * Retrieve message data from a clicked chat message element.
   * @param {PointerEvent} event    The originating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   * @returns {ClickedMessageData}
   */
  static getClickedMessageData(event, target) {
    const messageElem = target.closest(".message");
    const buttonElem = target.closest("button");

    const message = game.messages.get(messageElem.dataset.messageId);
    const reroll = buttonElem.classList.contains("reroll");
    return { message, reroll };
  }
}
