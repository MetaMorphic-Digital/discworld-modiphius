import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";
import DWTraitRoll from "../rolls/trait-roll.mjs";
import DWHelpRoll from "../rolls/help-roll.mjs";
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

  get traitRolls() {
    return this.rolls.filter((roll) => roll instanceof DWTraitRoll);
  }

  /* ------------------------------------------------- */

  get helpRolls() {
    return this.rolls.filter((roll) => roll instanceof DWHelpRoll);
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(dataOverrides = {}) {
    const context = await super._prepareContext(dataOverrides);
    context.members = this.groupMembers.toSorted();
    context.winCondition = this.winCondition;

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
