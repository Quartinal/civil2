import express from "express";
import compression from "compression";

import { resolve } from "node:path";
import { createServer } from "node:http";
import { existsSync } from "node:fs";

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

// @ts-expect-error
import createRammerhead from "rammerhead";

// @ts-expect-error
import { epoxyPath } from "./node_modules/@mercuryworkshop/epoxy-transport/lib/index.cjs";
// @ts-expect-error
import { bareModulePath } from "./node_modules/@mercuryworkshop/bare-transport/lib/index.cjs";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// @ts-expect-error
import { logging, server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";

import RammerheadRouting from "./server/RammerheadRouting.ts";

import { build } from "@farmfe/core";

import config from "./farm.config.ts";

import type { Socket } from "node:net";
import type { Request } from "express";

if (!existsSync(resolve(import.meta.dirname, "dist"))) {
  console.log("building the project...");
  await build(config as any);
}

const app = express();
const server = createServer(app);

const PORT = Number(process.env.PORT) || 9876;

app.use(express.static(resolve(import.meta.dirname, "dist")));
app.use("/config", express.static(resolve(import.meta.dirname, "dist-config")));
app.use(compression());

const libcurlPath = resolve(
  ".",
  "node_modules/@mercuryworkshop/libcurl-transport",
  "dist",
);

const servicePathMaps: Record<string, string> = {
  "/uv": uvPath,
  "/scramjet": scramjetPath,
  "/epoxy": epoxyPath,
  "/libcurl": libcurlPath,
  "/baremod": bareModulePath,
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

logging.set_level(logging.ERROR);

function shouldRouteWisp(req: Request, endingUrl?: string) {
  return req.url?.endsWith(endingUrl || "/wisp/");
}

server.on("upgrade", (req: Request, socket: Socket, head) => {
  if (RammerheadRouting.shouldRoute(req)) {
    RammerheadRouting.routeUpgrade(rammerhead, req, socket, head);
  } else if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else if (shouldRouteWisp(req)) {
    wisp.routeRequest(req, socket, head);
  }
});

server.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
