import { rollup } from "rollup";
import { basename } from "node:path";
import { createColors } from "picocolors";
import { createRequire } from "node:module";
import { rimraf } from "rimraf";
import { copyFile } from "node:fs/promises";
import typescript from "rollup-plugin-typescript2";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-polyfill-node";
import terser from "@rollup/plugin-terser";
import alias from "@rollup/plugin-alias";

const require = createRequire(import.meta.url);
const { globSync: fastGlobSync } = require("fast-glob");

const configFiles = fastGlobSync(["./**/*.config.ts", "./**/*.config.js"]);

const { green } = createColors();

await rimraf("../../dist");

const basePlugins = [
    alias({
        entries: [
            { find: "$wasm", replacement: "../../config/encoder" },
            { find: "$config", replacement: "../" },
        ],
    }),
    typescript({
        tsconfig: "../../tsconfig.json",
        tsconfigOverride: {
            compilerOptions: { allowImportingTsExtensions: false },
            exclude: ["config", "server.ts", "src"],
        },
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    terser(),
];

const swPlugins = [...basePlugins];

const plugins = [
    ...basePlugins.slice(0, 1),
    basePlugins[1],
    nodePolyfills(),
    basePlugins[2],
    basePlugins[3],
    basePlugins[4],
];

const configInput = Object.fromEntries(
    configFiles.map(file => {
        const base = basename(file).replace(/\.(config)\.(ts|js)$/, "");
        return [`${base}_config`, file];
    }),
);

const otherInput = {
    ...configInput,
    scramjet_init: "./scramjet/scramjetInit.ts",
};

for (const [name, file] of Object.entries(otherInput)) {
    const bundle = await rollup({
        input: file,
        treeshake: true,
        plugins,
    });

    const { output } = await bundle.write({
        dir: "../../dist",
        format: "iife",
        entryFileNames: `${name}.js`,
        name,
    });

    await bundle.close();

    for (const chunk of output) {
        console.log(green(chunk.fileName));
    }
}

const swBundle = await rollup({
    input: "./service/sw.ts",
    treeshake: true,
    plugins: swPlugins,
});

const { output: swOutput } = await swBundle.write({
    dir: "../../dist",
    format: "iife",
    entryFileNames: "sw.js",
    name: "sw",
    intro: "var document = { baseURI: self.location.origin };",
});

await swBundle.close();

for (const chunk of swOutput) {
    console.log(green(chunk.fileName));
}

await copyFile(
    "../../config/encoder/xor_encoder.wasm",
    "../../dist/xor_encoder.wasm",
);
