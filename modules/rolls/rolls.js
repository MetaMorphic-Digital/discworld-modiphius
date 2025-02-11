/**
 * @extends Roll
 */
export default class DWTraitRoll extends Roll {
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
   */
  constructor(formula, data, options = {}) {
    super(formula, data, options);
    this.messageID = options.messageID || null;
  }

  static CHAT_TEMPLATE = "systems/discworld/templates/roll-card.hbs";

  get template() {
    return this.options.template || this.constructor.CHAT_TEMPLATE;
  }

  get message() {
    const { messageID } = this.options;
    if (!messageID) return null;
    return game.messages.get(messageID);
  }

  /** @type {DiscworldCharacter} The Actor that initiated the roll. */
  get actor() {
    return this.options.actor;
  }

  /** @type {Item} The Trait used for this roll. */
  get trait() {
    return this.options.trait;
  }

  /** @type {DiceTermOptions} The dice term used for this roll. */
  get term() {
    return this.dice[0].denomination || null;
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
    const roll = new DWTraitRoll(formula, rollData, options);

    const flavor = game.i18n.localize("DISCWORLD.roll.traitRoll");
    const message = await roll.toMessage({
      // eslint-disable-next-line no-undef
      speaker: getDocumentClass("ChatMessage").getSpeaker(),
      flavor,
    });

    await message.update({
      rolls: [
        foundry.utils.mergeObject(roll, { "options.messageID": message.id }),
      ],
    });

    return message;
  }
}
