/**
 * @import DWNarrativiumRoll from "../../rolls/narrativium-roll.mjs";
 * @import DWTraitRoll from "../../rolls/trait-roll.mjs";
 */

/**
 * A bunch of reused type definitions.
 *
 * @typedef {'gm' | 'player'} UserRoles
 * @typedef {'tie' | 'win' | null} OutcomeStatusOptions
 * @typedef {'winner' | 'loser' | 'tie' | null} OutcomeClassOptions
 * @typedef {"inactive" | "shift-center"} BaseRollClassOptions
 * @typedef {"not-visible" | null} RerollClassOptions
 * @typedef {"spell-roll" | null} SpellRollClassOptions
 *
 * @typedef {object} RollOutcome
 * @property {OutcomeStatusOptions} status
 * @property {UserRoles | null} winner
 * @property {number | null} difference
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
 * @property {SpellRollClassOptions} css.spell
 *
 * @typedef {object} MessageContext
 * @property {DWTraitRoll} [mainRoll]
 * @property {DWTraitRoll} [helpRoll]
 * @property {DWNarrativiumRoll} [gmRoll]
 * @property {DWNarrativiumRoll} [gmReroll]
 * @property {RollOutcome} outcome
 * @property {CssData} css
 */

export default class BaseMessageData extends foundry.abstract.TypeDataModel {
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
    if (!roll) console.warn("DiscworldMessage does not contain a Roll.");
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

  /**
   * Whether the chat message contains a Spell roll, to give custom styling.
   * @type {boolean}
   */
  get isSpell() {
    return this.rolls.some((roll) => roll.options.isSpell);
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
    const firstResult = roll.dice[0].results[0];
    firstResult.hidden = true; // Hide from DSN.
    await this.parent.update({ rolls: [...this.rolls, roll] }); // Add the roll to ChatMessage#rolls.

    firstResult.hidden = false; // Show via DSN.
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.
    await this.parent.animateRoll(roll);

    const chatData = await this._prepareContext();
    const content = await foundry.applications.handlebars.renderTemplate(
      this.template,
      chatData,
    );

    return this.parent.update({ content });
  }

  /* ------------------------------------------------- */

  /**
   * Prepare the context for rendering a chat message. Additionally,
   * prepare CSS data for styling the message based on the roll results.
   * @returns {Promise<MessageContext>}    The prepared context including Roll and CSS data.
   */
  async _prepareContext() {
    const { mainRoll, helpRoll, gmRoll, gmReroll } = this;
    const context = { mainRoll, helpRoll, gmRoll, gmReroll };
    context.outcome = this.outcome(context);
    context.css = this._prepareCssData(context);
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare CSS data for styling a chat message based on the roll results.
   * @param {Omit<MessageContext, "mainRoll" | "css">} context   The context to evaluate.
   * @returns {CssData}                                          The prepared CSS data.
   */
  _prepareCssData(context = {}) {
    const { helpRoll, gmRoll, gmReroll, outcome } = context;
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
        gm: this.outcomeClass("gm", outcome),
        player: this.outcomeClass("player", outcome),
      },
      spell: this.isSpell ? "spell-roll" : null,
    };
  }

  /* -------------------------------------------------- */

  /**
   * Evaluate the outcome of a test based on whether the player or GM/Narrativium won.
   * @param {Omit<MessageContext, "css" | "outcome">} context   The context to evaluate.
   * @param {number} [finalPlayerTotal]                         The final total of the player's roll.
   * @returns {RollOutcome}
   */
  outcome(context, finalPlayerTotal = null) {
    const {
      mainRoll = this.mainRoll,
      helpRoll = this.helpRoll,
      gmRoll = this.gmRoll,
      gmReroll = this.gmReroll,
    } = context;

    if (!gmRoll?.total) {
      return { status: null, winner: null, difference: null };
    }

    const finalGmTotal = gmReroll?.total ?? gmRoll?.total;
    if (!finalPlayerTotal) finalPlayerTotal = helpRoll?.total ?? mainRoll?.total;

    if (finalGmTotal === finalPlayerTotal) {
      return { status: "tie", winner: null, difference: 0 };
    }

    const gmWins = finalGmTotal > finalPlayerTotal;

    return {
      status: "win",
      winner: gmWins ? "gm" : "player",
      difference: Math.abs(finalGmTotal - finalPlayerTotal),
    };
  }

  /**
   * Get the class name for a given section of results.
   * @param {UserRoles} userRole      The user role to get the class for.
   * @param {RollOutcome} outcome     The outcome to get the class for.
   * @returns {OutcomeClassOptions}   The class name for the winner,
   *                                  or null if the role hasn't been evaluated.
   */
  outcomeClass(userRole, outcome) {
    const { status, winner } = outcome;

    if (!status) return null; // Opposed roll hasn't been fully evaluated.

    if (status === "tie") return "tie";
    return winner === userRole ? "winner" : "loser";
  }
}
