import { defineConfig } from "@solidjs/start/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { sitemapPlugin as sitemap } from "vite-plugin-sitemap-from-routes";
import { robots, BLOCK_AI_ALLOW_REST } from "vite-plugin-robots-ts";
import { vanillaExtractPlugin as vanillaExtract } from "@vanilla-extract/vite-plugin";
import { browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import terser from "@rollup/plugin-terser";
import nodePolyfills from "rollup-plugin-polyfill-node";

const cssTargets = browserslistToTargets(
    browserslist("last 2 years, > 0.5%, not dead"),
);

const terserOptions: Parameters<typeof terser>[0] = {
    compress: {
        passes: 3,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        pure_getters: true,
        inline: 3,
        evaluate: true,
        dead_code: true,
        drop_debugger: true,
        negate_iife: false,
        sequences: true,
        conditionals: true,
        comparisons: true,
        if_return: true,
        join_vars: true,
        collapse_vars: true,
        reduce_vars: true,
        hoist_funs: true,
        loops: true,
        typeofs: true,
    },
    mangle: {
        toplevel: true,
        safari10: true,
    },
    format: {
        comments: false,
        ascii_only: true,
    },
};

export default defineConfig({
    vite: {
        build: {
            minify: false,
            cssMinify: "lightningcss",
            rollupOptions: {
                plugins: [terser(terserOptions)],
                output: {
                    manualChunks(id: string) {
                        if (
                            id.includes("/echarts/") ||
                            id.includes("/zrender/")
                        )
                            return "vendor-echarts";
                    },
                },
            },
        },
        css: {
            transformer: "lightningcss",
            lightningcss: {
                targets: cssTargets,
                drafts: { customMedia: true },
                minify: true,
            },
        },
        plugins: [
            tanstackRouter({ target: "solid" }),
            tsconfigPaths(),
            vanillaExtract(),
            sitemap({
                baseUrl: "https://civil.quartinal.me",
                routesFile: "src/routeTree.gen.ts",
            }),
            robots({
                content: BLOCK_AI_ALLOW_REST.replace(
                    /\n?User-agent:\s*ClaudeBot\s*\nDisallow:\s*\/\s*\n?/g,
                    "\n",
                ),
            }),
            nodePolyfills(),
        ],
    },
    server: {
        preset: "node",
    },
});
