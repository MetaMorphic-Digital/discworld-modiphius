import DiscworldRoll from "../rolls/rolls.js";

export default class DiscworldChatLog extends ChatLog {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", "button.help", (event) => {
      console.log("Help Button Clicked");
    });

    html.on("click", "button.narrativium", (event) => {
      DiscworldChatLog.#onRollNarrativium.call(this, event);
    });
  }

  static #onRollNarrativium(event) {
    if (!game.user.isGM) return;
    const { currentTarget } = event;
    const message = game.messages.get(
      currentTarget.closest(".message").dataset.messageId,
    );
    DiscworldRoll.createNarrativiumRoll(message);
  }
}
