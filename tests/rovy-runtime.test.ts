import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { normalizeConfig } from "../src/node/config.js";
import { discoverProject } from "../src/node/discovery.js";
import { loadRojoModel } from "../src/node/rojo.js";
import { renderStory } from "../src/node/zune.js";
import type { ResolvedUiClapsConfig } from "../src/node/types.js";

const zunePath = execFileSync("mise", ["which", "zune"], { encoding: "utf8" }).trim();

describe("rovy runtime stories", () => {
  test("captures story print and warn output", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return {
  name = "Output Logs",
  render = function()
    print("a", "b")
    warn("careful")
    return UI.create("TextLabel", {
      Text = "Logged",
    })
  end,
}
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.output).toEqual([
      { level: "print", message: "a\tb" },
      { level: "warn", message: "careful" },
    ]);
  });

  test("renders a vide runtime story without extra setup", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Vide Noop",
  runtime = "vide",
  app = function()
    return { flush = function() end }
  end,
  render = function(ctx)
    local label = Instance.new("TextLabel")
    label.Name = "VideLabel"
    label.Text = ctx.props.text
    return label
  end,
  controls = {
    text = UI.control.string("hello"),
  },
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.className).toBe("TextLabel");
    expect(response.tree?.name).toBe("VideLabel");
    expect(response.tree?.props.Text).toBe("hello");
  });

  test("creates a default Rovy UI root and runs a returned frame callback", async () => {
    const project = await createRovyFixture({
      includeRovyUi: true,
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Rovy UI Default Root",
  runtime = "rovy-ui",
  app = function()
    return { flush = function() end }
  end,
  render = function(ctx)
    return function()
      ctx.runtime.rovyUi.label("Default root")
    end
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.className).toBe("TextLabel");
    expect(response.tree?.props.Text).toBe("Default root");
  });

  test("supports custom single and multi-root Rovy UI configs", async () => {
    const singleRootProject = await createRovyFixture({
      includeRovyUi: true,
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Rovy UI Single Root",
  runtime = {
    kind = "rovy-ui",
    roots = function(ctx)
      local root = Instance.new("Frame")
      root.Name = "CustomRoot"
      root.Parent = ctx.target
      return root
    end,
  },
  app = function()
    return { flush = function() end }
  end,
  render = function(ctx)
    return function()
      ctx.runtime.rovyUi.label("Inside custom root")
    end
  end,
})
`,
    });

    const single = await renderFixture(singleRootProject);
    expect(single.ok).toBe(true);
    expect(single.tree?.name).toBe("CustomRoot");
    expect(single.tree?.children[0]?.props.Text).toBe("Inside custom root");

    const multiRootProject = await createRovyFixture({
      includeRovyUi: true,
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Rovy UI Multi Root",
  runtime = {
    kind = "rovy-ui",
    roots = function(ctx)
      local first = Instance.new("Frame")
      first.Name = "FirstRoot"
      first.Parent = ctx.target
      local second = Instance.new("Frame")
      second.Name = "SecondRoot"
      second.Parent = ctx.target
      return { first, second }
    end,
  },
  app = function()
    return { flush = function() end }
  end,
  render = function(ctx)
    ctx.runtime.startAll(function(_, index)
      ctx.runtime.rovyUi.label("Root " .. tostring(index))
    end)
  end,
})
`,
    });

    const multi = await renderFixture(multiRootProject);
    expect(multi.ok).toBe(true);
    expect(multi.tree?.children).toHaveLength(2);
    expect(multi.tree?.children[0]?.name).toBe("FirstRoot");
    expect(multi.tree?.children[0]?.children[0]?.props.Text).toBe("Root 1");
    expect(multi.tree?.children[1]?.name).toBe("SecondRoot");
    expect(multi.tree?.children[1]?.children[0]?.props.Text).toBe("Root 2");
  });

  test("passes custom runtime return values and runs cleanup", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")
local cleaned = false

return UI.rovy:story({
  name = "Custom Runtime",
  runtime = function(ctx)
    table.insert(ctx.cleanup, function()
      cleaned = true
    end)
    return { text = "custom value" }
  end,
  app = function()
    return { flush = function() end }
  end,
  render = function(ctx)
    local label = Instance.new("TextLabel")
    label.Text = ctx.runtime.text
    return label
  end,
  cleanup = function()
    if not cleaned then
      error("cleanup callbacks should run before story cleanup")
    end
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.props.Text).toBe("custom value");
  });

  test("reports invalid Rovy app and Rovy UI roots clearly", async () => {
    const missingApp = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")
return UI.rovy:story({
  name = "Missing App",
  render = function() end,
})
`,
    });
    const missingAppResponse = await renderFixture(missingApp);
    expect(missingAppResponse.ok).toBe(false);
    expect(missingAppResponse.error?.message).toContain("Rovy story must include app(props).");

    const invalidRoots = await createRovyFixture({
      includeRovyUi: true,
      story: `
local UI = require("@ui-claps/adapter")
return UI.rovy:story({
  name = "Invalid Roots",
  runtime = {
    kind = "rovy-ui",
    roots = function()
      return {}
    end,
  },
  app = function()
    return {}
  end,
  render = function() end,
})
`,
    });
    const invalidRootsResponse = await renderFixture(invalidRoots);
    expect(invalidRootsResponse.ok).toBe(false);
    expect(invalidRootsResponse.error?.message).toContain(
      "Rovy UI runtime roots must include at least one Instance.",
    );
  });
});

async function createRovyFixture(options: {
  story: string;
  includeRovyUi?: boolean;
}): Promise<{ config: ResolvedUiClapsConfig; storyPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), "ui-claps-rovy-"));
  await mkdir(join(dir, "src"), { recursive: true });
  await mkdir(join(dir, "node_modules", "@rovy"), { recursive: true });
  await writeFile(join(dir, "src", "Example.story.luau"), options.story);

  if (options.includeRovyUi) {
    await mkdir(join(dir, "node_modules", "@rovy", "ui", "out"), { recursive: true });
    await writeFile(join(dir, "node_modules", "@rovy", "ui", "out", "init.luau"), fakeRovyUi());
  }

  await writeFile(
    join(dir, "default.project.json"),
    JSON.stringify({
      name: "RovyFixture",
      tree: {
        $className: "DataModel",
        ReplicatedStorage: {
          Stories: {
            $path: "src",
          },
          rbxts_include: {
            node_modules: {
              "@rovy": {
                $path: "node_modules/@rovy",
              },
            },
          },
        },
      },
    }),
  );

  return {
    config: normalizeConfig(
      {
        root: "src",
        rojoProject: "default.project.json",
        zuneCommand: zunePath,
      },
      join(dir, "ui-claps.config.ts"),
    ),
    storyPath: join(dir, "src", "Example.story.luau"),
  };
}

async function renderFixture(project: {
  config: ResolvedUiClapsConfig;
  storyPath: string;
}) {
  const manifest = await discoverProject(project.config);
  const rojo = await loadRojoModel(project.config);
  const story = manifest.stories.find((candidate) => candidate.filePath === project.storyPath);
  expect(story).toBeDefined();
  return renderStory(project.config, rojo, story!, {});
}

function fakeRovyUi(): string {
  return `
local activeRoot = nil

local rovyUi = {}

function rovyUi.new(rootInstance)
  return { instance = rootInstance }
end

function rovyUi.start(root, callback)
  local previous = activeRoot
  activeRoot = root
  callback()
  activeRoot = previous
end

function rovyUi.label(text)
  local label = Instance.new("TextLabel")
  label.Text = text
  label.Parent = activeRoot.instance
  return label
end

return {
  rovyUi = rovyUi,
  default = rovyUi,
}
`;
}
