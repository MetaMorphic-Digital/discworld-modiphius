/**
 * @import DiscworldActor from "../documents/actor.mjs";
 */

/**
 * Simplistic extension of Collection to allow splitting contents by type.
 * @extends {foundry.utils.Collection<string, { actor: DiscworldActor }>}
 */
export default class MembersCollection extends foundry.utils.Collection {
  /**
   * The actors in the party.
   * @type {Collection<string, DiscworldActor>}
   */
  get actors() {
    return this.reduce(
      (acc, { actor }) => acc.set(actor.id, actor),
      new foundry.utils.Collection(),
    );
  }

  /* -------------------------------------------------- */

  /**
   * Cached members by type.
   * @type {Record<string, DiscworldActor[]>|void}
   */
  #documentsByType;

  /* -------------------------------------------------- */

  /**
   * The members by type.
   * @type {Record<string, DiscworldActor[]>}
   */
  get documentsByType() {
    if (!this.#documentsByType) {
      this.#documentsByType = Object.groupBy(this, (m) => m.actor.type);
      discworld.data.actors.PartyData.ALLOWED_ACTOR_TYPES.forEach(
        (key) => (this.#documentsByType[key] ??= []),
      );
    }
    return this.#documentsByType;
  }

  /* -------------------------------------------------- */

  /**
   * The members sorted by name.
   * @type {DiscworldActor[]}
   */
  toSorted() {
    return Array.from(this).sort((a, b) => a.actor._source.name.localeCompare(b.actor._source.name));
  }
}
