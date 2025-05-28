/**
 * @typedef {object} ClassesToRemove
 * @property {string[]} remove - An array of class names to be removed from the element.
 */
/**
 * @typedef {object} ClassesToAdd
 * @property {string[]} add - An array of class names to be added to the element.
 */
/**
 * @typedef {ClassesToRemove | ClassesToAdd} TransitionOptions
 * A TransitionOptions object must have at least one of `remove` or `add` defined.
 */

/**
 * Avoid callback hell by wrapping `transitionend` event in a Promise,
 * allowing chaining of transitions with cleaner code.
 *
 * Adds specified class names to trigger transition.
 *
 * @param {HTMLElement} element - The DOM element to which class names will be added.
 * @param {TransitionOptions} options - An object with `remove` and/or `add` properties.
 * @returns {Promise<HTMLElement>} A promise that resolves with the element
 * once the CSS transition has ended.
 */
export default function transitionClass(element, { remove = [], add = [] }) {
  return new Promise((resolve) => {
    function handleTransitionEnd() {
      resolve(element);
    }

    element.addEventListener("transitionend", handleTransitionEnd, {
      once: true,
    });

    element.classList.remove(...remove);
    element.classList.add(...add);
  });
}
