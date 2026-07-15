import transitionClass from "../utils/animations.mjs";

/**
 * @import DWTraitRoll from "../rolls/trait-roll.mjs";
 * @import DWNarrativiumRoll from "../rolls/narrativium-roll.mjs";
 */

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
   * @param {DWTraitRoll | DWNarrativiumRoll} roll   The roll to animate.
   * @returns {Promise<void>}
   */
  async animateRoll(roll) {
    if (roll.isHelpRoll) return this.animateHelp(roll);
    return this.animateNarrativium(roll);
  }

  /* -------------------------------------------------- */

  /**
   * Handles animation of a Help roll.
   * @param {DWTraitRoll} roll   The roll to animate.
   * @returns {Promise<void>}
   */
  async animateHelp(roll) {
    const { groupMember } = roll.options;
    await this.slideDiceIcon("playerResult", groupMember);
    await this.fadeDiceIcon("helpResult", roll.result, roll.term, groupMember);
  }

  /* -------------------------------------------------- */

  /**
   * Handles animation of a Narrativium roll, whether it's regular or reroll.
   * @param {DWNarrativiumRoll} roll    The roll to animate.
   * @returns {Promise<void>}
   */
  async animateNarrativium(roll) {
    // Don't need to pass groupMember because Narrativium is never a group roll.
    const { reroll } = roll.options;
    if (reroll) {
      await this.slideDiceIcon("gmResult");
      await this.fadeDiceIcon("gmRerollResult", roll.result);
    } else {
      await this.fadeTextInOut("gmResult", roll.result);
    }
  }

  /* ------------------------------------------------- */

  /**
   * Returns the element that should be animated.
   * @param {string} resultClass      The class name of the result element whose text should be updated.
   * @param {string} [groupMember]    The id for the member whose roll is being animated.
   * @returns {HTMLElement}
   */
  getAnimationTarget(resultClass, groupMember = null) {
    let selector = `li.${resultClass}`;
    if (groupMember) selector = `li[data-member-id="${groupMember}"] ${selector}`;
    return this.element.querySelector(selector);
  }

  /* -------------------------------------------------- */

  /**
   * Slide the dice icon of a given class name to over from the center of its container.
   * @param {"playerResult" | "gmResult"} resultClass   The class name of the roll whose icon should be moved.
   * @param {string} [groupMember]                      The id for the member whose roll is being animated.
   * @returns {Promise<HTMLLIElement>}                  A promise that resolves to the transitioning element
   *                                                    once the transition has ended.
   */
  async slideDiceIcon(resultClass, groupMember) {
    const target = this.getAnimationTarget(resultClass, groupMember);
    return transitionClass(target, {
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
   * @param {string} [groupMember]                                  The id for the member whose roll is being animated.
   * @returns {Promise<HTMLLIElement>}                              A promise that resolves to the transitioning element
   *                                                                once the transition has ended.
   */
  async fadeDiceIcon(resultClass, rollResult, rollTerm = null, groupMember) {
    const target = this.getAnimationTarget(resultClass, groupMember);
    target.classList.add(rollTerm);
    const rerollResultText = target.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(target, { remove: ["not-visible"] });
  }

  /* -------------------------------------------------- */

  /**
   * Fades a text element out, updates its content with a new roll result, and then fades it back in.
   * @param {"gmResult"} resultClass        The class name of the result element whose text should be updated.
   * @param {number} rollResult             The new result to display within the text element.
   * @param {string} [groupMember]          The id for the member whose roll is being animated.
   * @returns {Promise<HTMLSpanElement>}    A promise that resolves to the transitioning element
   *                                        once the transition has ended.
   */
  async fadeTextInOut(resultClass, rollResult, groupMember) {
    const target = this.getAnimationTarget(resultClass, groupMember).querySelector("span");
    await transitionClass(target, { add: ["not-visible"] });
    target.textContent = rollResult;
    return transitionClass(target, { remove: ["not-visible"] });
  }
}
