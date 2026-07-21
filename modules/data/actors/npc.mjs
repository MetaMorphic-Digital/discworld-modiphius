const { HTMLField, StringField } = foundry.data.fields;

export default class NPCData extends foundry.abstract.TypeDataModel {
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
    "DISCWORLD.character",
    "DISCWORLD.npc",
  ];
}
