/**
 * A helper function to create an HTML element and add various properties to it.
 * Right now it just creates an element and adds classes, but it could be
 * extended to add other properties as well, as needed.
 *
 * @param {string} tagName - The name of the element to create (e.g. 'div')
 * @param {object} [options]
 * @param {string[]} [options.classes] - An array of class names to add to the element
 * @returns
 */
function createElement(tagName, { classes = [] } = {}) {
  const element = document.createElement(tagName);
  element.classList.add(...classes);

  return element;
}

export default createElement;
