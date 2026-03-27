import { build } from "esbuild";
import server from "esbuild-server";
import { solidPlugin as solid } from "esbuild-plugin-solid";
import { rimraf } from "rimraf";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

await rimraf("dist");

const isDev = process.argv.includes("--dev");

const makeHtml = (scriptSrc, cssSrc) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Tab</title>
  ${cssSrc ? `<link rel="stylesheet" href="${cssSrc}" />` : ""}
</head>
<body>
  <div id="root"></div>
  <script src="${scriptSrc}"></script>
</body>
</html>
`;

/** @type {import("esbuild").BuildOptions} */
const config = {
    entryPoints: {
        index: "./src/index.tsx",
        newtab: "./src/newtab.tsx",
    },
    bundle: true,
    tsconfig: "./tsconfig.json",
    plugins: [solid()],
    alias: {
        "#lib": resolve("src/lib"),
        "#styles": resolve("src/styles"),
    },
    loader: { ".css": "css" },
    minify: !isDev,
    treeShaking: true,
    metafile: isDev,
    logLevel: "silent",
    outdir: "dist",
};

await build(config);

await writeFile("dist/index.html", makeHtml("./index.js", "./index.css"));
await writeFile("dist/newtab.html", makeHtml("./newtab.js", null));

if (isDev)
    server(undefined, {
        static: "dist",
        port: process.env.PORT || 8877,
    }).start();
