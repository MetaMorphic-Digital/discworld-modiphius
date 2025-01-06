/**
 * Avoid callback hell by wrapping `transitionend` event in a Promise,
 * allowing chaining of transitions with cleaner code.
 *
 * Adds specified class names to trigger transition.
 *
 * @param {HTMLElement} element - The DOM element to which class names will be added.
 * @param {string[]} classNames - An array of class names to be added to the element.
 * @returns {Promise<HTMLElement>} A promise that resolves with the element
 * once the CSS transition has ended.
 */

export default function transitionClass(
  element,
  classNames,
  { remove = false } = {},
) {
  return new Promise((resolve) => {
    function handleTransitionEnd() {
      resolve(element);
    }

    element.addEventListener("transitionend", handleTransitionEnd, {
      once: true,
    });

    if (remove) {
      element.classList.remove(...classNames);
      return;
    }
    element.classList.add(...classNames);
  });
}
