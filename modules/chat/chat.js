/* eslint-disable max-classes-per-file */
import rollTraitDialog from "../dialog/roll-trait-dialog.js";
import DiscworldRoll from "../rolls/rolls.js";
import transitionClass from "../utils/animations.js";

export default class DiscworldChatLog extends ChatLog {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", "button.narrativium", (event) => {
      DiscworldChatLog.#onRollNarrativium.call(this, event);
    });

    html.on("click", "button.help", (event) => {
      DiscworldChatLog.#onHelp.call(this, event);
    });
  }

  static async #onHelp(event) {
    const controlledTokens = canvas.tokens.controlled;
    if (!controlledTokens.length > 1) {
      ui.notifications.warn("You must select a single token to roll for.");
      return;
    }

    // Get the Actor from either the selected Token, or the User's character.
    const [token] = controlledTokens;
    let { actor } = token || {};
    if (!actor) {
      actor = game.user.character;
    }

    const { sheet } = actor;
    sheet.isHelpMode = true;
    await sheet.render(true);

    // Wait for a Trait to be clicked.
    const trait = await new Promise((resolve, reject) => {
      sheet.element.addEventListener("click", (e) => {
        const { target } = e;
        const traitClicked =
          target.getAttribute("data-action") === "traitAction";
        const closeClicked = target.getAttribute("data-action") === "close";

        // Early return if neither a Trait nor the Close button is clicked.
        if (!(traitClicked || closeClicked)) return;

        const traitId = target.dataset.itemId;
        if (traitClicked) resolve(actor.items.get(traitId));
        if (closeClicked) reject();

        sheet.close();
      });
    });
    if (!trait) return;

    const dialogResult = await rollTraitDialog(actor, trait);
    if (!dialogResult) return;

    const message = DiscworldChatLog.getClickedMessage(event);
    const element = event.currentTarget.closest(".message");
    DiscworldRoll.createHelpRoll(message, { element });
  }

  static #onRollNarrativium(event) {
    if (!game.user.isGM) return;
    const message = DiscworldChatLog.getClickedMessage(event);
    const element = event.currentTarget.closest(".message");
    const reroll = event.currentTarget.classList.contains("reroll");

    DiscworldRoll.createNarrativiumRoll(message, {
      reroll,
      element,
    });
  }

  static getClickedMessage(event) {
    const { currentTarget } = event;
    const message = game.messages.get(
      currentTarget.closest(".message").dataset.messageId,
    );
    return message;
  }
}

export class ChatAnimations {
  static async slideDiceIcon(element, rollClass) {
    const dieListItem = element.querySelector(`li.${rollClass}`);
    return transitionClass(dieListItem, ["move-right"], {
      remove: true,
    });
  }

  static async fadeDiceIcon(element, rollClass, rollResult, rollTerm = null) {
    const dieListItem = element.querySelector(`li.${rollClass}`);
    dieListItem.classList.add(rollTerm);
    const rerollResultText = dieListItem.querySelector("span");
    rerollResultText.textContent = rollResult;
    return transitionClass(dieListItem, ["not-visible"], {
      remove: true,
    });
  }

  static async fadeTextInOut(element, rollClass, rollResult) {
    const resultSpan = element.querySelector(`li.${rollClass} span`);
    await transitionClass(resultSpan, ["not-visible"]);
    resultSpan.textContent = rollResult;
    return transitionClass(resultSpan, ["not-visible"], {
      remove: true,
    });
  }
}
