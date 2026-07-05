import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const target = args[0] ?? `${process.platform}-${process.arch}`;
const releaseDir = resolve(root, "release");
const stageDir = resolve(tmpdir(), `ui-claps-release-${target}`);
const libDir = resolve(stageDir, "lib");
const binDir = resolve(stageDir, "bin");
const archivePath = resolve(releaseDir, `ui-claps-${target}.tar.gz`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

await rm(stageDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });
await mkdir(libDir, { recursive: true });
await mkdir(binDir, { recursive: true });

await cp(resolve(root, "dist"), resolve(libDir, "dist"), {
  recursive: true,
  force: true,
});
await cp(resolve(root, "package.json"), resolve(libDir, "package.json"));
await cp(resolve(root, "pnpm-lock.yaml"), resolve(libDir, "pnpm-lock.yaml"));

run("pnpm", ["install", "--prod", "--frozen-lockfile", "--ignore-scripts"], {
  cwd: libDir,
});

await writeFile(
  resolve(binDir, "ui-claps"),
  [
    "#!/usr/bin/env sh",
    "set -eu",
    "root=$(CDPATH= cd -- \"$(dirname -- \"$0\")/..\" && pwd)",
    "exec node \"$root/lib/dist/node/cli.js\" \"$@\"",
    "",
  ].join("\n"),
  { mode: 0o755 },
);

await rm(archivePath, { force: true });
run("tar", ["-czf", archivePath, "-C", stageDir, "."]);
console.log(`Wrote ${archivePath}`);
