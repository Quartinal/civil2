///<reference types="serviceworker" />

import type { UVConfig } from "@titaniumnetwork-dev/ultraviolet";
import genSwFilePath from "$config/shared/genSwFilePath";
import type { ScramjetController } from "@mercuryworkshop/scramjet";

declare global {
  interface Window {
    __uv$config: Partial<UVConfig>;
    scramjet: ScramjetController;
    UVServiceWorker: any;
  }
}

const proxyFiles = {
  uv: ["uv.handler.js", "uv.client.js", "uv.bundle.js", "uv.sw.js"],
  scramjet: ["scramjet.all.js"],
};

importScripts("/uv_config.js");

Object.entries(proxyFiles).forEach(([proxy, [file]]) => {
  importScripts(genSwFilePath(proxy, file));
});

const serviceWorkers = {
  uv: new self.UVServiceWorker(),
  scramjet: new ($scramjetLoadWorker().ScramjetServiceWorker)(),
};

if (navigator.userAgent.includes("Firefox")) {
  Object.defineProperty(globalThis, "crossOriginIsolated", {
    value: true,
    writable: true,
  });
}

async function swResponse(event: FetchEvent) {
  const { uv, scramjet } = serviceWorkers;

  await scramjet.loadConfig();

  const { request } = event;

  if (
    request.url.startsWith(window.location.origin + self.__uv$config.prefix)
  ) {
    return await uv.fetch(event);
  } else if (scramjet.route(event)) {
    return await scramjet.fetch(event);
  }

  return await fetch(request);
}

self.addEventListener("fetch", async (event: FetchEvent) => {
  event.respondWith(await swResponse(event));
});
