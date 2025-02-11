/**
 * @extends Roll
 */
export default class DWHelpRoll extends Roll {
  /**
   * @typedef {{
   *            actor: DiscworldCharacter,
   *            trait: Item,
   *            result: number,
   *            term: string
   *          }} HelpData
   */
  /** @type {HelpData} - Organized data about the Help roll. */

  get actor() {
    return this.options.actor || null;
  }

  get trait() {
    return this.options.trait || null;
  }

  get term() {
    return this.dice[0].denomination || null;
  }

  /**
   * Create a help roll, and update the parent message with the result.
   *
   * @param {object} options
   * @param {DiceTermOptions} options.term - The term to be rolled.
   * @param {Item} options.trait - The trait associated with this roll.
   * @param {DiscworldMessage} options.message - The chat message to update.
   * @returns {Promise<DiscworldMessage|null>} A promise that resolves to the updated chat message.
   */
  static async createHelpRoll({ term, trait, message }) {
    const [parentRoll] = message.rolls;
    if (parentRoll.helpResult) return null;

    const { actor } = trait;
    const rollData = actor?.getRollData() ?? {};
    const roll = new DWHelpRoll(term, rollData, { actor, trait });
    await roll.evaluate();
    const diceResultData = roll.dice[0].results[0];
    // if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true); // Roll Dice So Nice if present.

    diceResultData.hidden = true;

    // Get the parent roll and update it with the Narrativium result.

    // Prepare chat data with updated info.
    const chatData = parentRoll.prepareChatMessageContext();
    const content = await renderTemplate(parentRoll.template, chatData);

    // Slide parent roll icon left. (We're technically sliding it back from the right).
    await message.slideDiceIcon("playerResult");
    // Fade in reroll result/icon.
    await message.fadeDiceIcon("helpResult", roll.result, term);

    return message.update({ content, rolls: [...message.rolls, roll] });
  }
}
