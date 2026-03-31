import { defineConfig } from "@solidjs/start/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import JavascriptObfuscator from "javascript-obfuscator";
import type { Plugin } from "vite";
import { sitemapPlugin as sitemap } from "vite-plugin-sitemap-from-routes";
import { robots, BLOCK_AI_ALLOW_REST } from "vite-plugin-robots-ts";
import postcssConfig from "./postcss.config.js";

const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: "mangled" as const,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: [] as never[],
    stringArrayCallsTransform: false,
    stringArrayThreshold: 0.5,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    ignoreImports: true,
} satisfies Parameters<typeof JavascriptObfuscator.obfuscate>[1];

function clientObfuscator(): Plugin {
    return {
        name: "client-obfuscator",
        apply: "build",
        enforce: "post",
        generateBundle(_, bundle) {
            for (const chunk of Object.values(bundle)) {
                if (chunk.type === "chunk" && chunk.code) {
                    chunk.code = JavascriptObfuscator.obfuscate(
                        chunk.code,
                        obfuscationOptions,
                    ).getObfuscatedCode();
                }
            }
        },
    };
}

export default defineConfig({
    vite({ router }: { router: string }) {
        return {
            plugins: [
                tanstackRouter({ target: "solid" }),
                tsconfigPaths(),
                router === "client" && clientObfuscator(),
                sitemap({
                    // change this to your domain
                    baseUrl: "https://civil.quartinal.me",
                    routesFile: "src/routeTree.gen.ts",
                }),
                robots({
                    // because claude is ethical
                    content: BLOCK_AI_ALLOW_REST.replace(
                        /\n?User-agent:\s*ClaudeBot\s*\nDisallow:\s*\/\s*\n?/g,
                        "\n",
                    ),
                }),
            ],
            css: {
                postcss: postcssConfig,
            },
        };
    },
    server: {
        preset: "node",
    },
});
