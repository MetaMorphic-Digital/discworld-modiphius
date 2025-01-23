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

    // TODO: Simplify this using getters and perhaps `mergeObject` with an object of defaults.
    const {
      actor,
      trait,
      gmResult,
      gmRerollResult,
      helpResult,
      helpTerm,
      helpTrait,
      helpActor,
    } = options;

    this.actor = actor;
    this.trait = trait;
    this.template = "systems/discworld/templates/roll-card.hbs";

    this.gmResult = gmResult || null;
    this.gmRerollResult = gmRerollResult || null;
    this.helpResult = helpResult || null;
    this.helpTerm = helpTerm || null;
    this.helpTrait = helpTrait || null;
    this.helpActor = helpActor || null;
  }

  /**
   * Evaluate the outcome of a test based on whether the
   * player or GM/Narrativium won.
   *
   * @type {{
   *             status: "tie" | "win" | null,
   *             winner: "gm" | "player" | null
   *          }}
   *        - An object with `status` and `winner` properties.
   */
  get outcome() {
    const { result, gmResult, gmRerollResult, helpResult } = this;

    if (!gmResult) {
      return { status: null, winner: null };
    }

    const finalGmResult = gmRerollResult ?? gmResult;
    const finalPlayerResult = helpResult ?? result;

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
    const resultKey = reroll ? "gmRerollResult" : "gmResult";

    const [parentRoll] = message.rolls;
    if (parentRoll[resultKey]) return null;
    // Create Narrativium roll and show 3d dice if DSN installed.
    const roll = await new Roll("d8").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    // Get the parent roll and update it with the Narrativium result.
    [parentRoll.options[resultKey]] = roll.result;
    [parentRoll[resultKey]] = roll.result;

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
    [parentRoll.options.helpResult] = helpResult;
    [parentRoll.helpResult] = helpResult;
    const helpTerm = helpRoll.dice[0].denomination;
    parentRoll.options.helpTerm = helpTerm;
    parentRoll.helpTerm = helpTerm;
    parentRoll.options.helpTrait = trait;
    parentRoll.helpTrait = trait;
    parentRoll.options.helpActor = trait.actor;
    parentRoll.helpActor = trait.actor;

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
   * @prop {number} gmResult
   * @prop {number} gmRerollResult
   * @prop {number} helpResult
   * @prop {DiceTermOptions} helpTerm
   * @prop {number} result
   * @prop {DiceTermOptions} term
   * @prop {Item} trait
   * @prop {Item} helpTrait
   * @prop {boolean} helpDisabled
   * @prop {boolean} narrativiumDisabled
   * @prop {object} cssClass
   * @prop {"reroll"|null} cssClass.narrativiumReroll
   * @prop {"inactive"|"shift-center"} cssClass.playerResult
   * @prop {"not-visible"|null} cssClass.helpResult
   * @prop {"inactive"|"shift-center"} cssClass.gmResult
   * @prop {"not-visible"|null} cssClass.gmRerollResult
   * @prop {"winner"|"loser"|"tie"|null} cssClass.playerOutcome
   * @prop {"winner"|"loser"|"tie"|null} cssClass.gmOutcome
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

    return {
      actor: this.actor,
      gmResult: this.gmResult,
      gmRerollResult: this.gmRerollResult,
      helpResult: this.helpResult,
      helpTerm: this.helpTerm,
      result: this.result,
      term: this.dice[0].denomination,
      trait: this.trait,
      helpTrait: this.helpTrait,
      helpActor: this.helpActor,
      helpDisabled: this.helpResult,
      narrativiumDisabled: this.gmRerollResult,
      cssClass: {
        narrativiumReroll: this.gmResult ? "reroll" : null,
        playerResult: this.helpResult ? "inactive" : "shift-center",
        helpResult: this.helpResult ? null : "not-visible",
        gmResult: this.gmRerollResult ? "inactive" : "shift-center",
        gmRerollResult: this.gmRerollResult ? null : "not-visible",
        playerOutcome: outcomeClass("player"),
        gmOutcome: outcomeClass("gm"),
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
