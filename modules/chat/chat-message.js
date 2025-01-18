import transitionClass from "../utils/animations.js";

/**
 * Discworld chat message class.
 */
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

  /**
   * Slide the dice icon of a given class name to over from the center of its container.
   *
   * @param {string} resultClass - The class name of the roll whose icon should be moved.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async slideDiceIcon(resultClass) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    return transitionClass(dieListItem, ["shift-center"], {
      remove: true,
    });
  }

  /**
   * Fade in the dice icon of a given class name.
   *
   * @param {string} resultClass - The class name of the roll whose icon should be faded.
   * @param {number} rollResult - The new result to display.
   * @param {string} [rollTerm=null] - An additional class name to apply to the dice icon.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async fadeDiceIcon(resultClass, rollResult, rollTerm = null) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    dieListItem.classList.add(rollTerm);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, ["not-visible"], {
      remove: true,
    });
  }

  /**
   * Fades a text element out, updates its content with a new roll result,
   * and then fades it back in.
   *
   * @param {string} resultClass - The class name of the result element whose text should be updated.
   * @param {number} rollResult - The new result to display within the text element.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async fadeTextInOut(resultClass, rollResult) {
    const resultSpan = this.element.querySelector(`li.${resultClass} span`);
    await transitionClass(resultSpan, ["not-visible"]);
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, ["not-visible"], {
      remove: true,
    });
  }
}
