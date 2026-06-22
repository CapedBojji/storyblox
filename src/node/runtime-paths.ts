import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveRuntimeFile(fileName: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../luau", fileName),
    resolve(here, "../luau", fileName),
    resolve(process.cwd(), "luau", fileName),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not locate UI Claps runtime file ${fileName}.`);
  }

  return found;
}

export type ClientAssetMode =
  | {
      mode: "vite";
      root: string;
      configFile: string;
    }
  | {
      mode: "static";
      root: string;
      indexHtml: string;
    };

export function resolveClientAssets(): ClientAssetMode {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceRoot = resolve(here, "../..");
  const sourceIndex = resolve(sourceRoot, "index.html");
  const sourceConfig = resolve(sourceRoot, "vite.config.ts");

  if (existsSync(sourceIndex) && existsSync(sourceConfig)) {
    return {
      mode: "vite",
      root: sourceRoot,
      configFile: sourceConfig,
    };
  }

  const builtRoot = resolve(here, "../client");
  const builtIndex = resolve(builtRoot, "index.html");

  if (existsSync(builtIndex)) {
    return {
      mode: "static",
      root: builtRoot,
      indexHtml: builtIndex,
    };
  }

  throw new Error("Could not locate UI Claps preview app assets.");
}
