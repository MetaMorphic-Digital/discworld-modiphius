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
      classes: ["discworld"],
      window: { resizable: true },
      actions: {
        editImage: DiscworldDocumentSheet.#onEditImage,
        toggleSheetMode: DiscworldDocumentSheet.onToggleSheetMode,
      },
      form: { submitOnChange: true },
    };

    static SHEET_MODES = { EDIT: 0, PLAY: 1 };

    _sheetMode = this.constructor.SHEET_MODES.PLAY;

    get isEditMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return {
        ...context,
        document: this.document,
        isEditMode: this.isEditMode,
      };
    }

    _onRender(context, options) {
      super._onRender(context, options);
      if (!this.isEditable) return;

      // Set up drag-and-drop
      this._setupDragAndDrop();
    }

    /* -------------------------------- */
    /*      Drag and drop handlers      */
    /* -------------------------------- */

    /**
     * Set up drag-and-drop handlers.
     */
    _setupDragAndDrop() {
      const dd = new DragDrop({
        dragSelector: "[data-item-uuid]",
        dropSelector: ".application",
        permissions: {
          dragstart: this._canDragStart.bind(this),
          drop: this._canDragDrop.bind(this),
        },
        callbacks: {
          dragstart: this._onDragStart.bind(this),
          drop: this._onDrop.bind(this),
        },
      });
      dd.bind(this.element);
    }

    /**
     * Can the user start a drag event?
     * @param {string} selector     The selector used to initiate the drag event.
     * @returns {boolean}
     */
    _canDragStart(selector) {
      return true;
    }

    /* -------------------------------------------------- */

    /**
     * Can the user perform a drop event?
     * @param {string} selector     The selector used to initiate the drop event.
     * @returns {boolean}
     */
    _canDragDrop(selector) {
      return this.isEditable && this.document.isOwner;
    }

    /* -------------------------------------------------- */

    /**
     * Handle a drag event being initiated.
     * @param {DragEvent} event     The initiating drag event.
     */
    async _onDragStart(event) {
      const uuid =
        event.currentTarget.closest("[data-item-uuid]").dataset.itemUuid;
      const item = await fromUuid(uuid);
      const data = item.toDragData();
      event.dataTransfer.setData("text/plain", JSON.stringify(data));
    }

    /* -------------------------------------------------- */

    /**
     * Handle a drop event.
     * @param {Event} event     The initiating drop event.
     */
    async _onDrop(event) {
      event.preventDefault();
      const { target } = event;
      const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
      const actor = this.document;

      const changes = {
        items: [],
      };

      switch (item.documentName) {
        case "Item":
          await this._onDropItem(item, target, changes);
          break;
        default:
          return;
      }

      const { items } = changes;

      Promise.all([
        foundry.utils.isEmpty(items)
          ? null
          : actor.createEmbeddedDocuments("Item", items),
      ]);
    }

    /**
     * Handle dropping a single item onto the sheet.
     * @param {Item} document               The item being dropped.
     * @param {HTMLElement} target          The direct target dropped onto.
     * @param {object} changes              Object of changes to be made to this document.
     */
    async _onDropItem(document, target, changes) {
      if (document.parent === this.document) {
        // await this._onSortItem(document, target, changes);
        return;
      }

      const itemData = game.items.fromCompendium(document);
      changes.items.push(itemData);
    }

    /* -------------- COMMON SHEET HANDLERS ------------- */

    /**
     * Handle editing the document's image.
     * @this {CharacterSheet}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #onEditImage(event, target) {
      if (!this.isEditable) return;
      const current = this.document.img;
      const fp = new FilePicker({
        type: "image",
        current,
        callback: (path) => this.document.update({ img: path }),
        top: this.position.top + 40,
        left: this.position.left + 10,
      });
      fp.browse();
    }

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

      const toggleSwitch = this.element.querySelector(".toggle-switch");
      toggleSwitch.classList.toggle("toggled");
      toggleSwitch.addEventListener("transitionend", () => {
        this.render();
      });
    }
  };
};

export default DiscworldSheetMixin;
