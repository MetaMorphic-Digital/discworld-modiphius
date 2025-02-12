import DWHelpRoll from "../rolls/help-roll.js";
import DWNarrativiumRoll from "../rolls/narrativium-roll.js";
import DWTraitRoll from "../rolls/trait-roll.js";
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

  /** @type {DWTraitRoll} */
  get mainRoll() {
    return this.rolls[0];
  }

  /** @type {DWHelpRoll | undefined} */
  get helpRoll() {
    return this.rolls.find((roll) => roll instanceof DWHelpRoll);
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmRoll() {
    return this.rolls.find(
      (roll) => roll instanceof DWNarrativiumRoll && !roll.options.reroll,
    );
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmReroll() {
    return this.rolls.find(
      (roll) => roll instanceof DWNarrativiumRoll && roll.options.reroll,
    );
  }

  /** @override */
  static async create(data) {
    const message = await super.create(data);
    if (!message.isRoll) return message;

    const chatData = await message._prepareContext();
    const content = await renderTemplate(message.mainRoll.template, chatData);
    return message.update({ ...data, content });
  }

  /** @override */
  async update(data) {
    const newRoll = data["roll++"]; // Special syntax for adding new rolls.
    if (!newRoll) return super.update(data);

    if (game.dice3d) await game.dice3d.showForRoll(newRoll, game.user, true); // Roll Dice So Nice if present.
    newRoll.dice[0].results[0].hidden = true; // Hide from DSN.

    await this.animateRoll(newRoll);

    const chatDataOverrides = {};
    switch (true) {
      case newRoll instanceof DWHelpRoll:
        chatDataOverrides.helpRoll = newRoll;
        break;

      case newRoll instanceof DWNarrativiumRoll: {
        const rollKey = newRoll.options.reroll ? "gmReroll" : "gmRoll";
        chatDataOverrides[rollKey] = newRoll;
        break;
      }

      default:
        break;
    }

    const chatData = await this._prepareContext(chatDataOverrides);
    const content = await renderTemplate(this.mainRoll.template, chatData);

    // Remove key containing our special syntax, by using Foundry's special syntax,
    // so as to not pass this property on to the `super` call.
    const strippedData = foundry.utils.mergeObject(
      data,
      { "-=roll++": null },
      { performDeletions: true },
    );
    return super.update({
      ...strippedData,
      content,
      rolls: [...this.rolls, newRoll],
    });
  }

  async _prepareContext(dataOverrides = {}) {
    const { mainRoll, helpRoll, gmRoll, gmReroll } = this;
    const rollData = {
      mainRoll,
      helpRoll,
      gmRoll,
      gmReroll,
    };
    const context = foundry.utils.mergeObject(rollData, dataOverrides);

    context.css = this._prepareCssData(context);

    return context;
  }

  /**
   * @typedef {'gm' | 'player'} UserRoles
   * @typedef {object} RollContext - The context to evaluate.
   * @property {DWTraitRoll} [mainRoll]
   * @property {DWHelpRoll} [helpRoll]
   * @property {DWNarrativiumRoll} [gmRoll]
   * @property {DWNarrativiumRoll} [gmReroll]
   */

  /**
   *
   * @param {RollContext} [context] - The context to evaluate.
   * @returns {object} - The prepared CSS data.
   */
  _prepareCssData(context = {}) {
    /**
     * Get the class name for a given section of results.
     *
     * @param {UserRoles} userRole - The user role to get the class for.
     * @returns {"winner"|"loser"|"tie"|null} - The class name for the winner,
     *                                    or null if the role hasn't been evaluated.
     */
    const outcomeClass = (userRole) => {
      const { status, winner } = this.outcome(context);

      if (!status) return null; // Opposed roll hasn't been fully evaluated.

      if (status === "tie") return "tie";
      return winner === userRole ? "winner" : "loser";
    };

    const { helpRoll, gmRoll, gmReroll } = context;

    return {
      buttonDisabled: {
        help: helpRoll?.result,
        narrativium: gmReroll?.result,
      },
      rerollButton: gmRoll?.result ? "reroll" : null,
      result: {
        player: helpRoll?.result ? "inactive" : "shift-center",
        help: helpRoll?.result ? null : "not-visible",
        gm: gmReroll?.result ? "inactive" : "shift-center",
        gmReroll: gmReroll?.result ? null : "not-visible",
      },
      outcome: {
        gm: outcomeClass("gm"),
        player: outcomeClass("player"),
      },
    };
  }

  /**
   * Evaluate the outcome of a test based on whether the
   * player or GM/Narrativium won.
   *
   * @param {RollContext} [context] - The context to evaluate.
   * @returns {{
   *             status: "tie" | "win" | null,
   *             winner: UserRoles | null
   *          }}
   *          - An object with `status` and `winner` properties.
   */
  outcome({
    mainRoll = this.mainRoll,
    helpRoll = this.helpRoll,
    gmRoll = this.gmRoll,
    gmReroll = this.gmReroll,
  } = {}) {
    if (!gmRoll?.total) {
      return { status: null, winner: null };
    }

    const finalGmTotal = gmReroll?.total ?? gmRoll?.total;
    const finalPlayerTotal = helpRoll?.total ?? mainRoll?.total;

    if (finalGmTotal === finalPlayerTotal) {
      return { status: "tie", winner: null };
    }

    const gmWins = finalGmTotal > finalPlayerTotal;

    return {
      status: "win",
      winner: gmWins ? "gm" : "player",
    };
  }

  /* ---------------- Animation Helpers --------------- */

  async animateRoll(roll) {
    switch (true) {
      case roll instanceof DWHelpRoll:
        await this.animateHelp(roll);
        break;

      case roll instanceof DWNarrativiumRoll: {
        await this.animateNarrativium(roll);
        break;
      }

      default:
        break;
    }
  }

  async animateHelp(roll) {
    // Slide parent roll icon left. (We're technically sliding it back from the right).
    await this.slideDiceIcon("playerResult");
    // Fade in reroll result/icon.
    await this.fadeDiceIcon("helpResult", roll.result, roll.term);
  }

  async animateNarrativium(roll) {
    const { reroll } = roll.options;
    if (reroll) {
      // Slide parent roll icon left. (We're technically sliding it back from the right).
      await this.slideDiceIcon("gmResult");
      // Fade in reroll result/icon.
      await this.fadeDiceIcon("gmRerollResult", roll.result); // Fade result
    } else {
      // Fade question mark out / new result in.
      await this.fadeTextInOut("gmResult", roll.result);
    }
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
