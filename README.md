# StoryBlox

StoryBlox is a web previewer for Roblox UI stories. It discovers `.story.luau`
modules, evaluates them with `zune`, and renders the returned Roblox UI tree in
the browser.

```sh
pnpm install
pnpm run dev
```

The dev command reads `ui-claps.config.ts`, checks for Zune, discovers stories,
and serves the preview UI. If Zune is not installed, the CLI exits with setup
guidance.

After building or installing the package, run a project directly with:

```sh
storyblox dev ./path/to/project
```

That folder should contain `ui-claps.config.ts`. You can also point at the
config explicitly:

```sh
storyblox dev --config ./path/to/ui-claps.config.ts
```

## Story format

Each story exports a table with:

- `name`
- optional `controls`
- `render(props)`

## Do I need the adapter?

No. A plain story can create Roblox instances directly and return them from
`render(props)`.

Use the adapter when you want two conveniences:

- `UI.create(...)` for building preview trees without `Instance.new`
- `UI.control.*(...)` helpers for StoryBlox controls

If you already prefer hand-written Roblox instances, keep doing that.

## Plain Luau story without the adapter

```lua
return {
  name = "Primary Button",
  render = function()
    local button = Instance.new("TextButton")
    button.Name = "PrimaryButton"
    button.Size = UDim2.fromOffset(180, 44)
    button.Text = "Click me"
    button.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = button

    return button
  end,
}
```

## Adapter-based story with controls

The adapter is optional, but it is the easiest way to define controls.

The current Luau helper module path is still `@ui-claps/adapter`.

```lua
local UI = require("@ui-claps/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Click me"),
    disabled = UI.control.boolean(false),
    size = UI.control.udim2(UDim2.fromOffset(180, 44)),
    accent = UI.control.color(Color3.fromRGB(0, 170, 255)),
  },
  render = function(props)
    return UI.create("TextButton", {
      Name = "PrimaryButton",
      Text = props.text,
      Size = props.size,
      Active = not props.disabled,
      BackgroundColor3 = props.accent,
      TextColor3 = Color3.fromRGB(255, 255, 255),
    }, {
      UI.create("UICorner", {
        CornerRadius = UDim.new(0, 8),
      }),
    })
  end,
}
```

## roblox-ts

For `roblox-ts` projects, build your stories to Luau and point StoryBlox at the
compiled output directory.

```ts
import type { UiClapsStory } from "storyblox/roblox-ts";

const controls = {
  text: UIClaps.control.string("Click me"),
  disabled: UIClaps.control.boolean(false),
  size: UIClaps.control.udim2(UDim2.fromOffset(180, 44), {
    offsetStep: 4,
  }),
};

const story: UiClapsStory<typeof controls> = {
  name: "Primary Button",
  controls,
  render: (props) =>
    UIClaps.create("TextButton", {
      Text: props.text,
      Size: props.size,
      Active: !props.disabled,
    }),
};

export = story;
```

```ts
import { defineConfig } from "storyblox";

export default defineConfig({
  root: "src",
  storyRoot: "out",
  rojoProject: "default.project.json",
});
```

`root` is the source project root. `storyRoot` is where StoryBlox searches for
compiled `.story.luau` files. For plain Luau projects, `storyRoot` defaults to
`root`.

## First-party Rovy support

StoryBlox has first-party support for both Rovy/Vide and Rovy UI stories.

Use Rovy/Vide when the story should mount a view through `@rovy/vide`. Use Rovy
UI when the story should run inside the `@rovy/ui` runtime and render through
frame callbacks.

### Rovy/Vide

```ts
import type { RovyVideStory } from "storyblox/rovy-vide";
import { RootView } from "client/ui/RootView";

const story: RovyVideStory = UIClaps.rovyVide.story({
  name: "Inventory Panel",
  controls: {
    title: UIClaps.control.string("Inventory"),
  },
  view: RootView,
  bootstrap: (props) => {
    const app = createApp();
    app.panelTitle = props.title;
    return app;
  },
});

export = story;
```

Use `rovyVide.story(...)` when your app already has a view class and an app
bootstrap path. StoryBlox mounts the view for the preview automatically.

### Rovy UI

```ts
import type { RovyStory } from "storyblox/rovy";

const story: RovyStory = UIClaps.rovy.story({
  name: "Tool Window",
  runtime: "rovy-ui",
  app: () => bootTemplateApp(),
  render: (ctx) => {
    return () => {
      ctx.runtime.rovyUi.window("Tools", () => {
        ctx.runtime.rovyUi.label("Hello from Rovy UI");
      });
    };
  },
});

export = story;
```

When you need custom roots, pass a runtime object instead of the `"rovy-ui"`
shortcut:

```ts
import type { RovyStory } from "storyblox/rovy";

const story: RovyStory = UIClaps.rovy.story({
  name: "Inspector",
  runtime: {
    kind: "rovy-ui",
    roots: ({ target }) => target,
  },
  app: () => bootTemplateApp(),
  render: (ctx) => {
    return () => {
      ctx.runtime.rovyUi.label("Mounted in a custom root");
    };
  },
});

export = story;
```

Use `rovy.story(...)` when you want explicit control over app creation, runtime
selection, and cleanup.
