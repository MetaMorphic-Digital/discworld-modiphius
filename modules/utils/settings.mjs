import DISCWORLD from "../config.mjs";
import PrimaryPartyModel from "../datamodels/primary-party.mjs";

/**
 * All settings associated with the system.
 * @type {Record<string, SettingConfig>}
 */
const systemSettings = {
  primaryParty: {
    type: PrimaryPartyModel,
    scope: CONST.SETTING_SCOPES.WORLD,
    default: null,
    config: false,
    onChange: () => ui.actors.render(),
  },
};

/**
 * Helper function called in the `init` hook.
 */
export default function registerSettings() {
  for (const [key, value] of Object.entries(systemSettings)) {
    game.settings.register(DISCWORLD.id, key, value);
  }
}
