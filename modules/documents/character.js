export default class Character extends Actor {
  getTraits(trait) {
    return this.items.filter((item) => item.system.type === trait);
  }
}
