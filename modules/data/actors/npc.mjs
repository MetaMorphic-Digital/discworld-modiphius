import { templatePath } from "../../utils/paths.mjs";

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

  /**
   * Organize traits into an object indexed by trait type.
   * @type {Record<keyof typeof DISCWORLD.traitTypes.npc, Item[]>}
   */
  get traits() {
    return Object.keys(discworld.config.traitTypes.npc).reduce((acc, traitType) => {
      acc[traitType] = this.parent.items.filter((i) => i.system.type === traitType);
      return acc;
    }, {});
  }

  /** @inheritdoc */
  async toEmbed(config, options) {
    config.inline = true;

    const embed = discworld.utils.createElement("aside", { classes: ["discworld-npc"] });
    embed.innerHTML = await foundry.applications.handlebars.renderTemplate(
      templatePath("embeds/npc.hbs"),
      {
        document: this.parent,
        description: await CONFIG.ux.TextEditor.enrichHTML(this.description, options),
        storyPrompt: await CONFIG.ux.TextEditor.enrichHTML(this.storyPrompt, options),
        img: {
          altText: config.alt ?? this.parent.name,
          src: this.parent.img,
          hide: config.hideImage,
        },
      },
    );
    return embed;
  }
}
