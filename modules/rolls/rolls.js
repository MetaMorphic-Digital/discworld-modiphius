import { ChatAnimations } from "../chat/chat.js";

export default class DiscworldRoll extends Roll {
  constructor(formula, data, options = {}) {
    super(formula, data, options);

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

  static async createBaseRoll(formula, rollData) {
    const roll = new DiscworldRoll(formula, {}, rollData);

    await roll.evaluate();

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: "Trait Roll",
    });
  }

  static async createNarrativiumRoll({
    message,
    element,
    reroll = false,
  } = {}) {
    // Determine the type of narrativium roll (regular or reroll).
    const rollKey = reroll ? "gmRerollResult" : "gmResult";

    const [parentRoll] = message.rolls;
    if (parentRoll[rollKey]) return;
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
      await ChatAnimations.fadeTextInOut(element, "gmResult", roll.result);
    }

    if (reroll) {
      // Slide parent roll icon left. (We're technically sliding it back from the right).
      await ChatAnimations.slideDiceIcon(element, "gmResult");
      // Fade in reroll result/icon.
      await ChatAnimations.fadeDiceIcon(element, "gmRerollResult", roll.result); // Fade result
    }

    message.update({ content, rolls: [parentRoll] });
  }

  static async createHelpRoll({ diceTerm, trait, message, element } = {}) {
    const [parentRoll] = message.rolls;
    if (parentRoll.helpResult) return;

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
    await ChatAnimations.slideDiceIcon(element, "playerResult");
    // Fade in reroll result/icon.
    await ChatAnimations.fadeDiceIcon(
      element,
      "helpResult",
      helpResult,
      helpTerm,
    );

    message.update({ content, rolls: [parentRoll] });
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
      cssClass: {
        playerResult: this.helpResult ? null : "shift-center",
        helpResult: this.helpResult ? null : "not-visible",
        gmResult: this.gmRerollResult ? null : "shift-center",
        gmRerollResult: this.gmRerollResult ? null : "not-visible",
      },
    };
  }

  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    const chatData = this.prepareChatMessageData();
    const content = await renderTemplate(this.template, chatData);

    // Assign content if not already defined in the messageData.
    if (content && !messageData.content) messageData.content = content;

    return super.toMessage(messageData, {
      rollMode,
      create,
    });
  }
}
