export default class DiscworldRoll extends Roll {
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
    } = options;

    this.actor = actor;
    this.trait = trait;
    this.template = "systems/discworld/templates/roll-card.hbs";

    this.gmResult = gmResult || null;
    this.gmRerollResult = gmRerollResult || null;
    this.helpResult = helpResult || null;
    this.helpTerm = helpTerm || null;
    this.helpTrait = helpTrait || null;
  }

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
   * @param {object} [options]
   * @returns {Promise<ChatMessage>}      A promise that resolves to the updated chat message.
   */
  static async createNarrativiumRoll({ message, reroll = false } = {}) {
    // Determine the type of narrativium roll (regular or reroll).
    const rollKey = reroll ? "gmRerollResult" : "gmResult";

    const [parentRoll] = message.rolls;
    if (parentRoll[rollKey]) return null;
    // Create Narrativium roll and show 3d dice if DSN installed.
    const roll = await new Roll("d8").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    // Get the parent roll and update it with the Narrativium result.
    [parentRoll.options[rollKey]] = roll.result;
    [parentRoll[rollKey]] = roll.result;

    // Prepare chat data with updated info.
    const chatData = parentRoll.prepareChatMessageData();
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

    // Prepare chat data with updated info.
    const chatData = parentRoll.prepareChatMessageData();
    const content = await renderTemplate(parentRoll.template, chatData);

    // Slide parent roll icon left. (We're technically sliding it back from the right).
    await message.slideDiceIcon("playerResult");
    // Fade in reroll result/icon.
    await message.fadeDiceIcon("helpResult", helpResult, helpTerm);

    return message.update({ content, rolls: [parentRoll] });
  }

  prepareChatMessageData() {
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
      helpDisabled: this.helpResult,
      narrativiumDisabled: this.gmRerollResult,
      cssClass: {
        narrativiumReroll: this.gmResult ? "reroll" : null,
        playerResult: this.helpResult ? null : "shift-center",
        helpResult: this.helpResult ? null : "not-visible",
        gmResult: this.gmRerollResult ? null : "shift-center",
        gmRerollResult: this.gmRerollResult ? null : "not-visible",
      },
    };
  }

  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    if (!this._evaluated) await this.evaluate();

    const chatData = this.prepareChatMessageData();
    const content = await renderTemplate(this.template, chatData);

    // Assign content if not already defined in the messageData.
    if (content && !messageData.content) {
      // Avoid mutating parameter.
      // eslint-disable-next-line no-param-reassign
      messageData = { ...messageData, content };
    }

    return super.toMessage(messageData, { rollMode, create });
  }
}
