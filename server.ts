import express from "express";
import compression from "compression";

import { resolve } from "node:path";
import { createServer } from "node:http";
import { existsSync } from "node:fs";

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

// @ts-expect-error bro untyped module smh
import createRammerhead from "rammerhead";

const transportModulePrefix = "node_modules/@mercuryworkshop";
const { epoxyPath, libcurlPath, baremodulePath } = {
  epoxyPath: resolve(
    import.meta.dirname,
    transportModulePrefix,
    "epoxy-transport/dist",
  ),
  libcurlPath: resolve(
    import.meta.dirname,
    transportModulePrefix,
    "libcurl-transport/dist",
  ),
  baremodulePath: resolve(
    import.meta.dirname,
    transportModulePrefix,
    "bare-transport/dist",
  ),
};

import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// @ts-expect-error bro untyped module smh
import { logging, server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";

import type { NextFunction, Request, Response } from "express";
import type { Socket } from "node:net";
import type { Server } from "node:http";

import packageJson from "./package.json" with { type: "json" };

class RammerheadRouting {
  static #scopes: Array<string> & { length: 15 } = [
    "/rammerhead.js",
    "/hammerhead.js",
    "/transport-worker.js",
    "/task.js",
    "/iframe-task.js",
    "/worker-hammerhead.js",
    "/messaging",
    "/sessionexists",
    "/deletesession",
    "/newsession",
    "/editsession",
    "/needpassword",
    "/syncLocalStorage",
    "/api/shuffleDict",
    "/mainport",
  ];

  static shouldRoute(req: Request) {
    const url = new URL(req.url, "http://0.0.0.0");
    return (
      this.#scopes.includes(url.pathname) ||
      url.pathname.match(/^\/[a-z0-9]{32}/)
    );
  }

  static routeRequest(rammerhead: Server, req: Request, res: Response) {
    rammerhead.emit("request", req, res);
  }

  static routeUpgrade(
    rammerhead: Server,
    req: Request,
    socket: Socket,
    head: any,
  ) {
    rammerhead.emit("upgrade", req, socket, head);
  }
}

import { execSync } from "node:child_process";

import { createColors } from "picocolors";

const { yellow, blue } = createColors();

const build = () =>
  execSync(`bunx ${packageJson.scripts.build}`, { stdio: "inherit" });

if (
  !(
    existsSync(resolve(import.meta.dirname, ".vinxi")) ||
    existsSync(resolve(import.meta.dirname, ".output"))
  )
) {
  console.log(yellow("no build found, building..."));
  build();
}

const app = express();
const server = createServer(app);

const PORT = Number(process.env.PORT) || 9876;

app.use(compression());

const servicePathMaps: Record<string, string> = {
  "/uv": uvPath,
  "/scramjet": scramjetPath,
  "/epoxy": epoxyPath,
  "/libcurl": libcurlPath,
  "/baremod": baremodulePath,
  "/baremux": baremuxPath,
};

Object.entries(servicePathMaps).forEach(([route, path]) => {
  app.use(route, express.static(path));
});

const rammerheadReverseProxy = Boolean(process.env.REVERSE_PROXY) || false;

const rammerhead = createRammerhead({
  reverseProxy: rammerheadReverseProxy,
});

const bare = createBareServer("/bare/");

app.use((req, res, next) => {
  if (RammerheadRouting.shouldRoute(req)) {
    RammerheadRouting.routeRequest(rammerhead, req, res);
  } else if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

const { handler: ssrHandler } = await import("./.output/server/index.mjs");

app.use(express.static(resolve(import.meta.dirname, ".output/public")));
app.use(ssrHandler);

function shouldRouteWisp(req: Request, endingUrl?: string) {
  return req.url?.endsWith(endingUrl || "/wisp/");
}

logging.set_level(logging.ERROR);

server.on("upgrade", (req: Request, socket: Socket, head) => {
  if (RammerheadRouting.shouldRoute(req)) {
    RammerheadRouting.routeUpgrade(rammerhead, req, socket, head);
  } else if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else if (shouldRouteWisp(req)) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(blue(`server is running at http://localhost:${PORT}`));
});
