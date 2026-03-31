import DISCWORLD from "../config.mjs";

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export default async function preloadTemplates() {
  const { loadTemplates } = foundry.applications.handlebars;
  return loadTemplates([
    // Mixins
    `systems/${DISCWORLD.id}/templates/mixins/toggle-switch.hbs`,
    `systems/${DISCWORLD.id}/templates/mixins/trait-quote.hbs`,
  ]);
}

/* -------------------------------------------------- */

/**
 * Register system-specific handlebars helpers.
 */
export function registerHelpers() {
  /**
   * Returns the path to a system file
   */
  Handlebars.registerHelper(
    "systemFilePath",
    (string) => `systems/${DISCWORLD.id}/${string}`,
  );
}
