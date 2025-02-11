import DWTraitRoll from "./trait-roll.js";

/**
 * @extends Roll
 */
export default class DWHelpRoll extends DWTraitRoll {
  /**
   * @typedef {{
   *            actor: DiscworldCharacter,
   *            trait: Item,
   *            result: number,
   *            term: string
   *          }} HelpData
   */
  /** @type {HelpData} - Organized data about the Help roll. */

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

    return message.update({
      "+=roll": roll,
    });
  }
}
