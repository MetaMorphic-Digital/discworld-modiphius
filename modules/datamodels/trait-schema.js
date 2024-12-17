import DISCWORLD from "../config.js";

export default class TraitDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;

    return {
      type: new fields.StringField({
        required: true,
        choices: Object.keys(DISCWORLD.traitTypes),
        initial: "uncategorized",
      }),
      severity: new fields.StringField({
        required: true,
        nullable: false,
        initial: "minor",
        choices: Object.keys(DISCWORLD.consequenceSeverity),
      }),
    };
  }
}
