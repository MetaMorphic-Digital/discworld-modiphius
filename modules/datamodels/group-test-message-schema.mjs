import MembersField from "./fields/members-field.mjs";
import BaseMessageSchema from "./base-message-schema.mjs";
import { templatePath } from "../utils/paths.mjs";
import DISCWORLD from "../config.mjs";

/**
 * @import DiscworldActor from "../documents/actor.mjs";
 * @import DWTraitRoll from "../rolls/trait-roll.mjs";
 */

const { StringField } = foundry.data.fields;

export default class GroupTestMessageSchema extends BaseMessageSchema {
  /**
   * @import { BaseRollClassOptions, OutcomeClassOptions, RerollClassOptions } from "./base-message-schema.mjs"
   *
   * @typedef {object} RootCssData
   * @property {object} narrativiumButton
   * @property {boolean} narrativiumButton.disabled
   * @property {"reroll"|null} narrativiumButton.class
   * @property {object} result
   * @property {BaseRollClassOptions} result.gm
   * @property {RerollClassOptions} result.gmReroll
   * @property {object} outcome
   * @property {OutcomeClassOptions} outcome.player
   * @property {OutcomeClassOptions} outcome.gm
   *
   * @typedef {object} MemberCssData
   * @property {object} helpButton
   * @property {boolean} helpButton.disabled
   * @property {boolean} helpButton.hidden
   * @property {object} result
   * @property {BaseRollClassOptions} result.trait
   * @property {RerollClassOptions} result.help
   *
   * @typedef {object} MemberContext
   * @property {DiscworldActor} actor
   * @property {MemberCssData} css
   * @property {DWTraitRoll|null} mainRoll
   * @property {DWTraitRoll|null} helpRoll
   *
   * @typedef {{actor: DiscworldActor, roll: DWTraitRoll}} RollData
   * @typedef {Map<string, RollData>} RollMap    Mapping of groupMember id to roll data
   *
   * @typedef {object} GroupRollContext
   * @property {MemberContext[]} members
   * @property {"lowestWins" | "highestWins"} winCondition
   * @property {RollMap} traitRolls
   * @property {RollMap} helpRolls
   * @property {DWTraitRoll|null} gmRoll
   * @property {DWTraitRoll|null} gmReroll
   *
   * @typedef GroupOverrideInner
   * @property {DWTraitRoll|null} mainRoll
   * @property {DWTraitRoll|null} helpRoll
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
      if (member.mainRoll) member.mainRollTooltip = member.mainRoll.trait.name;

      member.helpRoll = context.helpRolls.get(memberId)?.roll ?? null;
      if (member.helpRoll)
        member.helpRollTooltip = `${member.helpRoll.trait.name}<br>— ${member.helpRoll.actor.name}`;

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
    let [traitRolls, helpRolls] = this.rolls.filter((roll) => roll instanceof discworld.rolls.DWTraitRoll).partition((roll) => roll.isHelpRoll);

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
