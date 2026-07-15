import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";
import DWTraitRoll from "../rolls/trait-roll.mjs";
import DISCWORLD from "../config.mjs";

const { StringField } = foundry.data.fields;

export default class GroupTestMessageSchema extends BaseMessageSchema {
  /**
   * @typedef {object} MemberCssData
   * @prop {object} helpButton
   * @prop {boolean} helpButton.disabled
   * @prop {boolean} helpButton.hidden
   * @prop {object} result
   * @prop {"inactive" | "shift-center"} result.trait
   * @prop {"not-visible" | null} result.help
   *
   * @typedef {object} MemberContext
   * @prop {DiscworldCharacter} actor
   * @prop {DWTraitRoll|null} mainRoll
   * @prop {DWTraitRoll|null} helpRoll
   * @prop {MemberCssData} css
   */

  /** @inheritdoc */
  static defineSchema() {
    return {
      groupMembers: new MembersField(),
      winCondition: new StringField({
        required: true,
        choices: () => DISCWORLD.groupTestConditions,
        initial: "highestWins",
      }),
    };
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return templatePath("rolls/group-test-card.hbs");
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  get mainRoll() {
    return this.rolls[0] ?? null;
  }

  /* ------------------------------------------------- */

  /**
   * The Trait (non-Help) Rolls in the parent ChatMessage.
   * @type {Map<string, { actor: DiscworldCharacter, roll: DWTraitRoll }>}
   */
  get traitRolls() {
    return this.rolls.filter((roll) => (roll instanceof DWTraitRoll) && !roll.isHelpRoll).reduce(
      (acc, roll) => {
        acc.set(roll.options.groupMember, { actor: roll.actor, roll });
        return acc;
      }, new Map());
  }

  /* ------------------------------------------------- */

  /**
   * The Help Rolls in the parent ChatMessage.
   * @type {Map<string, { actor: DiscworldCharacter, roll: DWTraitRoll }>}
   */
  get helpRolls() {
    return this.rolls.filter((roll) => (roll instanceof DWTraitRoll) && roll.isHelpRoll).reduce(
      (acc, roll) => {
        acc.set(roll.options.groupMember, { actor: roll.actor, roll });
        return acc;
      }, new Map(),
    );
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(dataOverrides = {}) {
    const context = await super._prepareContext(dataOverrides);
    context.members = this.groupMembers.toSorted();
    context.winCondition = this.winCondition;

    for (const member of context.members) {
      const memberId = member.actor.id;
      member.mainRoll = this.traitRolls.get(memberId)?.roll ?? dataOverrides[memberId]?.mainRoll ?? null;
      member.helpRoll = this.helpRolls.get(memberId)?.roll ?? dataOverrides[memberId]?.helpRoll ?? null;
      member.css = this._prepareMemberCssData(member);
    }

    const newRollData = Object.assign(
      {
        traitRolls: this.traitRolls,
        helpRolls: this.helpRolls,
      },
      dataOverrides,
    );

    Object.assign(context, newRollData);
    return context;
  }

  /* ------------------------------------------------- */

  /**
   * Prepare CSS data for each member of the group.
   * @param {Omit<MemberContext, "css">} member    The member to prepare CSS data for
   * @returns {MemberCssData}                      The prepared CSS data
   */
  _prepareMemberCssData(member) {
    const { mainRoll, helpRoll } = member;
    return {
      helpButton: {
        disabled: helpRoll?._evaluated,
        hidden: !mainRoll?._evaluated,
      },
      result: {
        trait: helpRoll?._evaluated ? "inactive" : "shift-center",
        help: helpRoll?._evaluated ? null : "not-visible",
      },
    };
  }

  /* ------------------------------------------------- */

  /**
   * This is the Trait roll that is being used to determine the outcome
   * of this group test, following rules for taking lowest / highest result.
   * @returns {DWTraitRoll|null}
   */
  getPrincipalTraitRoll() {
    const traitRolls = Array.from(this.traitRolls);

    let principalTraitRoll = null;
    for (const [_, { roll }] of traitRolls) {
      if (!principalTraitRoll) {
        principalTraitRoll = roll;
        continue;
      }
      if ((this.winCondition === "lowestWins") && (roll.total < principalTraitRoll.total)) {
        principalTraitRoll = roll;
        continue;
      }

      if ((this.winCondition === "highestWins") && (roll.total > principalTraitRoll.total)) {
        principalTraitRoll = roll;
        continue;
      }
    }

    return principalTraitRoll;
  }

  /* ------------------------------------------------- */

  /**
   * Aggregate the results of all Trait (help and non-help) rolls in this group roll.
   * Then, evaluate the outcome of the entire group test.
   * @inheritdoc
   */
  outcome({ gmRoll, gmReroll } = {}) {
    if (!gmRoll?.total) {
      return { status: null, winner: null };
    }

    const finalGmTotal = gmReroll?.total ?? gmRoll?.total;
    const finalPlayerTotal = this.getPrincipalTraitRoll()?.total;

    if (finalGmTotal === finalPlayerTotal) {
      return { status: "tie", winner: null };
    }

    const gmWins = finalGmTotal > finalPlayerTotal;

    return {
      status: "win",
      winner: gmWins ? "gm" : "player",
    };
  }
}
