/* eslint-disable max-classes-per-file */
import DiscworldRoll from "../rolls/rolls.js";
import transitionClass from "../utils/animations.js";

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

export class ChatAnimations {
  static async slideDiceIcon(element, rollClass) {
    const dieListItem = element.querySelector(`li.${rollClass}`);
    return transitionClass(dieListItem, ["move-right"], {
      remove: true,
    });
  }

  static async fadeDiceIcon(element, rollClass, rollResult) {
    const dieListItem = element.querySelector(`li.${rollClass}`);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, ["not-visible"], {
      remove: true,
    });
  }

  static async fadeTextInOut(element, rollClass, rollResult) {
    const resultSpan = element.querySelector(`li.${rollClass} span`);
    await transitionClass(resultSpan, ["not-visible"]);
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, ["not-visible"], {
      remove: true,
    });
  }
}
