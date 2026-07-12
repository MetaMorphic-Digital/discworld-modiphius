import { templatePath } from "../../../utils/paths.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { StringField, SetField, DocumentIdField } = foundry.data.fields;

export default class GroupTestDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["dialog", "discworld", "group-test"],
    position: { width: 500 },
    tag: "dialog",
    form: {
      handler: GroupTestDialog.#onSubmit,
      closeOnSubmit: true,
    },
    buttons: [
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
      },
    ],
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
        list: this.options.party.system.members,
      },
      winCondition: {
        field: new StringField({
          required: true,
          choices: {
            highestWins: _loc("DISCWORLD.dialog.groupTest.highestWins"),
            lowestWins: _loc("DISCWORLD.dialog.groupTest.lowestWins"),
          },
          initial: "highestWins",
        }),
        name: "winCondition",
        label: _loc("DISCWORLD.dialog.groupTest.winConditionsLabel"),
      },
    };

    context.buttons = this.options.buttons;

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
        .map((m) => game.actors.get(m)),
    });
    return expanded;
  }
}
