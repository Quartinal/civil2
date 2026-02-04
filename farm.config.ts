import { defineConfig } from "@farmfe/core";
import preact from "@preact/preset-vite";
import postcss from "@farmfe/js-plugin-postcss";
import react from "@farmfe/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vitePlugins: [preact(), tsconfigPaths()],
  plugins: [postcss(), react()],
});
