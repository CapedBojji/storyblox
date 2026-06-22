import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { getMissingConfigMessage, loadUiClapsConfig, normalizeConfig } from "../src/node/config.js";

describe("config", () => {
  test("normalizes paths and defaults", () => {
    const config = normalizeConfig(
      {
        root: "src",
        rojoProject: "default.project.json",
        aliases: {
          "@pkg": "Packages",
        },
      },
      "/workspace/ui-claps.config.ts",
    );

    expect(config.root).toBe("/workspace/src");
    expect(config.rojoProject).toBe("/workspace/default.project.json");
    expect(config.aliases["@pkg"]).toBe("/workspace/Packages");
    expect(config.zuneCommand).toBe("zune");
    expect(config.port).toBe(4500);
  });

  test("errors with a helpful missing config message", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-config-"));
    await expect(loadUiClapsConfig("ui-claps.config.ts", dir)).rejects.toThrow(
      getMissingConfigMessage(join(dir, "ui-claps.config.ts")),
    );
  });

  test("loads a TypeScript config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-config-"));
    await writeFile(
      join(dir, "ui-claps.config.ts"),
      [
        "import { defineConfig } from './define';",
        "export default defineConfig({ root: 'src', rojoProject: 'default.project.json', port: 4555 });",
      ].join("\n"),
    );
    await writeFile(join(dir, "define.ts"), "export const defineConfig = (config: unknown) => config;");

    const config = await loadUiClapsConfig("ui-claps.config.ts", dir);
    expect(config.port).toBe(4555);
    expect(config.root).toBe(join(dir, "src"));
  });
});
