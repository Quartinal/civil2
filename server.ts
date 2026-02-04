import express from "express";
import compression from "compression";

import { resolve } from "node:path";
import { createServer } from "node:http";
import { existsSync } from "node:fs";

import { build } from "@farmfe/core";

import config from "./farm.config.ts";

if (!existsSync(resolve(import.meta.dirname, "dist"))) {
  console.log("Building the project...");
  await build(config as any);
}

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 9876;

app.use(express.static(resolve(import.meta.dirname, "dist")));
app.use(compression());

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
