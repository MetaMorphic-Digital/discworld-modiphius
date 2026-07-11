import DISCWORLD from "../config.mjs";

const { HTMLField, StringField } = foundry.data.fields;

export default class TraitDataModel extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {

    const traitTypeChoices = () => Object.values(DISCWORLD.traitTypes).reduce((acc, traitType) => {
      return foundry.utils.mergeObject(acc, traitType, { inplace: false });
    });

    return {
      notes: new HTMLField(),
      severity: new StringField({ required: true, initial: "minor", choices: DISCWORLD.consequenceSeverity }),
      type: new StringField({
        required: true, choices: traitTypeChoices, initial: "consequences",
      }),
      actorType: new StringField({
        required: true, choices: () => DISCWORLD.actorTypes, initial: "character",
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["DISCWORLD.trait"];
}
