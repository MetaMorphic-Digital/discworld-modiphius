import DISCWORLD from "../config.mjs";

/**
 * Helper function called in the `init` hook.
 */
export default function registerSettings() {
  /**
   * All settings associated with the system.
   * @type {Record<string, SettingConfig>}
   */
  const systemSettings = {
    primaryParty: {
      type: discworld.data.PrimaryPartyModel,
      scope: CONST.SETTING_SCOPES.WORLD,
      default: null,
      config: false,
      onChange: () => ui.actors.render(),
    },
  };

  for (const [key, value] of Object.entries(systemSettings)) {
    game.settings.register(DISCWORLD.id, key, value);
  }
}
