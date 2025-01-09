export default class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;

    return {
      description: new fields.StringField({ required: true }),
      luck: new fields.SchemaField({
        max: new fields.NumberField({
          required: true,
          nullable: false,
          positive: true,
          integer: true,
          initial: 4,
        }),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 4,
        }),
      }),
      pronouns: new fields.StringField({ required: false, initial: "" }),
    };
  }
}
