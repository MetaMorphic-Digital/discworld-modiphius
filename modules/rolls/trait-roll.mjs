import { templatePath } from "../utils/paths.mjs";

export default class DWTraitRoll extends foundry.dice.Roll {
  /**
   * @import Item from "@client/documents/item.mjs";
   * @import DiscworldActor from "../documents/actor.mjs"
   * @import DiscworldMessage from "../documents/chat-message.mjs"
   *
   * @typedef {"d4"|"d6"|"d10"|"d12"} DiceTermOptions
   *
   * @typedef {object} RollOptions
   * @property {Item} trait                      The Item being rolled.
   * @property {DiscworldActor} actor            The Actor being rolled for.
   * @property {Boolean} [isHelpRoll]            Whether this is a help roll.
   * @property {DiscworldActor} [groupMember]    If a group roll, the member associated with this roll.
   */

  /* -------------------------------------------------- */

  /**
   * Creates a new DiscworldRoll instance.
   * @param {DiceTermOptions} formula    The dice formula to evaluate.
   * @param {object} data                An object the roll uses to evaluate (see Foundry docs).
   * @param {RollOptions} [options]      An object with additional options.
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
   * @type {DiscworldActor|null}
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
   * Whether this is part of a group roll.
   * @type {boolean}
   */
  get isGroupRoll() {
    return !!this.options.groupMember;
  }

  /* -------------------------------------------------- */

  /**
   * Create a base Trait roll and send to chat.
   * @param {DiceTermOptions} formula        The roll formula.
   * @param {RollOptions} [options]          The options to pass to the `DiscworldRoll` constructor.
   *                                         See `constructor` above and the Foundry API.
   * @returns {Promise<DiscworldMessage>}    A promise that resolves to the chat message.
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
   * @typedef {object} WaitRollOptions
   * @property {DiceTermOptions} term        The term to be rolled.
   * @property {DiscworldMessage} message    The chat message to update.
   */

  /**
   * Create a roll that responds to a Wait Mode activation.
   * @param {RollOptions & WaitRollOptions} options
   * @returns {Promise<DiscworldMessage>}
   */
  static async createWaitRoll({ term, actor, trait, message, isHelpRoll, groupMember }) {
    const rollData = actor?.getRollData() ?? {};
    const roll = new DWTraitRoll(term, rollData, { actor, trait, isHelpRoll, groupMember });
    await roll.evaluate();

    return message.system.addRoll(roll);
  }
}
