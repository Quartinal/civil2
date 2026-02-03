import { defineConfig } from "@farmfe/core";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vitePlugins: [preact(), tailwindcss()],
});
