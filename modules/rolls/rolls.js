/**
 * @extends Roll
 */
export default class DiscworldRoll extends Roll {
  /**
   * @typedef {"d4"|"d6"|"d10"|"d12"} DiceTermOptions
   */
  /**
   * Creates a new DiscworldRoll instance.
   *
   * @param {DiceTermOptions} formula - The dice formula to evaluate.
   * @param {object} data - An object the roll uses to evaluate (see Foundry docs).
   * @param {object} options - An object with additional options.
   * @param {DiscworldCharacter} options.actor - The Actor being rolled for.
   * @param {Item} options.trait - The Item being rolled.
   * @param {number} [options.gmResult] - The GM/Narrativium result.
   * @param {number} [options.gmRerollResult] - The GM's rerolled result.
   * @param {number} [options.helpResult] - The result of help.
   * @param {DiceTermOptions} [options.helpTerm] - The dice term used to roll help.
   * @param {Item} [options.helpTrait] - The Trait used to help.
   * @param {DiscworldCharacter} [options.helpActor] - The Actor that is offering help.
   */
  constructor(formula, data, options = {}) {
    super(formula, data, options);
    this.template = options.template || this.constructor.DEFAULT_TEMPLATE;
  }

  static DEFAULT_TEMPLATE = "systems/discworld/templates/roll-card.hbs";

  /** @type {DiscworldCharacter} The Actor that initiated the roll. */
  get actor() {
    return this.options.actor;
  }

  /** @type {Item} The Trait used for this roll. */
  get trait() {
    return this.options.trait;
  }

  /**
   * @typedef {{
   *            gm: {primary: number|null, reroll: number|null},
   *            player: {primary: number|null, help: number|null}
   *          }} ResultsData
   */
  /**
   * Organized data about the results of all rolls.
   * @type {ResultsData}
   */
  get results() {
    const { options = {} } = this;
    return {
      gm: {
        primary: parseInt(options.gmResult) || null,
        reroll: parseInt(options.gmRerollResult) || null,
      },
      player: {
        primary: parseInt(this.result),
        help: parseInt(options.helpResult) || null,
      },
    };
  }

  /**
   * @typedef {{
   *            actor: DiscworldCharacter,
   *            trait: Item,
   *            result: number,
   *            term: string
   *          }} HelpData
   */
  /** @type {HelpData} - Organized data about the Help roll. */
  get help() {
    const { options = {} } = this;
    return {
      actor: options.helpActor || null,
      trait: options.helpTrait || null,
      result: parseInt(options.helpResult) || null,
      term: options.helpTerm || null,
    };
  }

  /**
   * Evaluate the outcome of a test based on whether the
   * player or GM/Narrativium won.
   * @type {{
   *           status: "tie" | "win" | null,
   *           winner: "gm" | "player" | null
   *       }}
   *     - An object with `status` and `winner` properties.
   */
  get outcome() {
    const { results } = this;

    if (!results.gm.primary) {
      return { status: null, winner: null };
    }

    const finalGmResult = results.gm.reroll ?? results.gm.primary;
    const finalPlayerResult = results.player.help ?? results.player.primary;

    if (finalGmResult === finalPlayerResult) {
      return { status: "tie", winner: null };
    }

    const gmWins = finalGmResult > finalPlayerResult;

    return {
      status: "win",
      winner: gmWins ? "gm" : "player",
    };
  }

