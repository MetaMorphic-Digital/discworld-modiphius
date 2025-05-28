import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import postcssImport from "postcss-import";

export default {
  input: "./_discworld.mjs",
  output: {
    file: "./public/discworld.mjs",
    format: "esm",
  },
  plugins: [
    resolve(),
    postcss({
      plugins: [postcssImport()],
      extract: true,
    }),
  ],
};
