import { parse as parseToml } from "smol-toml";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import argvSplitted from "./argvSplitted.ts";

import type { Express } from "express";

type App = {
  url?: string;
  icon?: string;
}[];

type Apps = Record<string, App>;

function parseToObject(fileName: string): Apps {
  const fileIndex = argvSplitted.indexOf(fileName);

  if (fileIndex === -1) {
    const fileArg = "apps.toml";
    const contents = readFileSync(resolve(".", "config", fileArg), "utf8");
    return parseToml(contents) as Apps;
  }

  const fileArg = argvSplitted[fileIndex + 1];

  if (!fileArg) {
    throw new Error("config file flag provided but no file specified");
  }

  const extension = fileArg.slice(fileArg.lastIndexOf("."));

  if (![".json", ".toml"].includes(extension)) {
    throw new Error(`unsupported file type: ${extension}`);
  }

  const contents = readFileSync(resolve(".", "config", fileArg), "utf8");

  return extension === ".toml"
    ? (parseToml(contents) as Apps)
    : (JSON.parse(contents) as Apps);
}

const apps = parseToObject("apps");

function getApp(appName: string): App | undefined {
  return apps[appName];
}

if (argvSplitted.includes("dev")) {
  console.log("apps loaded:", apps);
  console.log("amazon app example:", getApp("amazon"));
}

export default function useRoutes(app: Express) {
  // apps
  app.use("/apps/", (_, res) => {
    res.json(Object.values(apps));
  });
}
