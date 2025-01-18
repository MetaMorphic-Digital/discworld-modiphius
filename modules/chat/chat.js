/* eslint-disable max-classes-per-file */
import rollTraitDialog from "../dialog/roll-trait-dialog.js";
import DiscworldRoll from "../rolls/rolls.js";
import transitionClass from "../utils/animations.js";

export default class DiscworldChatLog extends (foundry.applications?.sidebar
  ?.tabs?.ChatLog ?? ChatLog) {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      narrativium: DiscworldChatLog.#onRollNarrativium,
      help: DiscworldChatLog.#onHelp,
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  activateListeners(html) {
    // TODO: Remove once v12 support is dropped.
    super.activateListeners(html);

    html.on("click", "button.narrativium", (event) => {
      DiscworldChatLog.#onRollNarrativium.call(this, event);
    });

    html.on("click", "button.help", (event) => {
      DiscworldChatLog.#onHelp.call(this, event);
    });
  }

  /* -------------------------------------------------- */

  static async #onHelp(event, target) {
    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length > 1) {
      ui.notifications.warn("DISCWORLD.chat.warning.singleTokenSelect", {
        localize: true,
      });
      return;
    }

    // Get the Actor from either the selected Token, or the User's character.
    const [token] = controlledTokens;
    const actor = token?.actor ?? game.user.character;

    if (!actor) {
      ui.notifications.warn("DISCWORLD.chat.warning.actorNotFound", {
        localize: true,
      });
      return;
    }

    // Wait for a Trait to be clicked.
    const trait = await actor.sheet.resolveHelpMode();
    if (!trait) return;

    const dialogResult = await rollTraitDialog(actor, trait);
    if (!dialogResult) return;

    // TODO: Simplify when v12 support is dropped.
    const message =
      game.release.generation < 13
        ? game.messages.get(
            event.currentTarget.closest(".message").dataset.messageId,
          )
        : target.closest(".message");
    const element =
      game.release.generation < 13
        ? event.currentTarget.closest(".message")
        : target.closest(".message");
    DiscworldRoll.createHelpRoll({
      diceTerm: dialogResult,
      trait,
      message,
      element,
    });
  }

  static #onRollNarrativium(event, target) {
    if (!game.user.isGM) return;

    let message;
    let element;
    let reroll;

    if (game.release.generation < 13) {
      message = DiscworldChatLog.getClickedMessage(event);
      element = event.currentTarget.closest(".message");
      reroll = event.currentTarget.classList.contains("reroll");
    } else {
      message = game.messages.get(target.closest(".message").dataset.messageId);
      element = target.closest(".message");
      reroll = target.classList.contains("reroll");
    }

    DiscworldRoll.createNarrativiumRoll({ message, element, reroll });
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
  // TODO: Consider moving these methods into the ChatMessage document class.
  static async slideDiceIcon(element, rollClass) {
    const dieListItem = element.querySelector(`li.${rollClass}`);
    return transitionClass(dieListItem, ["shift-center"], {
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
