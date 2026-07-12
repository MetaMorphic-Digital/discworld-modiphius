import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";

const { StringField } = foundry.data.fields;

export default class GroupTestMessageSchema extends BaseMessageSchema {
  static defineSchema() {
    return {
      groupMembers: new MembersField(),
      winCondition: new StringField({
        required: true,
        choices: {
          highestWins: _loc("DISCWORLD.dialog.groupTest.highestWins"),
          lowestWins: _loc("DISCWORLD.dialog.groupTest.lowestWins"),
        },
        initial: "highestWins",
      }),
    };
  }

  get template() {
    return templatePath("rolls/group-test-card.hbs");
  }

  get mainRoll() {
    return this.rolls[0] ?? null;
  }

  async _prepareContext(dataOverrides = {}) {
    const context = await super._prepareContext(dataOverrides);
    context.members = this.groupMembers.toSorted();
    context.winCondition = this.winCondition;
    return context;
  }
}
