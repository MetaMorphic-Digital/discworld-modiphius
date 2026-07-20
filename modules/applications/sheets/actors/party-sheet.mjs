import DiscworldActorSheet from "./base-actor-sheet.mjs";
import GroupTestDialog from "../../apps/group-test-dialog.mjs";
import { templatePath } from "../../../utils/paths.mjs";

/**
 * An implementation of an actor sheet for Party actors.
 */
export default class PartySheet extends DiscworldActorSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: { width: 650, height: 750 },
    classes: ["party-sheet"],
    actions: {
      placeMembers: PartySheet.#placeMembers,
      removeMember: PartySheet.#removeMember,
      showMember: PartySheet.#showMember,
      prepareGroupRoll: PartySheet.#prepareGroupRoll,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: DiscworldActorSheet.PARTS.header,
    members: {
      template: templatePath("party-sheet/members.hbs"),
      scrollable: [""],
    },
    tabs: DiscworldActorSheet.PARTS.tabs,
    traits: DiscworldActorSheet.PARTS.traits,
    description: DiscworldActorSheet.PARTS.description,
  };

  /* -------------------------------------------------- */

  /**
   * External actors who re-render this application.
   * @type {Set<DiscworldActor>}
   */
  #appActors = new Set();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.header = await this.#prepareHeader();
    context.members = await this.#prepareMembers();

    context.fields.description = {
      field: this.document.getFieldForProperty("system.description.value"),
      value: this.document._source.system.description.value,
      enriched: await CONFIG.ux.TextEditor.enrichHTML(
        this.document.system.description.value,
        { rollData: this.document.getRollData(), relativeTo: this.document },
      ),
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare header context.
   * @returns {Promise<object>}
   */
  async #prepareHeader() {
    const members = this.document.system.members;
    return {
      canPlaceMembers: game.user.isGM && canvas?.ready && members.size,
    };
  }

  /* -------------------------------------------------- */

  /**
   * Prepare members context.
   * @returns {Promise<object[]>}
   */
  async #prepareMembers() {
    const members = [];
    for (const member of this.document.system.members.toSorted()) {
      const ctx = { ...member };
      Object.assign(ctx, {
        rootId: [this.id, member.actor.id].join("-"),
        canView: member.actor.testUserPermission(game.user, "OBSERVER"),
      });
      members.push(ctx);
    }
    return members;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const actor of this.#appActors) {
      delete actor.apps[this.id];
    }
    this.#appActors.clear();
    for (const { actor } of this.document.system.members) {
      actor.apps[this.id] = this;
      this.#appActors.add(actor);
    }

    const docDetails = await foundry.applications.handlebars.renderTemplate(
      templatePath("party-sheet/details.hbs"),
      context,
    );
    this.element.querySelector(".document-details").outerHTML = docDetails;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onClose(options) {
    for (const actor of this.#appActors) {
      delete actor.apps[this.id];
    }
    this.#appActors.clear();
    return super._onClose(options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropActor(event, actor) {
    await this.document.system.addMembers([actor]);
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * @this PartySheet
   */
  static async #placeMembers() {
    if (!this.document.system.members.size) {
      return;
    }
    const isMaximized = this.rendered && !this.minimized;
    if (isMaximized) {
      await this.minimize();
    }
    await this.document.system.placeMembers();
    if (isMaximized) {
      this.maximize();
    }
  }

  /* -------------------------------------------------- */

  /**
   * @this PartySheet
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing html element that defined the [data-action].
   */
  static #removeMember(event, target) {
    const id = target.closest("[data-member-id]").dataset.memberId;
    const actor = game.actors.get(id);
    this.document.system.removeMembers([actor]);
  }

  /* -------------------------------------------------- */

  /**
   * @this PartySheet
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing html element that defined the [data-action].
   */
  static #showMember(event, target) {
    const id = target.closest("[data-member-id]").dataset.memberId;
    const actor = game.actors.get(id);
    actor.sheet.render({ force: true });
  }

  /**
   * Prepare a group roll by creating a GroupTestDialog.
   * @this PartySheet
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing html element that defined the [data-action].
   */
  static #prepareGroupRoll(event, target) {
    const application = new GroupTestDialog({ party: this.document });
    this.renderChild(application);
  }
}
