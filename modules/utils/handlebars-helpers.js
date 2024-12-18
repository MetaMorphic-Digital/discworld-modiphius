import DISCWORLD from "../config.js";

export default function registerHelpers() {
  /**
   * Compares two values with the given operator. If no operator is provided,
   * '===' is used by default.
   *
   * @see http://doginthehat.com.au/2012/02/comparison-block-helper-for-handlebars-templates/#comment-44
   * @param {*} lValue
   * @param {string} operator
   * @param {*} rValue
   */
  Handlebars.registerHelper("compare", function (...args) {
    if (args.length < 3) {
      throw new Error("Handlerbars Helper 'compare' needs 2 parameters");
    }

    // eslint-disable-next-line prefer-const
    let [lValue, operator, rValue, options] = args;

    if (options === undefined) {
      options = rValue;
      rValue = operator;
      operator = "===";
    }

    const operators = {
      "===": (l, r) => {
        return l === r;
      },
      "!==": (l, r) => {
        return l !== r;
      },
      "<": (l, r) => {
        return l < r;
      },
      ">": (l, r) => {
        return l > r;
      },
      "<=": (l, r) => {
        return l <= r;
      },
      ">=": (l, r) => {
        return l >= r;
      },
      typeof(l, r) {
        // eslint-disable-next-line valid-typeof
        return typeof l === r;
      },
      "&&": (l, r) => {
        return !!l && !!r;
      },
      "||": (l, r) => {
        return !!l || !!r;
      },
    };

    if (!operators[operator]) {
      throw new Error(
        `Handlerbars Helper 'compare' doesn't know the operator ${operator}`,
      );
    }

    const result = operators[operator](lValue, rValue);

    if (result) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /* ****************
   * CONFIG HELPERS *
   **************** */

  // Return the keys for a config object.
  Handlebars.registerHelper("getConfigKeys", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return Object.keys(obj);
  });

  // Return the values for a config object.
  Handlebars.registerHelper("getConfigValues", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return Object.values(obj);
  });

  // Return a config object.
  Handlebars.registerHelper("getConfigObject", (path) => {
    const obj = foundry.utils.getProperty(DISCWORLD, path);
    return obj;
  });

  /* ****************
   *  ACTOR HELPERS *
   **************** */

  // Get traits by type.
  Handlebars.registerHelper("getTraits", (actor, traitType) => {
    return actor.getTraits(traitType);
  });
}
