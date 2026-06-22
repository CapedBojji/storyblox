import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

await mkdir(resolve(root, "dist"), { recursive: true });
await cp(resolve(root, "luau"), resolve(root, "dist", "luau"), {
  recursive: true,
  force: true,
});
