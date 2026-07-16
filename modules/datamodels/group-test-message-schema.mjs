import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";
import DWTraitRoll from "../rolls/trait-roll.mjs";
import DISCWORLD from "../config.mjs";

const { StringField } = foundry.data.fields;

export default class GroupTestMessageSchema extends BaseMessageSchema {
  /**
   * @import { BaseRollClassOptions, OutcomeClassOptions, RerollClassOptions } from "./base-message-schema.mjs"
   *
   * @typedef {object} RootCssData
   * @prop {object} narrativiumButton
   * @prop {boolean} narrativiumButton.disabled
   * @prop {"reroll"|null} narrativiumButton.class
   * @prop {object} result
   * @prop {BaseRollClassOptions} result.gm
   * @prop {RerollClassOptions} result.gmReroll
   * @prop {object} outcome
   * @prop {OutcomeClassOptions} outcome.player
   * @prop {OutcomeClassOptions} outcome.gm
   *
   * @typedef {object} MemberCssData
   * @prop {object} helpButton
   * @prop {boolean} helpButton.disabled
   * @prop {boolean} helpButton.hidden
   * @prop {object} result
   * @prop {BaseRollClassOptions} result.trait
   * @prop {RerollClassOptions} result.help
   *
   * @typedef {object} MemberContext
   * @prop {DiscworldCharacter} actor
   * @prop {MemberCssData} css
   * @prop {DWTraitRoll|null} mainRoll
   * @prop {DWTraitRoll|null} helpRoll
   *
   * @typedef {{actor: DiscworldCharacter, roll: DWTraitRoll}} RollData
   * @typedef {Map<string, RollData>} RollMap    Mapping of groupMember id to roll data
   *
   * @typedef {object} GroupRollContext
   * @prop {MemberContext[]} members
   * @prop {"lowestWins" | "highestWins"} winCondition
   * @prop {RollMap} traitRolls
   * @prop {RollMap} helpRolls
   * @prop {DWTraitRoll|null} gmRoll
   * @prop {DWTraitRoll|null} gmReroll
   *
   * @typedef GroupOverrideInner
   * @prop {DWTraitRoll|null} mainRoll
   * @prop {DWTraitRoll|null} helpRoll
   *
   * @typedef {Record<string, GroupOverrideInner} GroupDataOverrides
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

  /**
   * @inheritdoc
   * @param {GroupDataOverrides} [dataOverrides]
   * @returns {Promise<GroupRollContext>}
   */
  async _prepareContext(dataOverrides = {}) {
    const { traitRolls, helpRolls } = this.getRollsByType(dataOverrides);
    const context = {
      members: this.groupMembers.toSorted(),
      winCondition: this.winCondition,
      traitRolls,
      helpRolls,
      gmRoll: this.gmRoll,
      gmReroll: this.gmReroll,
    };

    Object.assign(context, dataOverrides);

    for (const member of context.members) {
      const memberId = member.actor.id;
      member.mainRoll = context.traitRolls.get(memberId)?.roll ?? null;
      member.helpRoll = context.helpRolls.get(memberId)?.roll ?? null;
      member.css = this._prepareMemberCssData(member);
    }

    context.css = this._prepareRootCssData(context);

    return context;
  }

  /* ------------------------------------------------- */

  /**
   * Get traitRolls and helpRolls all in one go, taking overrides into account.
   * @param {GroupDataOverrides} dataOverrides
   * @returns {Pick<GroupRollContext, "traitRolls" | "helpRolls">}}
   */
  getRollsByType(dataOverrides) {
    let [traitRolls, helpRolls] = this.rolls.filter((roll) => roll instanceof DWTraitRoll).partition((roll) => roll.isHelpRoll);

    const toRollMap = (rolls) =>
      rolls.reduce((acc, roll) => {
        acc.set(roll.options.groupMember, { actor: roll.actor, roll });
        return acc;
      }, new Map());

    traitRolls = toRollMap(traitRolls);
    helpRolls = toRollMap(helpRolls);

    const addOverrideToMap = (map, roll) => {
      map.set(roll.options.groupMember, { actor: roll.actor, roll });
    };

    // Assign overrides.
    Object.values(dataOverrides).forEach(({ mainRoll, helpRoll }) => {
      if (mainRoll) addOverrideToMap(traitRolls, mainRoll);
      if (helpRoll) addOverrideToMap(helpRolls, helpRoll);
    });

    return { traitRolls, helpRolls };
  }

  /* ------------------------------------------------- */

  /**
   * Prepare CSS data for the non-member elements of the template.
   * @param {Omit<GroupRollContext, "css">} context
   * @returns {RootCssData}
   */
  _prepareRootCssData(context) {
    const { gmRoll, gmReroll } = context;
    return {
      narrativiumButton: {
        disabled: gmReroll?._evaluated,
        class: gmRoll?._evaluated ? "reroll" : "",
      },
      result: {
        gm: gmReroll?._evaluated ? "inactive" : "shift-center",
        gmReroll: gmReroll?._evaluated ? null : "not-visible",
      },
      outcome: {
        player: this.outcomeClass("player", context),
        gm: this.outcomeClass("gm", context),
      },
    };
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
   * @param {GroupRollContext} context
   * @returns {DWTraitRoll|null}
   */
  getPrincipalTraitRoll(context) {
    const traitRolls = Array.from(context.traitRolls);

    let principalTraitRoll = null;
    for (const [_, { roll }] of traitRolls) {
      const helpRoll = context.helpRolls.get(roll.options.groupMember)?.roll;
      const finalRoll = helpRoll ?? roll;

      if (!principalTraitRoll) {
        principalTraitRoll = finalRoll;
        continue;
      }

      if ((this.winCondition === "lowestWins") && (finalRoll.total < principalTraitRoll.total)) {
        principalTraitRoll = finalRoll;
        continue;
      }

      if ((this.winCondition === "highestWins") && (finalRoll.total > principalTraitRoll.total)) {
        principalTraitRoll = finalRoll;
        continue;
      }
    }

    return principalTraitRoll;
  }

  /* ------------------------------------------------- */

  /** @inheritdoc */
  outcome(context) {
    const { gmRoll, gmReroll } = context;
    if (!gmRoll?.total) {
      return { status: null, winner: null };
    }

    const finalGmTotal = gmReroll?.total ?? gmRoll?.total;
    const finalPlayerTotal = this.getPrincipalTraitRoll(context)?.total;

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
