// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { createMemoryHistory } from "@tanstack/solid-router";
import { router } from "./router";
import { For } from "solid-js";
import type { FetchEvent } from "@solidjs/start/server";

const routerLoad = async (event: FetchEvent) => {
    const url = new URL(event.request.url);
    const path = url.href.replace(url.origin, "");

    router.update({
        history: createMemoryHistory({
            initialEntries: [path],
        }),
    });

    await router.load();
};

const scriptPaths = [
    "/uv/uv.bundle.js",
    "/uv_config.js",
    "/uv/uv.sw.js",
    "/scramjet/scramjet.all.js",
    "/scramjet_init.js",
    "/sw.js",
];

export default createHandler(
    () => (
        <StartServer
            document={({ assets, children, scripts }) => (
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1"
                        />
                        <link rel="icon" href="/favicon.ico" />
                        <script src="/baremux/index.js" />
                        <For each={scriptPaths}>
                            {path => <script defer src={path} />}
                        </For>
                        {assets}
                    </head>
                    <body>
                        <div id="app">{children}</div>
                        {scripts}
                    </body>
                </html>
            )}
        />
    ),
    undefined,
    routerLoad,
);
