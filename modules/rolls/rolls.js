export default class DiscworldRoll extends Roll {
  constructor(formula, data, options = {}) {
    super(formula, data, options);

    const { actor, trait, gmResult } = options;
    this.actor = actor;
    this.trait = trait;
    this.template = "systems/discworld/templates/roll-card.hbs";

    this.gmResult = gmResult || null;
  }

  static async createBaseRoll(formula, rollData) {
    const roll = new DiscworldRoll(formula, {}, rollData);

    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: "Trait Roll",
    });
  }

  static async createNarrativiumRoll(message) {
    const [previousRoll] = message.rolls;
    if (previousRoll.gmResult) return;
    // Create Narrativium roll and show 3d dice if DSN installed.
    const roll = await new Roll("d8").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    // Get the previous roll and update it with the Narrativium result.
    [previousRoll.options.gmResult] = roll.result;
    [previousRoll.gmResult] = roll.result;

    // Prepare chat data with updated info.
    const chatData = previousRoll.prepareChatMessageData();
    const content = await renderTemplate(previousRoll.template, chatData);
    message.update({ content, rolls: [previousRoll] });
  }

  prepareChatMessageData() {
    return {
      actor: this.actor,
      gmResult: this.gmResult,
      result: this.result,
      term: this.dice[0].denomination,
      trait: this.trait,
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
