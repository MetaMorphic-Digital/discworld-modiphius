import DISCWORLD from "../config.mjs";

/**
 * @import DiscworldActor from "../documents/actor.mjs";
 */

/**
 * An extension of the core Actors collection with extra convenience functions.
 */
export default class DiscworldActors extends foundry.documents.collections.Actors {
  /**
   * The primary party.
   * @type {DiscworldActor}
   */
  get party() {
    return game.settings.get(DISCWORLD.id, "primaryParty")?.actor ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Unset the primary party.
   * @returns {Promise<boolean>}    A promise that resolves to whether the modification was successful.
   */
  async unsetParty() {
    if (!game.user.isGM) {
      throw new Error("Only a GM can unassign the primary party!");
    }

    if (!this.party) {
      return false;
    }
    await game.settings.set(DISCWORLD.id, "primaryParty", { actor: null });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Set the primary party.
   * @param {DiscworldActor} actor    The actor to assign as the primary party.
   * @returns {Promise<boolean>}      A promise that resolves to whether the modification was successful.
   */
  async setParty(actor) {
    if (!game.user.isGM) {
      throw new Error("Only a GM can assign the primary party!");
    }

    if (!actor || (actor.type !== "party")) {
      return false;
    }
    if (actor === this.party) {
      return false;
    }

    await game.settings.set(DISCWORLD.id, "primaryParty", { actor: actor.id });
    return true;
  }
}
