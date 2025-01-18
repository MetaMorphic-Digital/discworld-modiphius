const { HTMLField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

export default class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true }),
      luck: new SchemaField({
        max: new NumberField({
          nullable: false,
          positive: true,
          integer: true,
          initial: 4,
        }),
        value: new NumberField({
          nullable: false,
          integer: true,
          min: 0,
          initial: 4,
        }),
      }),
      pronouns: new StringField({ required: true }),
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.luck.value = Math.clamp(this.luck.value, 0, this.luck.max);
  }
}
