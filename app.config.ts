import { defineConfig } from "@solidjs/start/config";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import obfuscator from "vite-plugin-bundle-obfuscator";
import sitemap from "vite-plugin-sitemap";
import postcssConfig from "./postcss.config.js";

// credits to dogeub for this configuration
const obfuscationConfig = {
    enable: true,
    autoExcludeNodeModules: true,
    threadPool: false,
    options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.3,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: "mangled",
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayEncoding: [],
        stringArrayCallsTransform: false,
        stringArrayThreshold: 0.5,
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
        ignoreImports: true,
    },
};

export default defineConfig({
    vite: {
        plugins: [
            // @ts-expect-error
            tanstackRouter({ target: "solid" }),
            tsconfigPaths(),
            // @ts-expect-error
            obfuscator(obfuscationConfig),
            sitemap(),
        ],
        css: {
            postcss: postcssConfig,
        },
    },
    server: {
        preset: "node",
    },
});
