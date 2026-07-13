import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";
import DWTraitRoll from "../rolls/trait-roll.mjs";
import DISCWORLD from "../config.mjs";

const { StringField } = foundry.data.fields;

export default class GroupTestMessageSchema extends BaseMessageSchema {
  /** @inheritdoc */
  static defineSchema() {
    return {
      groupMembers: new MembersField(),
      winCondition: new StringField({
        required: true,
        choices: () => DISCWORLD.groupTestConditions,
        initial: "highestWins",
      }),
    };
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return templatePath("rolls/group-test-card.hbs");
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  get mainRoll() {
    return this.rolls[0] ?? null;
  }

  /* ------------------------------------------------- */

  /**
   * The Trait (non-Help) Rolls in the parent ChatMessage.
   * @type {Map<string, { actor: DiscworldCharacter, roll: DWTraitRoll }>}
   */
  get traitRolls() {
    return this.rolls.filter((roll) => (roll instanceof DWTraitRoll) && !roll.isHelpRoll).reduce(
      (acc, roll) => {
        acc.set(roll.actor.id, { actor: roll.actor, roll });
        return acc;
      }, new Map());
  }

  /* ------------------------------------------------- */

  get helpRolls() {
    return this.rolls.filter((roll) => (roll instanceof DWTraitRoll) && roll.isHelpRoll);
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(dataOverrides = {}) {
    const context = await super._prepareContext(dataOverrides);
    context.members = this.groupMembers.toSorted();
    context.winCondition = this.winCondition;

    for (const member of context.members) {
      const memberId = member.actor.id;
      member.mainRoll = this.traitRolls.get(memberId)?.roll ?? dataOverrides[memberId]?.mainRoll ?? null;
    }

    const newRollData = Object.assign(
      {
        traitRolls: this.traitRolls,
        helpRolls: this.helpRolls,
      },
      dataOverrides,
    );

    Object.assign(context, newRollData);
    return context;
  }
}
