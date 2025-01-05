export default class DiscworldRoll extends Roll {
  constructor(formula, data, options = {}) {
    super(formula, data, options);

    const { actor, trait } = options;
    this.actor = actor;
    this.trait = trait;
    this.template = "systems/discworld/templates/roll-card.hbs";

    this.gmResult = null;
  }

  static async createRoll(formula, rollData) {
    const roll = new DiscworldRoll(formula, {}, rollData);

    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: "Trait Roll",
    });
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
