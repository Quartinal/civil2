import { defineConfig } from "@solidjs/start/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import postcssConfig from "./postcss.config.js";

export default defineConfig({
  vite: {
    plugins: [
      // @ts-expect-error
      tanstackRouter({ target: "solid" }),
      tsconfigPaths(),
    ],
    css: {
      postcss: postcssConfig,
    },
  },
  server: {
    preset: "node",
  },
});
