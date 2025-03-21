import DISCWORLD from "../config.js";

export default function registerKeybindings() {
  game.keybindings.register(DISCWORLD.id, "toggleEditMode", {
    name: "Toggle Edit Mode",
    hint: "Turn character sheet 'edit mode' on and off.",
    editable: [
      {
        key: "KeyE",
      },
    ],
    onDown: () => {
      const { activeWindow } = ui;
      if (!activeWindow?.rendered) return;
      activeWindow.constructor.onToggleSheetMode.call(activeWindow);
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
}
