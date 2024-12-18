import DISCWORLD from "../config.js";

export default function registerHelpers() {
  /* ****************
   * CONFIG HELPERS *
   **************** */

  // Return the keys for a config object.
  Handlebars.registerHelper("getConfigKeys", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return Object.keys(obj);
  });

  // Return the values for a config object.
  Handlebars.registerHelper("getConfigValues", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return Object.values(obj);
  });

  // Return a config object.
  Handlebars.registerHelper("getConfigObject", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return obj;
  });

  /* ****************
   *  ACTOR HELPERS *
   **************** */

  // Get traits by type.
  Handlebars.registerHelper("getTraits", (actor, traitType) => {
    return actor.getTraits(traitType);
  });
}
