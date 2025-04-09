import createElement from "../utils/dom-manipulation.js";

/**
 * Adds basic sheet methods that all actor sheets should have,
 * e.g. drag-and-drop support, image editing, etc.
 *
 * Credit: Much of the drag-and-drop and editMode logic is
 * taken and inspired from Zhell's Artichron code.
 */

const DiscworldSheetMixin = (Base) => {
  const { HandlebarsApplicationMixin } = foundry.applications.api;
  return class DiscworldDocumentSheet extends HandlebarsApplicationMixin(Base) {
    static DEFAULT_OPTIONS = {
      classes: ["discworld", "document-sheet"],
      window: { resizable: true },
      actions: {
        toggleSheetMode: DiscworldDocumentSheet.onToggleSheetMode,
      },
      form: { submitOnChange: true },
    };

    static SHEET_MODES = { EDIT: 0, PLAY: 1 };

    _sheetMode = this.constructor.SHEET_MODES.PLAY;

    /**
     * Determines if the sheet is currently in edit mode.
     *
     * @type {boolean} True if the sheet is in edit mode, false otherwise.
     */
    get isEditMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    }

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return {
        ...context,
        document: this.document,
        isEditMode: this.isEditMode,
      };
    }

    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);

      if (!this.isEditable) return;

      // Add/remove class depending on Edit Mode.
      if (this.isEditMode) {
        this.element.classList.add("edit-mode");
      } else {
        this.element.classList.remove("edit-mode");
      }
    }

    /** @override */
    async _renderFrame(options) {
      const element = await super._renderFrame(options);

      const SheetCls = this.constructor;
      SheetCls._encapsulateHeaderButtons(element);
      SheetCls._injectFrameDecoration(element);

      return element;
    }

    /**
     * Wraps all buttons in the window header inside a div,
     * allowing them to be positioned as a group within
     * the decoration border.
     *
     * @param {HTMLElement} element The Sheet element.
     */
    static _encapsulateHeaderButtons(element) {
      if (element.querySelector(".button-wrapper")) return;

      const buttons = element.querySelectorAll(
        ".window-header button.header-control",
      );

      if (buttons.length > 0) {
        // Create a new wrapper div
        const wrapper = createElement("div", { classes: ["button-wrapper"] });

        // Insert the wrapper before the first button
        buttons[0].parentNode.insertBefore(wrapper, buttons[0]);

        // Move all buttons inside the wrapper
        buttons.forEach((button) => wrapper.appendChild(button));
      }
    }

    /**
     * Creates and injects a the sheet frame decoration.
     *
     * @param {HTMLElement} element The Sheet element.
     */
    static _injectFrameDecoration(element) {
      const decorationContainer = createElement("div", {
        classes: ["decoration-container"],
      });

      const corners = ["ul", "ur", "bl", "br"];

      corners.forEach((corner) => {
        const childDecoration = createElement("div", {
          classes: ["decoration", `corner-${corner}`],
        });
        decorationContainer.appendChild(childDecoration);
      });

      const windowContent = element.querySelector(".window-content");
      windowContent.insertBefore(decorationContainer, windowContent.firstChild);
    }

    /* -------------- COMMON SHEET HANDLERS ------------- */

    /**
     * Handle toggling the sheet between edit and play modes.
     *
     * Not private because this is called outside the class.
     *
     * @param {Event} event
     * @param {HTMLElement} target
     * @returns
     */
    static onToggleSheetMode(event, target) {
      if (!this.isEditable) return; // Permissions, not our own internal edit mode.

      const modes = this.constructor.SHEET_MODES;
      this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;

      this.render();
    }
  };
};

export default DiscworldSheetMixin;
