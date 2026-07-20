import CharacterDataModel from "./character-schema.mjs";
const { HTMLField, StringField } = foundry.data.fields;

export default class NPCDataModel extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      description: new HTMLField(),
      fullName: new StringField({ required: true }),
      pronouns: new StringField({ required: true }),
      storyPrompt: new HTMLField({ nullable: true }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...CharacterDataModel.LOCALIZATION_PREFIXES,
    "DISCWORLD.npc",
  ];
}
