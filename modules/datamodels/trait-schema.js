import DISCWORLD from "../config.js";

const { HTMLField, StringField } = foundry.data.fields;

export default class TraitDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      type: new StringField({
        required: true,
        choices: DISCWORLD.traitTypes,
        initial: "uncategorized",
      }),
      severity: new StringField({
        required: true,
        initial: "minor",
        choices: DISCWORLD.consequenceSeverity,
      }),
      notes: new HTMLField({ required: true }),
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DISCWORLD.trait"];
}
