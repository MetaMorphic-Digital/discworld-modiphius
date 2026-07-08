import DISCWORLD from "../config.mjs";

const { HTMLField, StringField } = foundry.data.fields;

export default class TraitDataModel extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    const traitTypeChoices = () => Object.values(DISCWORLD.traitTypes).reduce((acc, val) => {
      return foundry.utils.mergeObject(acc, val, { inplace: false });
    });
    const actorTypeChoices = () => DISCWORLD.actorTypes;

    return {
      notes: new HTMLField(),
      severity: new StringField({ required: true, initial: "minor", choices: DISCWORLD.consequenceSeverity }),
      type: new StringField({
        required: true, choices: traitTypeChoices, initial: "consequences",
      }),
      actorType: new StringField({
        required: true, choices: actorTypeChoices, initial: "character",
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["DISCWORLD.trait"];
}
