/**
 * @import DWNarrativiumRoll from "../../rolls/narrativium-roll.mjs";
 * @import DWTraitRoll from "../../rolls/trait-roll.mjs";
 */

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
 * @property {DWTraitRoll} [helpRoll]
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

export default class BaseMessageData extends foundry.abstract.TypeDataModel {

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------------- */

  /**
   * The rolls in the parent ChatMessage.
   * @type {Array<DWTraitRoll | DWNarrativiumRoll>}
   */
  get rolls() {
    return this.parent.rolls;
  }

  /* -------------------------------------------------- */

  /**
   * The template to use for the `content` of the parent ChatMessage.
   * @type {string}
   */
  get template() {
    return this.mainRoll?.template;
  }

  /* -------------------------------------------------- */

  /**
   * The main roll of the chat message (null if message is not a Roll type).
   * @type {DWTraitRoll}
   * @throws    If the message does not contain a roll.
   */
  get mainRoll() {
    const roll = this.rolls[0];
    if (!roll) throw new Error("DiscworldMessage does not contain a Roll.");
    return roll;
  }

  /* -------------------------------------------------- */

  /**
   * The help roll of the chat message (null if Help has not been rolled).
   * @type {DWTraitRoll | null}
   */
  get helpRoll() {
    return this.rolls.find((roll) => roll.isHelpRoll) || null;
  }

  /* -------------------------------------------------- */

  /**
   * The first Narrativium roll of the chat message (null if Narrativium has not been rolled).
   * @type {DWNarrativiumRoll | null}
   */
  get gmRoll() {
    return (
      this.rolls.find(
        (roll) => (roll instanceof discworld.rolls.DWNarrativiumRoll) && !roll.options.reroll,
      ) || null
    );
  }

  /* -------------------------------------------------- */

  /**
   * The second (reroll) Narrativium roll of the chat message (null if Narrativium has not been re-rolled).
   * @type {DWNarrativiumRoll | null}
   */
  get gmReroll() {
    return (
      this.rolls.find(
        (roll) => (roll instanceof discworld.rolls.DWNarrativiumRoll) && roll.options.reroll,
      ) || null
    );
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if ((data.type !== "groupTest") && (!this.parent.rolls.length || !(this.parent.rolls[0] instanceof discworld.rolls.DWTraitRoll)))
      return;

    const chatData = await this._prepareContext();
    const content = await foundry.applications.handlebars.renderTemplate(
      this.template,
      chatData,
    );

    foundry.utils.mergeObject(data, { content });
  }

  /* -------------------------------------------------- */

  /**
   * Add a roll to the chat message. Animate the 3d dice (if present),
   * animate the chat message, finally, update the database.
   * @param {DWTraitRoll | DWNarrativiumRoll} roll   The roll to add.
   * @returns {Promise<DiscworldMessage>}
   */
  async addRoll(roll) {
    if (!roll._evaluated) {
      throw new Error("Cannot add an unevaluated roll");
    }

    // Creating an update to `ChatMessage#rolls` (as we do in this function) triggers a DiceSoNice animation.
    // However, the dice animation and the chat animation must happen before the database update (which occurs last).
    // So, we manually trigger it first, using DiceSoNice's API and *then* hide the dice from DSN, so it doesn't get
    // triggered a 2nd time when the chat message is updated.
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.
    roll.dice[0].results[0].hidden = true; // Hide from DSN.

    await this.parent.animateRoll(roll);

    const chatDataOverrides = {};
    switch (true) {
      case (roll instanceof discworld.rolls.DWTraitRoll) && !roll.isHelpRoll:
        Object.assign(chatDataOverrides, { [roll.options.groupMember]: { mainRoll: roll } });
        break;

      case (roll instanceof discworld.rolls.DWTraitRoll) && roll.isHelpRoll:
        chatDataOverrides.helpRoll = roll;
        Object.assign(chatDataOverrides, { [roll.options.groupMember]: { helpRoll: roll } });
        break;

      case roll instanceof discworld.rolls.DWNarrativiumRoll:
        chatDataOverrides[roll.options.reroll ? "gmReroll" : "gmRoll"] = roll;
        break;

      default:
        break;
    }

    const chatData = await this._prepareContext(chatDataOverrides);
    const content = await foundry.applications.handlebars.renderTemplate(
      this.template,
      chatData,
    );

    return this.parent.update({
      content,
      rolls: [...this.rolls, roll],
    });
  }

  /* ------------------------------------------------- */

  /**
   * Prepare the context for rendering a chat message by merging roll data
   * with any provided overrides. Additionally, prepare CSS data for styling
   * the message based on the roll results.
   * @param {RollContext} [dataOverrides]    Roll data for a Roll which has not yet been added
   *                                         to `ChatMessage#rolls`, but will be on next render.
   * @returns {Promise<MessageContext>}      The prepared context including Roll and CSS data.
   */
  async _prepareContext(dataOverrides = {}) {
    const { mainRoll, helpRoll, gmRoll, gmReroll } = this;
    const context = {
      mainRoll,
      helpRoll,
      gmRoll,
      gmReroll,
    };

    // Apply overrides to existing roll data.
    Object.assign(context, dataOverrides);
    context.css = this._prepareCssData(context);

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare CSS data for styling a chat message based on the roll results.
   * @param {RollContext} [context = {}]    The context to evaluate.
   * @returns {CssData}                     The prepared CSS data.
   */
  _prepareCssData(context = {}) {
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
        gm: this.outcomeClass("gm", context),
        player: this.outcomeClass("player", context),
      },
    };
  }

  /* -------------------------------------------------- */

  /**
   * Evaluate the outcome of a test based on whether the player or GM/Narrativium won.
   * @param {RollContext} context   The context to evaluate.
   * @returns {{ status: "tie" | "win" | null, winner: UserRoles | null }}
   */
  outcome(context) {
    const {
      mainRoll = this.mainRoll,
      helpRoll = this.helpRoll,
      gmRoll = this.gmRoll,
      gmReroll = this.gmReroll,
    } = context;

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

  /**
   * Get the class name for a given section of results.
   * @param {UserRoles} userRole      The user role to get the class for.
   * @param {RollContext} context     The context to evaluate.
   * @returns {OutcomeClassOptions}   The class name for the winner,
   *                                  or null if the role hasn't been evaluated.
   */
  outcomeClass(userRole, context) {
    const { status, winner } = this.outcome(context);

    if (!status) return null; // Opposed roll hasn't been fully evaluated.

    if (status === "tie") return "tie";
    return winner === userRole ? "winner" : "loser";
  }
}
