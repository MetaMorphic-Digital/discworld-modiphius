import DISCWORLD from "../../../config.mjs";
import DiscworldActorSheet from "./base-actor-sheet.mjs";
import CharacterSheet from "./character-sheet.mjs";

export default class NPCSheet extends DiscworldActorSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: [DISCWORLD.id, "npc-sheet"],
    position: {
      width: 700,
      height: 575,
    },
    actions: {
      rollFullNameAsTrait: NPCSheet.#rollFullNameAsTrait,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    ...CharacterSheet.PARTS,
    description: {
      template: `systems/${DISCWORLD.id}/templates/npc-sheet/description.hbs`,
    },
  };

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const { document } = this;
    const { system } = document;

    // Set up Story Prompt
    context.fields.storyPrompt = {
      field: system.schema.getField("storyPrompt"),
      value: this.isEditMode ? system._source.storyPrompt : system.storyPrompt,
    };
    context.fields.storyPrompt.enriched = await CONFIG.ux.TextEditor.enrichHTML(
      context.fields.storyPrompt.value,
      { rollData: this.document.getRollData(), relativeTo: this.document },
    );

    // Set up Full Name
    context.fields.fullName = {
      field: system.schema.getField("fullName"),
      value: this.isEditMode ? system._source.fullName : system.fullName,
    };

    return context;
  }

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Replace luck container with full name container.
    const fullNameContainer = await foundry.applications.handlebars.renderTemplate(
      `systems/${DISCWORLD.id}/templates/npc-sheet/full-name.hbs`,
      context,
    );

    const documentDetails = this.element.querySelector(".document-details");
    const luckContainer = documentDetails.querySelector(".luck-container");
    luckContainer.remove();
    documentDetails.insertAdjacentHTML("afterbegin", fullNameContainer);
  }

  /**
   * Rolls the NPC's full name as a Trait.
   * @this NPCSheet
   */
  static #rollFullNameAsTrait() {
    const { actor } = this;
    actor.rollTrait({ actor, name: actor.system.fullName });
  }
}
