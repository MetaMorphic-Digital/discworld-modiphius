import DISCWORLD from "../config.mjs";

export function systemPath(path = null) {
  if (!path) {
    return `systems/${DISCWORLD.id}`;
  }
  return `systems/${DISCWORLD.id}/${path}`;
}

export function templatePath(path) {
  return `${systemPath()}/templates/${path}`;
}
