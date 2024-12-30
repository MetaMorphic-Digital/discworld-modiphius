// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: "./styles/index.scss", // Entry file for Rollup
      output: {
        assetFileNames: "main.css", // Output file path
      },
    },
    outDir: "./styles", // Base output directory
    emptyOutDir: false,
    watch: {},
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: "", // Any global SCSS variables or mixins can be added here
      },
    },
  },
});
