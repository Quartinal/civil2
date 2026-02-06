import type { Request, Response } from "express";
import type { Socket } from "node:net";
import type { Server } from "node:http";

export default class RammerheadRouting {
  static #rammerheadScopes: Array<string> & { length: 15 } = [
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

  static shouldRouteRammerhead(req: Request) {
    const url = new URL(req.url, "http://0.0.0.0");
    return (
      this.#rammerheadScopes.includes(url.pathname) ||
      url.pathname.match(/^\/[a-z0-9]{32}/)
    );
  }

  static routeRammerheadRequest(
    rammerhead: Server,
    req: Request,
    res: Response,
  ) {
    rammerhead.emit("request", req, res);
  }

  static routeRammerheadUpgrade(
    rammerhead: Server,
    req: Request,
    socket: Socket,
    head: any,
  ) {
    rammerhead.emit("upgrade", req, socket, head);
  }
}
