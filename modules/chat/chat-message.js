import transitionClass from "../utils/animations.js";

export default class DiscworldMessage extends ChatMessage {
  /**
   * Retrieve the HTML element for this message from the chat log.
   *
   * @returns {HTMLElement} The message element from the chat log.
   */
  get element() {
    const chatLog = document.getElementById("chat");
    return chatLog.querySelector(`li[data-message-id="${this.id}"]`);
  }

  async slideDiceIcon(rollClass) {
    const dieListItem = this.element.querySelector(`li.${rollClass}`);
    return transitionClass(dieListItem, ["shift-center"], {
      remove: true,
    });
  }

  async fadeDiceIcon(rollClass, rollResult, rollTerm = null) {
    const dieListItem = this.element.querySelector(`li.${rollClass}`);
    dieListItem.classList.add(rollTerm);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, ["not-visible"], {
      remove: true,
    });
  }

  async fadeTextInOut(rollClass, rollResult) {
    const resultSpan = this.element.querySelector(`li.${rollClass} span`);
    await transitionClass(resultSpan, ["not-visible"]);
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, ["not-visible"], {
      remove: true,
    });
  }
}
