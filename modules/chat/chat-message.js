import DWHelpRoll from "../rolls/help-roll.js";
import DWNarrativiumRoll from "../rolls/narrativium-roll.js";
import DWTraitRoll from "../rolls/trait-roll.js";
import transitionClass from "../utils/animations.js";

/**
 * Discworld chat message class.
 * @extends ChatMessage
 */
export default class DiscworldMessage extends ChatMessage {
  /** @type {HTMLElement} The message element from the chat log. */
  get element() {
    const chatLog = document.getElementById("chat");
    return chatLog.querySelector(`li[data-message-id="${this.id}"]`);
  }

  /** @type {DWTraitRoll} */
  get mainRoll() {
    return this.rolls[0] || null;
  }

  /** @type {DWHelpRoll | undefined} */
  get helpRoll() {
    return this.rolls.find((roll) => roll instanceof DWHelpRoll) || null;
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmRoll() {
    return (
      this.rolls.find(
        (roll) => roll instanceof DWNarrativiumRoll && !roll.options.reroll,
      ) || null
    );
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmReroll() {
    return (
      this.rolls.find(
        (roll) => roll instanceof DWNarrativiumRoll && roll.options.reroll,
      ) || null
    );
  }

  /**
   * Intercept creation of chat message to inject the roll template,
   * if applicable.
   *
   * @override
   * @param {object} data - The chat message data.
   * @returns {Promise<DiscworldMessage>}
   */
  static async create(data) {
    const message = new DiscworldMessage(data);
    if (!(message.mainRoll instanceof DWTraitRoll))
      return super.create(message);

    const chatData = await message._prepareContext();
    const content = await renderTemplate(message.mainRoll.template, chatData);
    return super.create({ ...data, content });
  }

  /**
   * Add a roll to the chat message. Animate the 3d dice (if present),
   * animate the chat message, finally, update the database.
   *
   * @override
   * @param {DWHelpRoll | DWNarrativiumRoll} roll - The roll to add.
   * @returns {Promise<DiscworldMessage>}
   */
  async addRoll(roll) {
    // Creating an update to `ChatMessage#rolls` (as we do in this function) triggers a DiceSoNice animation.
    // However, the dice animation and the chat animation must happen before the database update (which occurs last).
    // So, we manually trigger it first, using DiceSoNice's API and *then* hide the dice from DSN, so it doesn't get
    // triggered a 2nd time when the chat message is updated.
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.
    roll.dice[0].results[0].hidden = true; // Hide from DSN.

    await this.animateRoll(roll);

    const chatDataOverrides = {};
    switch (true) {
      case roll instanceof DWHelpRoll:
        chatDataOverrides.helpRoll = roll;
        break;

      case roll instanceof DWNarrativiumRoll: {
        const rollKey = roll.options.reroll ? "gmReroll" : "gmRoll";
        chatDataOverrides[rollKey] = roll;
        break;
      }

      default:
        break;
    }

    const chatData = await this._prepareContext(chatDataOverrides);
    const content = await renderTemplate(this.mainRoll.template, chatData);

    return this.update({
      content,
      rolls: [...this.rolls, roll],
    });
  }

  /* -------------------------------------------------- */

  /**
   * A bunch of reused type definitions.
   *
   * @typedef {'gm' | 'player'} UserRoles
   * @typedef {'winner' | 'loser' | 'tie' | null} OutcomeClassOptions
   * @typedef {"inactive" | "shift-center"} BaseRollClassOptions
   * @typedef {"not-visible" | null} RerollClassOptions
   *
   * @typedef {object} RollContext
   * @property {DWTraitRoll} [mainRoll]
   * @property {DWHelpRoll} [helpRoll]
   * @property {DWNarrativiumRoll} [gmRoll]
   * @property {DWNarrativiumRoll} [gmReroll]
   *
   * @typedef {object} CssData
   * @property {object} css.buttonDisabled
   * @property {boolean} css.buttonDisabled.help
   * @property {boolean} css.buttonDisabled.narrativium
   * @property {"reroll" | null} css.rerollButton
   * @property {object} css.result
   * @property {BaseRollClassOptions} css.result.player
   * @property {RerollClassOptions} css.result.help
   * @property {BaseRollClassOptions} css.result.gm
   * @property {RerollClassOptions} css.result.gmReroll
   * @property {object} css.outcome
   * @property {OutcomeClassOptions} css.outcome.gm
   * @property {OutcomeClassOptions} css.outcome.player
   *
   * @typedef {RollContext & {css: CssData}} MessageContext
   */

  /**
   * Prepare the context for rendering a chat message by merging roll data
   * with any provided overrides. Additionally, prepare CSS data for styling
   * the message based on the roll results.
   *
   * @param {RollContext} [dataOverrides={}] - Roll data for a Roll which has not yet been added
   *                                      to `ChatMessage#rolls`,but will be on next render.
   * @returns {Promise<MessageContext>} - The prepared context including Roll and CSS data.
   */
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
   * Prepare CSS data for styling a chat message based on the roll results.
   *
   * @param {RollContext} [context = {}] - The context to evaluate.
   * @returns {CssData} - The prepared CSS data.
   */
  _prepareCssData(context = {}) {
    /**
     * Get the class name for a given section of results.
     *
     * @param {UserRoles} userRole - The user role to get the class for.
     * @returns {OutcomeClassOptions} - The class name for the winner,
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
        help: helpRoll?._evaluated,
        narrativium: gmReroll?._evaluated,
      },
      rerollButton: gmRoll?._evaluated ? "reroll" : null,
      result: {
        player: helpRoll?._evaluated ? "inactive" : "shift-center",
        help: helpRoll?._evaluated ? null : "not-visible",
        gm: gmReroll?._evaluated ? "inactive" : "shift-center",
        gmReroll: gmReroll?._evaluated ? null : "not-visible",
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

  /**
   * Delegates chat animation of a roll result, based on the type of roll.
   *
   * @param {DWHelpRoll | DWNarrativiumRoll} roll - The roll to animate.
   * @returns {Promise<void>} gagadd
   */
  async animateRoll(roll) {
    if (roll instanceof DWHelpRoll) return this.animateHelp(roll);
    return this.animateNarrativium(roll);
  }

  /**
   * Handles animation of a Help roll.
   *
   * @param {DWHelpRoll} roll - The roll to animate.
   * @returns {Promise<void>}
   */
  async animateHelp(roll) {
    await this.slideDiceIcon("playerResult");
    await this.fadeDiceIcon("helpResult", roll.result, roll.term);
  }

  /**
   * Handles animation of a Narrativium roll, whether it's regular or reroll.
   *
   * @param {DWNarrativiumRoll} roll - The roll to animate.
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

  /**
   * Slide the dice icon of a given class name to over from the center of its container.
   *
   * @param {"playerResult" | "gmResult"} resultClass - The class name of the roll whose icon should be moved.
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
   * @param {"helpResult" | "gmRerollResult"} resultClass - The class name of the roll whose icon should be faded.
   * @param {number} rollResult - The new result to display.
   * @param {"d4" | "d6" | "d10" | "d12"} [rollTerm=null] - An additional class name to apply to the dice icon.
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
   * @param {"gmResult"} resultClass - The class name of the result element whose text should be updated.
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
