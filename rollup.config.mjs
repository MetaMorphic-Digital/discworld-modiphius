import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "./_discworld.mjs",
  output: {
    file: "./public/discworld.mjs",
    format: "esm",
  },
  plugins: [resolve()],
};
