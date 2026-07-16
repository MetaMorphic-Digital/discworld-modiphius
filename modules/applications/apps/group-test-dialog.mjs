import { templatePath } from "../../utils/paths.mjs";

import DiscworldMessage from "../../chat/chat-message.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class GroupTestDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["dialog", "discworld", "group-test"],
    position: { width: 500 },
    tag: "dialog",
    form: {
      handler: GroupTestDialog.#onSubmit,
    },
    window: {
      title: "DISCWORLD.dialog.groupTest.title",
      contentTag: "form",
      contentClasses: ["dialog-form", "standard-form"],
    },
  };

  /** @inheritdoc */
  static PARTS = {
    main: {
      template: templatePath("rolls/group-test-dialog.hbs"),
    },
    footer: {
      classes: ["standard-form"],
      template: "templates/generic/form-footer.hbs",
    },
  };

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.fields = {
      members: {
        name: "members",
        label: _loc("DISCWORLD.dialog.groupTest.membersLabel"),
        list: this.options.party.system.members.toSorted(),
      },
      winCondition: {
        field:
          CONFIG.ChatMessage.dataModels.groupTest.schema.getField("winCondition"),
        name: "winCondition",
        label: _loc("DISCWORLD.dialog.groupTest.winConditionsLabel"),
      },
    };

    context.buttons = [
      {
        action: "submit",
        label: "DISCWORLD.dialog.groupTest.prepareRoll",
        icon: "fas fa-check",
        type: "submit",
      },
      {
        action: "close",
        label: "DISCWORLD.dialog.groupTest.cancel",
        icon: "fas fa-times",
        type: "button",
        default: true,
      },
    ];

    return context;
  }

  /**
   * @this {GroupTestDialog}
   * @inheritdoc
  */
  static async #onSubmit(event, form, formData) {
    const expanded = foundry.utils.expandObject(formData.object);
    foundry.utils.mergeObject(expanded, {
      members: expanded.members
        .filter(Boolean)
        .reduce((acc, m) => {
          acc[m] = game.actors.get(m);
          return acc;
        }, {}),
    });

    if (!(Object.keys(expanded.members).length > 1)) {
      return ui.notifications.warn("DISCWORLD.dialog.groupTest.tooFewMembers", { localize: true });
    }

    this.close();
    DiscworldMessage.create({
      type: "groupTest",
      system: {
        groupMembers: expanded.members,
        winCondition: expanded.winCondition,
      },
    });
  }
}
