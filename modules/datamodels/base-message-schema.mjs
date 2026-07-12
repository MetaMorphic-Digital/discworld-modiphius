import DWHelpRoll from "../rolls/help-roll.mjs";
import DWNarrativiumRoll from "../rolls/narrativium-roll.mjs";

export default class BaseMessageSchema extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {};
  }

  get rolls() {
    return this.parent.rolls;
  }

  get template() {
    return this.mainRoll?.template;
  }

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
   * @type {DWHelpRoll | null}
   */
  get helpRoll() {
    return this.rolls.find((roll) => roll instanceof DWHelpRoll) || null;
  }

  /* -------------------------------------------------- */

  /**
   * The first Narrativium roll of the chat message (null if Narrativium has not been rolled).
   * @type {DWNarrativiumRoll | null}
   */
  get gmRoll() {
    return (
      this.rolls.find(
        (roll) => (roll instanceof DWNarrativiumRoll) && !roll.options.reroll,
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
        (roll) => (roll instanceof DWNarrativiumRoll) && roll.options.reroll,
      ) || null
    );
  }

  /* -------------------------------------------------- */

  /**
   * Add a roll to the chat message. Animate the 3d dice (if present),
   * animate the chat message, finally, update the database.
   * @param {DWHelpRoll | DWNarrativiumRoll} roll   The roll to add.
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
      case roll instanceof DWHelpRoll:
        chatDataOverrides.helpRoll = roll;
        break;

      case roll instanceof DWNarrativiumRoll:
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
   * @param {RollContext} [dataOverrides={}]    Roll data for a Roll which has not yet been added
   *                                            to `ChatMessage#rolls`,but will be on next render.
   * @returns {Promise<MessageContext>}         The prepared context including Roll and CSS data.
   */
  async _prepareContext(dataOverrides = {}) {
    const { mainRoll, helpRoll, gmRoll, gmReroll } = this;
    const rollData = {
      mainRoll,
      helpRoll,
      gmRoll,
      gmReroll,
    };

    const context = Object.assign(rollData, dataOverrides);
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
    /**
     * Get the class name for a given section of results.
     *
     * @param {UserRoles} userRole      The user role to get the class for.
     * @returns {OutcomeClassOptions}   The class name for the winner,
     *                                  or null if the role hasn't been evaluated.
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

  /* -------------------------------------------------- */

  /**
   * Evaluate the outcome of a test based on whether the player or GM/Narrativium won.
   * @param {RollContext} [context]   The context to evaluate.
   * @returns {{ status: "tie" | "win" | null, winner: UserRoles | null }}
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
}
