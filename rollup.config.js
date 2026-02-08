import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import alias from "@rollup/plugin-alias";
import fastGlobModule from "fast-glob";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import tsconfig from "./tsconfig.json" with { type: "json" };

const { globSync: fastGlobSync } = fastGlobModule;

const configFiles = fastGlobSync([
  "config/**/*.config.ts",
  "config/**/*.config.js",
]);

const input = Object.fromEntries(
  configFiles.map(file => {
    const base = basename(file).replace(/\.(config)\.(ts|js)$/, "");
    const name = `${base}_config`;
    return [name, file];
  }),
);

/** @type {import("rollup").RollupOptions} */
export default {
  input,
  plugins: [
    alias({
      entries: [
        {
          find: "$wasmEncode",
          replacement: fileURLToPath(
            new URL("./misc/encoder", import.meta.url),
          ),
        },
      ],
    }),
    typescript({
      tsconfigDefaults: tsconfig,
      tsconfigOverride: {
        compilerOptions: {
          allowImportingTsExtensions: false,
        },
        exclude: ["src"],
      },
    }),
    terser(),
  ],
  output: {
    dir: "dist-config",
    format: "es",
    entryFileNames: "[name].js",
  },
};
