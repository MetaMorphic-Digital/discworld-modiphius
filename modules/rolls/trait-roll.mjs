import { templatePath } from "../utils/paths.mjs";

export default class DWTraitRoll extends foundry.dice.Roll {
  /**
   * @typedef {"d4"|"d6"|"d10"|"d12"} DiceTermOptions
   */

  /* -------------------------------------------------- */

  /**
   * Creates a new DiscworldRoll instance.
   * @param {DiceTermOptions} formula               The dice formula to evaluate.
   * @param {object} data                           An object the roll uses to evaluate (see Foundry docs).
   * @param {object} [options]                      An object with additional options.
   * @param {DiscworldCharacter} [options.actor]    The Actor being rolled for.
   * @param {Item} [options.trait]                  The Item being rolled.
   */
  constructor(formula, data, options = {}) {
    if (options.actor instanceof foundry.documents.Actor) {
      options.actor = options.actor.uuid;
    }

    if (options.trait instanceof foundry.documents.Item) {
      options.trait = options.trait.uuid;
    }

    super(formula, data, options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static CHAT_TEMPLATE = templatePath("rolls/roll-card.hbs");

  /* -------------------------------------------------- */

  /** @type {string} - Path to the template for this roll. */
  get template() {
    return this.options.template || this.constructor.CHAT_TEMPLATE;
  }

  /* -------------------------------------------------- */

  /**
   * The Actor that initiated the roll.
   * @type {DiscworldCharacter|null}
   */
  get actor() {
    const actor = fromUuidSync(this.options.actor);
    return (actor instanceof foundry.documents.Actor) ? actor : null;
  }

  /* -------------------------------------------------- */

  /**
   * The trait used for this roll.
   * @type {Item|null}
   */
  get trait() {
    const item = fromUuidSync(this.options.trait);
    return (item instanceof foundry.documents.Item) ? item : null;
  }

  /* -------------------------------------------------- */

  /**
   * The dice term used for this roll.
   * @type {DiceTermOptions}
   */
  get term() {
    return this.dice[0].denomination;
  }

  /* -------------------------------------------------- */

  /**
   * Whether this is a help roll.
   * @type {boolean}
   */
  get isHelpRoll() {
    return this.options.isHelpRoll ?? false;
  }
  /* -------------------------------------------------- */

  /**
   * Create a base Trait roll and send to chat.
   * @param {DiceTermOptions} formula       The roll formula.
   * @param {object} [options]              The options to pass to the `DiscworldRoll` constructor.
   *                                        See `constructor` above and the Foundry API.
   * @returns {Promise<DiscworldMessage>}   A promise that resolves to the chat message.
   */
  static async createBaseRoll(formula, options) {
    const rollData = options.actor?.getRollData() ?? {};
    const roll = new DWTraitRoll(formula, rollData, options);

    return roll.toMessage({
      speaker: getDocumentClass("ChatMessage").getSpeaker({ actor: options.actor }),
      type: "baseTest",
    });
  }

  /* ------------------------------------------------- */

  /**
   * Create a roll that responds to a Wait Mode activation.
   * @param {object} options
   * @param {DiceTermOptions} options.term        The term to be rolled.
   * @param {DiscworldCharacter} options.actor    The Actor being rolled for.
   * @param {Item} options.trait                  The trait associated with this roll.
   * @param {DiscworldMessage} options.message    The chat message to update.
   * @param {boolean} options.isHelpRoll          Whether this is a help roll.
   * @returns {Promise<DiscworldMessage>}
   */
  static async createWaitRoll({ term, actor, trait, message, isHelpRoll }) {
    const rollData = actor?.getRollData() ?? {};
    const roll = new DWTraitRoll(term, rollData, { actor, trait, isHelpRoll });
    await roll.evaluate();

    return message.system.addRoll(roll);
  }
}