  /**
   * Create a base Trait roll.
   *
   * @param {DiceTermOptions} formula - The roll formula.
   * @param {object} [options] - The options to pass to the `DiscworldRoll` constructor.
   *                             See `constructor` above and the Foundry API.
   * @returns {Promise<DiscworldMessage>} A promise that resolves to the chat message.
   */
  static async createBaseRoll(formula, options) {
    const rollData = options.actor?.getRollData() ?? {};
    const roll = new DiscworldRoll(formula, rollData, options);

    const flavor = game.i18n.localize("DISCWORLD.roll.traitRoll");
    return roll.toMessage({
      // eslint-disable-next-line no-undef
      speaker: getDocumentClass("ChatMessage").getSpeaker(),
      flavor,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Create a Narrativium (GM) roll, and update the parent message
   * with the result.
   *
   * @param {object} options
   * @param {DiscworldMessage} options.message - The chat message to update.
   * @param {boolean} [options.reroll=false] - Whether this is a reroll.
   * @returns {Promise<DiscworldMessage|null>} A promise that resolves to the updated chat message.
   */
  static async createNarrativiumRoll({ message, reroll = false } = {}) {
    // Determine the type of narrativium roll (regular or reroll).
    const resultKey = reroll ? "results.gm.reroll" : "results.gm.primary";
    const [parentRoll] = message.rolls;
    if (foundry.utils.getProperty(parentRoll, resultKey)) return null;
    // Create Narrativium roll and show 3d dice if DSN installed.
    const roll = await new Roll("d8").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    // Update parent roll options with the Narrativium result.
    const optionsKey = reroll ? "gmRerollResult" : "gmResult";
    parentRoll.options[optionsKey] = roll.result;

    // Prepare chat data with updated info.
    const chatData = parentRoll.prepareChatMessageContext();
    const content = await renderTemplate(parentRoll.template, chatData);

    if (!reroll) {
      // Fade question mark out / new result in.
      await message.fadeTextInOut("gmResult", roll.result);
    }

    if (reroll) {
      // Slide parent roll icon left. (We're technically sliding it back from the right).
      await message.slideDiceIcon("gmResult");
      // Fade in reroll result/icon.
      await message.fadeDiceIcon("gmRerollResult", roll.result); // Fade result
    }

    return message.update({ content, rolls: [parentRoll] });
  }

  /**
   * Create a help roll, and update the parent message with the result.
   *
   * @param {object} options
   * @param {DiceTermOptions} options.diceTerm - The term to be rolled.
   * @param {Item} options.trait - The trait associated with this roll.
   * @param {DiscworldMessage} options.message - The chat message to update.
   * @returns {Promise<DiscworldMessage|null>} A promise that resolves to the updated chat message.
   */
  static async createHelpRoll({ diceTerm, trait, message } = {}) {
    const [parentRoll] = message.rolls;
    if (parentRoll.helpResult) return null;

    const helpRoll = await new Roll(diceTerm).evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(helpRoll, game.user, true); // Roll Dice So Nice if present.

    // Get the parent roll and update it with the Narrativium result.
    const helpResult = helpRoll.result;
    const helpTerm = helpRoll.dice[0].denomination;
    parentRoll.options.helpResult = helpResult;
    parentRoll.options.helpTerm = helpTerm;
    parentRoll.options.helpTrait = trait;
    parentRoll.options.helpActor = trait.actor;

    // Prepare chat data with updated info.
    const chatData = parentRoll.prepareChatMessageContext();
    const content = await renderTemplate(parentRoll.template, chatData);

    // Slide parent roll icon left. (We're technically sliding it back from the right).
    await message.slideDiceIcon("playerResult");
    // Fade in reroll result/icon.
    await message.fadeDiceIcon("helpResult", helpResult, helpTerm);

    return message.update({ content, rolls: [parentRoll] });
  }

  /**
   * @typedef {object} ChatMessageContext
   * @prop {DiscworldCharacter} actor
   * @prop {Item} trait
   * @prop {ResultsData} results
   * @prop {HelpData} help
   * @prop {DiceTermOptions} term
   * @prop {object} buttonDisabled
   * @prop {boolean} buttonDisabled.help
   * @prop {boolean} buttonDisabled.narrativium
   * @prop {object} cssClass
   * @prop {"reroll"|null} cssClass.rerollButton
   * @prop {object} cssClass.results
   * @prop {"inactive"|"shift-center"} cssClass.results.player
   * @prop {"not-visible"|null} cssClass.results.help
   * @prop {"inactive"|"shift-center"} cssClass.results.gm
   * @prop {"not-visible"|null} cssClass.results.gmReroll
   * @prop {object} cssClass.outcome
   * @prop {"winner"|"loser"|"tie"|null} cssClass.outcome.player
   * @prop {"winner"|"loser"|"tie"|null} cssClass.outcome.gm
   */
  /**
   * Prepare data for chat message rendering.
   * @returns {ChatMessageContext}
   */
  prepareChatMessageContext() {
    /**
     * Get the class name for a given section of results.
     *
     * @param {"gm"|"player"} userRole - The user role to get the class for.
     * @returns {"winner"|"loser"|"tie"|null} - The class name for the winner,
     *                                    or null if the role hasn't been evaluated.
     */
    const outcomeClass = (userRole) => {
      const { status, winner } = this.outcome;

      if (!status) return null; // Opposed roll hasn't been fully evaluated.

      if (status === "tie") return "tie";
      return winner === userRole ? "winner" : "loser";
    };

    const { actor, trait, results, help } = this;
    const { gm, player } = results;

    return {
      actor,
      trait,
      results,
      help,
      term: this.dice[0].denomination,
      buttonDisabled: {
        help: player.help,
        narrativium: gm.reroll,
      },
      cssClass: {
        rerollButton: gm.primary ? "reroll" : null,
        results: {
          player: player.help ? "inactive" : "shift-center",
          help: player.help ? null : "not-visible",
          gm: gm.reroll ? "inactive" : "shift-center",
          gmReroll: gm.reroll ? null : "not-visible",
        },
        outcome: {
          gm: outcomeClass("gm"),
          player: outcomeClass("player"),
        },
      },
    };
  }

  /**
   * Renders the chat message with an the specific context,
   * derived from the roll data.
   *
   * @override
   * @param {object} [messageData={}] - The message data to render.
   * @param {object} [options={}] - Additional options to pass to the Roll#toMessage method.
   * @returns {Promise<DiscworldMessage>} The rendered chat message.
   */
  async toMessage(messageData = {}, options = {}) {
    if (!this._evaluated) await this.evaluate();

    const chatData = this.prepareChatMessageContext();
    const content = await renderTemplate(this.template, chatData);

    // Assign content if not already defined in the messageData.
    if (content && !messageData.content) {
      // Avoid mutating parameter.
      // eslint-disable-next-line no-param-reassign
      messageData = { ...messageData, content };
    }

    return super.toMessage(messageData, options);
  }
}
