import DISCWORLD from "../config.mjs";

const { HTMLField, StringField } = foundry.data.fields;

export default class TraitDataModel extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      notes: new HTMLField(),
      severity: new StringField({ required: true, initial: "minor", choices: DISCWORLD.consequenceSeverity }),
      type: new StringField({ required: true, choices: () => DISCWORLD.traitTypes, initial: "consequences" }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["DISCWORLD.trait"];
}
