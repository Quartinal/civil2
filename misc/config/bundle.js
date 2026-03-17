import { build } from "esbuild";
import { basename } from "node:path";
import { createColors } from "picocolors";
import tsconfig from "../../tsconfig.json" with { type: "json" };
import { createRequire } from "node:module";
import { rimraf } from "rimraf";
import { copyFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

const { globSync: fastGlobSync } = require("fast-glob");

const configFiles = fastGlobSync(["./**/*.config.ts", "./**/*.config.js"]);

const input = Object.fromEntries([
    ...configFiles.map(file => {
        const base = basename(file).replace(/\.(config)\.(ts|js)$/, "");
        const name = `${base}_config`;
        return [name, file];
    }),
    ["sw", "./service/sw.ts"],
    ["scramjet_init", "./scramjet/scramjetInit.ts"],
]);

const { green } = createColors();

await rimraf("../../dist");

const result = await build({
    entryPoints: input,
    treeShaking: true,
    minify: true,
    tsconfigRaw: JSON.stringify({
        ...tsconfig,
        compilerOptions: {
            ...tsconfig.compilerOptions,
            baseUrl: "../..",
        },
    }),
    bundle: true,
    target: "esnext",
    platform: "browser",
    format: "esm",
    outdir: "../../dist",
    metafile: true,
});

await copyFile(
    "../../config/encoder/xor_encoder.wasm",
    "../../dist/xor_encoder.wasm",
);

for (const file of Object.keys(result.metafile.outputs)) {
    console.log(green(basename(file)));
}
