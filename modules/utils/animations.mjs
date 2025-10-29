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
 * @param {number} [timeout=1000] - Optional timeout in milliseconds (default: 1000ms)
 * @returns {Promise<HTMLElement>} A promise that resolves with the element
 *                                 once the CSS transition has ended or timed out.
 */
export default function transitionClass(element, { remove = [], add = [] }, timeout = 1000) {
  return new Promise((resolve) => {
    let eventFired = false;

    function handleTransitionEnd() {
      eventFired = true;
      resolve(element);
    }

    element.addEventListener("transitionend", handleTransitionEnd, {
      once: true,
    });

    // Fallback timeout to ensure promise always resolves
    setTimeout(() => {
      if (!eventFired) resolve(element);
    }, timeout);

    element.classList.remove(...remove);
    element.classList.add(...add);
  });
}
