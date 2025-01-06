import DiscworldRoll from "../rolls/rolls.js";

export default class DiscworldChatLog extends ChatLog {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", "button.narrativium", (event) => {
      DiscworldChatLog.#onRollNarrativium.call(this, event);
    });
  }

  static #onRollNarrativium(event) {
    if (!game.user.isGM) return;
    const message = DiscworldChatLog.getClickedMessage(event);
    const element = event.currentTarget.closest(".message");
    const reroll = event.currentTarget.classList.contains("reroll");

    DiscworldRoll.createNarrativiumRoll(message, {
      reroll,
      element,
    });
  }

  static getClickedMessage(event) {
    const { currentTarget } = event;
    const message = game.messages.get(
      currentTarget.closest(".message").dataset.messageId,
    );
    return message;
  }
}
