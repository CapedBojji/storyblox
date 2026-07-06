import { mkdir, symlink, writeFile } from "node:fs/promises";
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

  test("follows pnpm-style symlinked package directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-rojo-"));
    await mkdir(join(dir, "packages", "widget", "out"), { recursive: true });
    await mkdir(join(dir, "node_modules", "@scope"), { recursive: true });
    await writeFile(join(dir, "packages", "widget", "out", "init.luau"), "return {}");
    await symlink(join(dir, "packages", "widget"), join(dir, "node_modules", "@scope", "widget"), "dir");
    await writeFile(
      join(dir, "default.project.json"),
      JSON.stringify({
        name: "Demo",
        tree: {
          $className: "DataModel",
          ReplicatedStorage: {
            rbxts_include: {
              node_modules: {
                "@scope": {
                  $path: "node_modules/@scope",
                },
              },
            },
          },
        },
      }),
    );

    const config = normalizeConfig(
      { root: "src", rojoProject: "default.project.json" },
      join(dir, "ui-claps.config.ts"),
    );

    const model = await loadRojoModel(config);
    expect(
      model.modulesByFile[join(dir, "node_modules", "@scope", "widget", "out", "init.luau")],
    ).toBe("game.ReplicatedStorage.rbxts_include.node_modules.@scope.widget.out");
  });

  test("uses package.json Luau main as a package root ModuleScript", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-rojo-"));
    await mkdir(join(dir, "node_modules", "@scope", "widget", "src"), { recursive: true });
    await writeFile(
      join(dir, "node_modules", "@scope", "widget", "package.json"),
      JSON.stringify({ main: "src/widget.luau" }),
    );
    await writeFile(join(dir, "node_modules", "@scope", "widget", "src", "widget.luau"), "return {}");
    await writeFile(
      join(dir, "default.project.json"),
      JSON.stringify({
        name: "Demo",
        tree: {
          $className: "DataModel",
          ReplicatedStorage: {
            rbxts_include: {
              node_modules: {
                "@scope": {
                  $path: "node_modules/@scope",
                },
              },
            },
          },
        },
      }),
    );

    const config = normalizeConfig(
      { root: "src", rojoProject: "default.project.json" },
      join(dir, "ui-claps.config.ts"),
    );

    const model = await loadRojoModel(config);
    expect(
      model.modulesByFile[join(dir, "node_modules", "@scope", "widget", "src", "widget.luau")],
    ).toBe("game.ReplicatedStorage.rbxts_include.node_modules.@scope.widget");
  });
});
