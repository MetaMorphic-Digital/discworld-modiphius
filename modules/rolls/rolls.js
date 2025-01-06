import transitionClass from "../utils/animations.js";

export default class DiscworldRoll extends Roll {
  constructor(formula, data, options = {}) {
    super(formula, data, options);

    const { actor, trait, gmResult, gmRerollResult, helpResult, helpTerm } =
      options;
    this.actor = actor;
    this.trait = trait;
    this.template = "systems/discworld/templates/roll-card.hbs";

    this.gmResult = gmResult || null;
    this.gmRerollResult = gmRerollResult || null;
    this.helpResult = helpResult || null;
    this.helpTerm = helpTerm || null;
  }

  static async createBaseRoll(formula, rollData) {
    const roll = new DiscworldRoll(formula, {}, rollData);

    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: "Trait Roll",
    });
  }

  static async createNarrativiumRoll(
    message,
    { reroll = false, element } = {},
  ) {
    // Determine the type of narrativium roll (regular or reroll).
    const rollKey = reroll ? "gmRerollResult" : "gmResult";

    const [previousRoll] = message.rolls;
    if (previousRoll[rollKey]) return;
    // Create Narrativium roll and show 3d dice if DSN installed.
    const roll = await new Roll("d8").evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    // Get the previous roll and update it with the Narrativium result.
    [previousRoll.options[rollKey]] = roll.result;
    [previousRoll[rollKey]] = roll.result;

    // Prepare chat data with updated info.
    const chatData = previousRoll.prepareChatMessageData();
    const content = await renderTemplate(previousRoll.template, chatData);

    if (reroll) {
      const gmResultLi = element.querySelector("li.gmResult");
      await transitionClass(gmResultLi, ["move-right"], {
        remove: true,
      });

      const gmRerollResultLi = element.querySelector("li.gmRerollResult");
      const rerollResultText = gmRerollResultLi.querySelector("span");
      rerollResultText.textContent = roll.result;
      await transitionClass(gmRerollResultLi, ["not-visible"], {
        remove: true,
      });
    }

    if (!reroll) {
      const gmResultSpan = element.querySelector("li.gmResult span");
      await transitionClass(gmResultSpan, ["not-visible"]);
      gmResultSpan.textContent = roll.result;
      await transitionClass(gmResultSpan, ["not-visible"], { remove: true });
    }

    message.update({ content, rolls: [previousRoll] });
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
