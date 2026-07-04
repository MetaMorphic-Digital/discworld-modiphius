/**
 * Recursively localize all strings in an object.
 * @param {string} localeScope    The scope of the localization, e.g. "DISCWORLD".
 * @param {object} object         The object whose properties need to localize.
 */
export default function preLocalize(localeScope, object) {
  const localize = (o, k, v) => {
    const type = foundry.utils.getType(v);
    if ((type === "string") && v.startsWith(localeScope)) {

      o[k] = game.i18n.localize(v);
    } else if (type === "Object") {
      for (const [x, y] of Object.entries(v)) {
        localize(v, x, y);
      }
    } else if (type === "Array") {
      for (const obj of v)
        if (foundry.utils.getType(obj) === "Object") {
          for (const [u, w] of Object.entries(obj)) {
            localize(obj, u, w);
          }
        }
    }
  };

  for (const [k, v] of Object.entries(object)) {
    localize(object, k, v);
  }
}
