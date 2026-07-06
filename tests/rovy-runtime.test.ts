import { execFileSync, spawnSync } from "node:child_process";
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

const zunePath = resolveZuneCommand();
const describeWithZune = zunePath ? describe : describe.skip;

describeWithZune("rovy runtime stories", () => {
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

  test("runs RunService Heartbeat before serializing the preview", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "RunService Heartbeat",
  app = function()
    return { flush = function() end }
  end,
  render = function()
    local runService = game:GetService("RunService")
    local label = Instance.new("TextLabel")
    label.Text = "before"
    runService.Heartbeat:Connect(function(deltaTime)
      label.Text = "heartbeat " .. tostring(math.floor(deltaTime * 60 + 0.5))
    end)
    return label
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.props.Text).toBe("heartbeat 1");
  });

  test("runs render-step bindings and RunService signals deterministically", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "RunService Ordering",
  app = function()
    return { flush = function() end }
  end,
  render = function()
    local runService = game:GetService("RunService")
    local label = Instance.new("TextLabel")
    label.Text = ""

    runService:BindToRenderStep("last", Enum.RenderPriority.Last.Value, function()
      label.Text ..= "last;"
    end)
    runService:BindToRenderStep("first", Enum.RenderPriority.First.Value, function()
      label.Text ..= "first;"
    end)
    runService:BindToRenderStep("removed", 50, function()
      label.Text ..= "removed;"
    end)
    runService:UnbindFromRenderStep("removed")

    local disconnected = runService.Heartbeat:Connect(function()
      label.Text ..= "disconnected;"
    end)
    disconnected:Disconnect()

    runService.PreRender:Connect(function()
      label.Text ..= "pre;"
    end)
    runService.RenderStepped:Connect(function()
      label.Text ..= "render;"
    end)

    return label
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.props.Text).toBe("first;last;pre;render;");
  });

  test("applies TweenService goals and fires Completed", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "TweenService Preview",
  app = function()
    return { flush = function() end }
  end,
  render = function()
    local tweenService = game:GetService("TweenService")
    local label = Instance.new("TextLabel")
    local completed = false
    label.Text = "before"
    label.TextTransparency = 0

    local tween = tweenService:Create(label, TweenInfo.new(1), {
      Text = "after",
      TextTransparency = 0.75,
    })
    tween.Completed:Connect(function()
      completed = true
    end)
    tween:Play()

    if not completed then
      error("Tween Completed should fire during preview playback.")
    end

    return label
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.props.Text).toBe("after");
    expect(response.tree?.props.TextTransparency).toBe(0.75);
  });

  test("supports common UI-facing Roblox services without crashing", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Common Services",
  app = function()
    return { flush = function() end }
  end,
  render = function()
    local userInputService = game:GetService("UserInputService")
    local collectionService = game:GetService("CollectionService")
    local textService = game:GetService("TextService")
    local httpService = game:GetService("HttpService")
    local contentProvider = game:GetService("ContentProvider")
    local contextActionService = game:GetService("ContextActionService")
    local guiService = game:GetService("GuiService")
    local unknownService = game:GetService("NotARealRobloxService")

    local label = Instance.new("TextLabel")
    userInputService.InputBegan:Connect(function() end)
    collectionService:AddTag(label, "preview")
    local size = textService:GetTextSize("Hello", 20, Enum.Font.SourceSans, Vector2.new(100, 100))
    local decoded = httpService:JSONDecode(httpService:JSONEncode({ ok = true }))
    contentProvider:PreloadAsync({ label })
    contextActionService:BindAction("PreviewAction", function() end, false, Enum.KeyCode.A)
    local topInset = guiService:GetGuiInset()

    label.Text = table.concat({
      tostring(collectionService:HasTag(label, "preview")),
      tostring(decoded.ok),
      tostring(size.X > 0),
      tostring(topInset.X == 0),
      unknownService.Name,
    }, ":")
    return label
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.props.Text).toBe("true:true:true:true:NotARealRobloxService");
  });

  test("fires common Instance lifecycle and property signals", async () => {
    const project = await createRovyFixture({
      story: `
local UI = require("@ui-claps/adapter")

return UI.rovy:story({
  name = "Instance Signals",
  app = function()
    return { flush = function() end }
  end,
  render = function()
    local root = Instance.new("Frame")
    local child = Instance.new("TextLabel")
    local events = {}
    local destroying = false

    root.ChildAdded:Connect(function(instance)
      table.insert(events, "added:" .. instance.Name)
    end)
    root.ChildRemoved:Connect(function(instance)
      table.insert(events, "removed:" .. instance.Name)
    end)
    root.DescendantAdded:Connect(function(instance)
      table.insert(events, "desc-added:" .. instance.Name)
    end)
    root.DescendantRemoving:Connect(function(instance)
      table.insert(events, "desc-removing:" .. instance.Name)
    end)
    child.AncestryChanged:Connect(function(_, parent)
      table.insert(events, "ancestry:" .. (parent and parent.Name or "nil"))
    end)
    child.Changed:Connect(function(property)
      table.insert(events, "changed:" .. property)
    end)
    child:GetPropertyChangedSignal("Text"):Connect(function()
      table.insert(events, "text")
    end)
    child:GetAttributeChangedSignal("role"):Connect(function()
      table.insert(events, "attr")
    end)
    child.Destroying:Connect(function()
      destroying = true
    end)

    child.Name = "Child"
    child.Parent = root
    child.Text = "Hello"
    child:SetAttribute("role", "title")
    local related = child:IsDescendantOf(root) and child:FindFirstAncestor("Frame") == root
    child.Parent = nil
    child:Destroy()

    root.Name = table.concat(events, "|") .. "|" .. tostring(related) .. "|" .. tostring(destroying)
    return root
  end,
})
`,
    });

    const response = await renderFixture(project);
    expect(response.ok).toBe(true);
    expect(response.tree?.name).toContain("added:Child");
    expect(response.tree?.name).toContain("removed:Child");
    expect(response.tree?.name).toContain("desc-added:Child");
    expect(response.tree?.name).toContain("desc-removing:Child");
    expect(response.tree?.name).toContain("ancestry:Frame");
    expect(response.tree?.name).toContain("ancestry:nil");
    expect(response.tree?.name).toContain("changed:Text");
    expect(response.tree?.name).toContain("text");
    expect(response.tree?.name).toContain("attr");
    expect(response.tree?.name).toContain("true|true");
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

function resolveZuneCommand(): string | null {
  const direct = spawnSync("zune", ["--version"], { stdio: "ignore" });
  if (direct.status === 0) {
    return "zune";
  }

  try {
    return execFileSync("mise", ["which", "zune"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

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
