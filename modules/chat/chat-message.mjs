import DWHelpRoll from "../rolls/help-roll.mjs";
import transitionClass from "../utils/animations.mjs";

/**
 * Discworld chat message class.
 * @extends ChatMessage
 */
export default class DiscworldMessage extends foundry.documents.ChatMessage {
  /**
   * The message element from the chat log (null if message isn't rendered).
   * @type {HTMLLIElement | null}
   */
  get element() {
    const chatLog = document.getElementById("chat");
    return chatLog.querySelector(`li[data-message-id="${this.id}"]`);
  }

  /* -------------------------------------------------- */
  /*   Animation Helpers                                */
  /* -------------------------------------------------- */

  /**
   * Delegates chat animation of a roll result, based on the type of roll.
   * @param {DWHelpRoll | DWNarrativiumRoll} roll   The roll to animate.
   * @returns {Promise<void>}
   */
  async animateRoll(roll) {
    if (roll instanceof DWHelpRoll) return this.animateHelp(roll);
    return this.animateNarrativium(roll);
  }

  /* -------------------------------------------------- */

  /**
   * Handles animation of a Help roll.
   * @param {DWHelpRoll} roll   The roll to animate.
   * @returns {Promise<void>}
   */
  async animateHelp(roll) {
    await this.slideDiceIcon("playerResult");
    await this.fadeDiceIcon("helpResult", roll.result, roll.term);
  }

  /* -------------------------------------------------- */

  /**
   * Handles animation of a Narrativium roll, whether it's regular or reroll.
   * @param {DWNarrativiumRoll} roll    The roll to animate.
   * @returns {Promise<void>}
   */
  async animateNarrativium(roll) {
    const { reroll } = roll.options;
    if (reroll) {
      await this.slideDiceIcon("gmResult");
      await this.fadeDiceIcon("gmRerollResult", roll.result);
    } else {
      await this.fadeTextInOut("gmResult", roll.result);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Slide the dice icon of a given class name to over from the center of its container.
   * @param {"playerResult" | "gmResult"} resultClass   The class name of the roll whose icon should be moved.
   * @returns {Promise<HTMLLIElement>}                  A promise that resolves to the transitioning element
   *                                                    once the transition has ended.
   */
  async slideDiceIcon(resultClass) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    return transitionClass(dieListItem, {
      remove: ["shift-center"],
      add: ["inactive"],
    });
  }

  /* -------------------------------------------------- */

  /**
   * Fade in the dice icon of a given class name.
   * @param {"helpResult" | "gmRerollResult"} resultClass           The class name of the roll whose icon should be faded.
   * @param {number} rollResult                                     The new result to display.
   * @param {"d4" | "d6" | "d10" | "d12" | null} [rollTerm=null]    An additional class name to apply to the dice icon.
   * @returns {Promise<HTMLLIElement>}                              A promise that resolves to the transitioning element
   *                                                                once the transition has ended.
   */
  async fadeDiceIcon(resultClass, rollResult, rollTerm = null) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    dieListItem.classList.add(rollTerm);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, { remove: ["not-visible"] });
  }

  /* -------------------------------------------------- */

  /**
   * Fades a text element out, updates its content with a new roll result, and then fades it back in.
   * @param {"gmResult"} resultClass        The class name of the result element whose text should be updated.
   * @param {number} rollResult             The new result to display within the text element.
   * @returns {Promise<HTMLSpanElement>}    A promise that resolves to the transitioning element
   *                                        once the transition has ended.
   */
  async fadeTextInOut(resultClass, rollResult) {
    const resultSpan = this.element.querySelector(`li.${resultClass} span`);
    await transitionClass(resultSpan, { add: ["not-visible"] });
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, { remove: ["not-visible"] });
  }
}
