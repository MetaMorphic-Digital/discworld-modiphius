import DWTraitRoll from "./trait-roll.js";

/**
 * @extends Roll
 */
export default class DWHelpRoll extends DWTraitRoll {
  /**
   * Create a help roll, and update the parent message with the result.
   *
   * @param {object} options
   * @param {DiceTermOptions} options.term - The term to be rolled.
   * @param {Item} options.trait - The trait associated with this roll.
   * @param {DiscworldMessage} options.message - The chat message to update.
   * @returns {Promise<DiscworldMessage>} A promise that resolves to the updated chat message.
   */
  static async createHelpRoll({ term, trait, message }) {
    const { actor } = trait;
    const rollData = actor?.getRollData() ?? {};
    const roll = new DWHelpRoll(term, rollData, { actor, trait });
    await roll.evaluate();

    return message.addRoll(roll);
  }
}
