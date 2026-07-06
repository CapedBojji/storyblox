import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { discoverProject } from "../src/node/discovery.js";
import { normalizeConfig } from "../src/node/config.js";

describe("discovery", () => {
  test("finds stories and optional storybooks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-discovery-"));
    await mkdir(join(dir, "src", "Buttons"), { recursive: true });
    await writeFile(join(dir, "src", "Buttons", "Primary.story.luau"), "return {}");
    await writeFile(join(dir, "src", "Buttons", "Buttons.storybook.luau"), "return {}");
    await writeFile(join(dir, "src", "Loose.stories.lua"), "return {}");

    const config = normalizeConfig(
      { root: "src", rojoProject: "default.project.json" },
      join(dir, "ui-claps.config.ts"),
    );

    const project = await discoverProject(config);
    expect(project.stories).toHaveLength(2);
    expect(project.storybooks).toHaveLength(1);
    expect(project.stories.find((story) => story.name === "Primary")?.group).toBe("Buttons");
    expect(project.stories.find((story) => story.name === "Loose")?.group).toBe("Unknown Stories");
  });

  test("can discover compiled stories from a separate story root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ui-claps-discovery-"));
    await mkdir(join(dir, "out", "client", "ui"), { recursive: true });
    await writeFile(join(dir, "out", "client", "ui", "Hud.story.luau"), "return {}");

    const config = normalizeConfig(
      {
        root: "src",
        storyRoot: "out",
        rojoProject: "default.project.json",
      },
      join(dir, "ui-claps.config.ts"),
    );

    const project = await discoverProject(config);
    expect(project.root).toBe(join(dir, "out"));
    expect(project.stories).toHaveLength(1);
    expect(project.stories[0]?.relativePath).toBe("client/ui/Hud.story.luau");
  });
});
