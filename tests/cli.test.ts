import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveConfigPath } from "../src/node/cli.js";

describe("cli", () => {
  test("defaults to ui-claps.config.ts in the current directory", () => {
    expect(resolveConfigPath()).toBe(resolve("ui-claps.config.ts"));
  });

  test("resolves a project folder to its config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-cli-"));
    await mkdir(join(dir, "project"));

    expect(resolveConfigPath(join(dir, "project"))).toBe(join(dir, "project", "ui-claps.config.ts"));
  });

  test("keeps an explicit config file target", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-cli-"));
    const config = join(dir, "custom.config.ts");
    await writeFile(config, "export default {};");

    expect(resolveConfigPath(config)).toBe(config);
  });

  test("prefers --config over a folder target", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-cli-"));
    const config = join(dir, "ui-claps.config.ts");
    await writeFile(config, "export default {};");

    expect(resolveConfigPath(join(dir, "ignored"), config)).toBe(config);
  });
});
