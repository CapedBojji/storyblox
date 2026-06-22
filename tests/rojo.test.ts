import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { normalizeConfig } from "../src/node/config.js";
import { loadRojoModel } from "../src/node/rojo.js";

describe("rojo", () => {
  test("expands a project tree into virtual instances", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-rojo-"));
    await mkdir(join(dir, "src", "Components"), { recursive: true });
    await writeFile(join(dir, "src", "Components", "Button.luau"), "return {}");
    await writeFile(
      join(dir, "default.project.json"),
      JSON.stringify({
        name: "Demo",
        tree: {
          $className: "DataModel",
          ReplicatedStorage: {
            $className: "ReplicatedStorage",
            $path: "src",
          },
        },
      }),
    );

    const config = normalizeConfig(
      { root: "src", rojoProject: "default.project.json" },
      join(dir, "ui-claps.config.ts"),
    );

    const model = await loadRojoModel(config);
    const filePath = join(dir, "src", "Components", "Button.luau");

    expect(model.root.instancePath).toBe("game");
    expect(model.modulesByFile[filePath]).toBe("game.ReplicatedStorage.Components.Button");
  });
});
