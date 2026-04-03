import DISCWORLD from "../config.mjs";

export default function registerKeybindings() {
  // TODO: This keybinding does not work in detached windows.
  game.keybindings.register(DISCWORLD.id, "toggleEditMode", {
    name: "Toggle Edit Mode",
    hint: "Turn character sheet 'edit mode' on and off.",
    editable: [
      { key: "KeyE" },
    ],
    onDown: (event) => {
      const application = ui.activeWindow || game.user.character?.sheet;
      if (!application.rendered || (typeof application.constructor.onToggleSheetMode !== "function")) {
        return;
      }
      application.constructor.onToggleSheetMode.call(application);
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
}
