/**
 * @extends Roll
 */
export default class DWNarrativiumRoll extends Roll {
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
    const roll = await new DWNarrativiumRoll("d8", {}, { reroll }).evaluate();

    return message.update({ "+=roll": roll });
  }
}
