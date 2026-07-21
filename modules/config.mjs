/**
 * Centralized config constants for the DISCWORLD system.
 */
const DISCWORLD = {
  id: "discworld-modiphius",

  /* -------------------------------------------------- */

  consequenceSeverity: {
    inconsequential: "DISCWORLD.trait.severity.inconsequential",
    minor: "DISCWORLD.trait.severity.minor",
    major: "DISCWORLD.trait.severity.major",
    exceptional: "DISCWORLD.trait.severity.exceptional",
  },

  /* -------------------------------------------------- */

  traitTypes: {
    character: {
      organization: "DISCWORLD.trait.type.organization",
      background: "DISCWORLD.trait.type.background",
      niche: "DISCWORLD.trait.type.niche",
      core: "DISCWORLD.trait.type.core",
      quirks: "DISCWORLD.trait.type.quirks",
      spellbook: "DISCWORLD.trait.type.spellbook",
      consequences: "DISCWORLD.trait.type.consequences",
      other: "DISCWORLD.trait.type.other",
    },
    npc: {
      species: "DISCWORLD.trait.type.species",
      niche: "DISCWORLD.trait.type.niche",
      features: "DISCWORLD.trait.type.features",
      mannerism: "DISCWORLD.trait.type.mannerism",
      other: "DISCWORLD.trait.type.other",
    },
    party: {
      organization: "DISCWORLD.trait.type.organization",
      goal: "DISCWORLD.trait.type.goal",
      past: "DISCWORLD.trait.type.past",
      present: "DISCWORLD.trait.type.present",
      other: "DISCWORLD.trait.type.other",
    },
  },

  /* -------------------------------------------------- */

  actorTypes: {
    character: "TYPES.Actor.character",
    npc: "TYPES.Actor.npc",
    party: "TYPES.Actor.party",
  },

  /* -------------------------------------------------- */

  groupTestConditions: {
    highestWins: "DISCWORLD.dialog.groupTest.highestWins",
    lowestWins: "DISCWORLD.dialog.groupTest.lowestWins",
  },
};

export default DISCWORLD;
