import DISCWORLD from "../config.mjs";

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
    options = {
      ...options,
      actor: options.actor instanceof foundry.documents.Actor ? options.actor.uuid : null,
      trait: options.item instanceof foundry.documents.Item ? options.trait.uuid : null,
    };
    super(formula, data, options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static CHAT_TEMPLATE = /** @type {const} */ (
    `systems/${DISCWORLD.id}/templates/roll-card.hbs`
  );

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
    });
  }
}
