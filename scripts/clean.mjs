import { rm } from "node:fs/promises";
import { resolve } from "node:path";

await rm(resolve("dist"), { recursive: true, force: true });
await rm(resolve("tsconfig.node.tsbuildinfo"), { force: true });
await rm(resolve("tsconfig.app.tsbuildinfo"), { force: true });
