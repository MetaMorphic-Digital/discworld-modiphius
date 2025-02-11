import DWHelpRoll from "../rolls/help-roll.js";
import DWNarrativiumRoll from "../rolls/narrativium-roll.js";
import transitionClass from "../utils/animations.js";

/**
 * Discworld chat message class.
 */
export default class DiscworldMessage extends ChatMessage {
  /**
   * Retrieve the HTML element for this message from the chat log.
   *
   * @returns {HTMLElement} The message element from the chat log.
   */
  get element() {
    const chatLog = document.getElementById("chat");
    return chatLog.querySelector(`li[data-message-id="${this.id}"]`);
  }

  get mainRoll() {
    return this.rolls[0];
  }

  /** @type {DWHelpRoll | undefined} - The Help roll. */
  get helpRoll() {
    return this.rolls.find((roll) => roll instanceof DWHelpRoll);
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmRoll() {
    return this.rolls.find(
      (roll) => roll instanceof DWNarrativiumRoll && !roll.options.reroll,
    );
  }

  /** @type {DWNarrativiumRoll | undefined} */
  get gmReroll() {
    return this.rolls.find(
      (roll) => roll instanceof DWNarrativiumRoll && roll.options.reroll,
    );
  }

  /**
   * Evaluate the outcome of a test based on whether the
   * player or GM/Narrativium won.
   * @type {{
   *           status: "tie" | "win" | null,
   *           winner: "gm" | "player" | null
   *       }}
   *     - An object with `status` and `winner` properties.
   */
  get outcome() {
    const { results } = this;

    if (!results.gm.primary) {
      return { status: null, winner: null };
    }

    const finalGmResult = results.gm.reroll ?? results.gm.primary;
    const finalPlayerResult = results.player.help ?? results.player.primary;

    if (finalGmResult === finalPlayerResult) {
      return { status: "tie", winner: null };
    }

    const gmWins = finalGmResult > finalPlayerResult;

    return {
      status: "win",
      winner: gmWins ? "gm" : "player",
    };
  }

  /** @override */
  static async create(data) {
    const message = await super.create(data);
    if (!message.isRoll) return message;

    const chatData = await message._prepareContext();
    const content = await renderTemplate(message.mainRoll.template, chatData);
    return message.update({ ...data, content });
  }

  /** @override */
  async update(data) {
    const newRoll = data["+=roll"]; // Special syntax for adding new rolls.
    if (!newRoll) return super.update(data);

    if (game.dice3d) await game.dice3d.showForRoll(newRoll, game.user, true); // Roll Dice So Nice if present.
    newRoll.dice[0].results[0].hidden = true; // Hide from DSN.

    const returnIfInstance = (a, b) => (a instanceof b ? a : null);
    const helpRoll = returnIfInstance(newRoll, DWHelpRoll);
    const gmRoll = returnIfInstance(newRoll, DWNarrativiumRoll);

    let chatDataOverrides;
    if (helpRoll) {
      // Slide parent roll icon left. (We're technically sliding it back from the right).
      await this.slideDiceIcon("playerResult");
      // Fade in reroll result/icon.
      await this.fadeDiceIcon("helpResult", helpRoll.result, helpRoll.term);

      chatDataOverrides = {
        helpRoll,
        "buttonDisabled.help": true,
        "cssClass.results.help": null,
        "cssClass.results.player": "inactive",
      };
    }

    if (gmRoll) {
      const { reroll } = gmRoll.options;
      if (!reroll) {
        // Fade question mark out / new result in.
        await this.fadeTextInOut("gmResult", gmRoll.result);

        chatDataOverrides = {
          gmRoll,
          "cssClass.rerollButton": "reroll",
        };
      }

      if (reroll) {
        // Slide parent roll icon left. (We're technically sliding it back from the right).
        await this.slideDiceIcon("gmResult");
        // Fade in reroll result/icon.
        await this.fadeDiceIcon("gmRerollResult", gmRoll.result); // Fade result

        chatDataOverrides = {
          gmReroll: gmRoll,
          "buttonDisabled.narrativium": true,
          "cssClass.results.gmReroll": null,
          "cssClass.results.gm": "inactive",
        };
      }
    }

    const chatData = await this._prepareContext(chatDataOverrides);
    const content = await renderTemplate(this.mainRoll.template, chatData);

    // Remove special key.
    foundry.utils.mergeObject(
      data,
      { "-=+=roll": null },
      { performDeletions: true },
    );
    return super.update({ ...data, content, rolls: [...this.rolls, newRoll] });
  }

  async _prepareContext(dataOverrides = {}) {
    const { mainRoll, helpRoll, gmRoll, gmReroll } = this;

    /**
     * Get the class name for a given section of results.
     *
     * @param {"gm"|"player"} userRole - The user role to get the class for.
     * @returns {"winner"|"loser"|"tie"|null} - The class name for the winner,
     *                                    or null if the role hasn't been evaluated.
     */
    const outcomeClass = (userRole) => {
      const { status, winner } = this.outcome;

      if (!status) return null; // Opposed roll hasn't been fully evaluated.

      if (status === "tie") return "tie";
      return winner === userRole ? "winner" : "loser";
    };

    return foundry.utils.mergeObject(
      {
        mainRoll,
        helpRoll,
        gmRoll,
        gmReroll,
        buttonDisabled: {
          help: helpRoll?.result,
          narrativium: gmReroll?.result,
        },
        cssClass: {
          rerollButton: gmRoll?.result ? "reroll" : null,
          results: {
            player: helpRoll?.result ? "inactive" : "shift-center",
            help: helpRoll?.result ? null : "not-visible",
            gm: gmReroll?.result ? "inactive" : "shift-center",
            gmReroll: gmReroll?.result ? null : "not-visible",
          },
          outcome: {
            gm: outcomeClass("gm"),
            player: outcomeClass("player"),
          },
        },
      },
      dataOverrides,
    );
  }

  /* -------------------------------------------------- */

  /**
   * Slide the dice icon of a given class name to over from the center of its container.
   *
   * @param {string} resultClass - The class name of the roll whose icon should be moved.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async slideDiceIcon(resultClass) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    return transitionClass(dieListItem, ["shift-center"], {
      remove: true,
    });
  }

  /**
   * Fade in the dice icon of a given class name.
   *
   * @param {string} resultClass - The class name of the roll whose icon should be faded.
   * @param {number} rollResult - The new result to display.
   * @param {string} [rollTerm=null] - An additional class name to apply to the dice icon.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async fadeDiceIcon(resultClass, rollResult, rollTerm = null) {
    const dieListItem = this.element.querySelector(`li.${resultClass}`);
    dieListItem.classList.add(rollTerm);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, ["not-visible"], {
      remove: true,
    });
  }

  /**
   * Fades a text element out, updates its content with a new roll result,
   * and then fades it back in.
   *
   * @param {string} resultClass - The class name of the result element whose text should be updated.
   * @param {number} rollResult - The new result to display within the text element.
   * @returns {Promise<HTMLElement>} Promise that resolves with the element once the transition has ended.
   */
  async fadeTextInOut(resultClass, rollResult) {
    const resultSpan = this.element.querySelector(`li.${resultClass} span`);
    await transitionClass(resultSpan, ["not-visible"]);
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, ["not-visible"], {
      remove: true,
    });
  }
}
