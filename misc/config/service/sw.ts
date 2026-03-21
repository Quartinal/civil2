///<reference types="serviceworker" />

import type { UVConfig } from "@titaniumnetwork-dev/ultraviolet";
import type { ScramjetController } from "@mercuryworkshop/scramjet";
import { init, encode, decode } from "$config/shared/wasmDencode";
import genProxyPath from "$config/shared/genProxyPath";

declare global {
    interface Window {
        __uv$config: Partial<UVConfig>;
        scramjet: ScramjetController;
        UVServiceWorker: any;
    }
}

importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.sw.js");
importScripts("/scramjet/scramjet.all.js");

if (navigator.userAgent.includes("Firefox")) {
    Object.defineProperty(globalThis, "crossOriginIsolated", {
        value: true,
        writable: true,
    });
}

const ready = init().then(() => {
    const spf = genProxyPath("/", "uv");

    const files = ["uv.handler.js", "uv.client.js", "uv.bundle.js", "uv.sw.js"];
    const fileProps = Object.fromEntries(
        files.map(file => {
            const propName = file.split(".")[1];
            return [propName, `${spf}${file}`];
        }),
    );

    self.__uv$config = {
        prefix: genProxyPath("/~/", "uv"),
        encodeUrl: encode,
        decodeUrl: decode,
        ...fileProps,
        config: "/uv_config.js",
    };

    return {
        uv: new self.UVServiceWorker(),
        scramjet: new ($scramjetLoadWorker().ScramjetServiceWorker)(),
    };
});

async function swResponse(event: FetchEvent) {
    const { uv, scramjet } = await ready;

    await scramjet.loadConfig();

    const { request } = event;

    if (
        request.url.startsWith(self.location.origin + self.__uv$config.prefix)
    ) {
        return await uv.fetch(event);
    } else if (scramjet.route(event)) {
        return await scramjet.fetch(event);
    }

    return await fetch(request);
}

self.addEventListener("fetch", async (event: FetchEvent) => {
    event.respondWith(swResponse(event));
});
