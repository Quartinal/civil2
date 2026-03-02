import { defineConfig } from "@solidjs/start/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import postcssConfig from "./postcss.config.js";

export default defineConfig({
  vite: {
    // @ts-expect-error
    plugins: [tanstackRouter({ target: "solid" })],
    css: {
      postcss: postcssConfig,
    },
  },
  server: {
    preset: "node",
  },
});
