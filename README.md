# StoryBlox

StoryBlox is a web story renderer for Roblox UI. It discovers Luau story modules,
evaluates them through an installed `zune` binary, and renders the returned
virtual Roblox UI tree in a browser with DOM/CSS.

```sh
pnpm install
pnpm run dev
```

The dev command reads `ui-claps.config.ts`, checks for Zune, discovers stories,
and serves the preview UI. If Zune is not installed, the CLI exits with setup
guidance.

After building or installing the package, the `ui-claps` binary can run a project
folder directly:

```sh
storyblox dev ./path/to/project
```

That folder should contain `ui-claps.config.ts`. You can still pass a config file
explicitly when needed:

```sh
storyblox dev --config ./path/to/ui-claps.config.ts
```

Stories export a table with `name`, optional `controls`, and `render(props)`.

```lua
local UI = require("@storyblox/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Click me"),
    disabled = UI.control.boolean(false),
    size = UI.control.udim2(UDim2.fromOffset(140, 40)),
  },
  render = function(props)
    return UI.create("TextButton", {
      Text = props.text,
      Size = props.size,
      Active = not props.disabled,
    })
  end,
}
```

For roblox-ts projects, write the story in TypeScript, build it with roblox-ts,
and point UI Claps at the compiled Luau directory:

```ts
import type { UiClapsStory } from "storyblox/roblox-ts";

const controls = {
  text: UIClaps.control.string("Click me"),
  size: UIClaps.control.udim2(UDim2.fromOffset(160, 40), {
    scaleStep: 0.01,
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
compiled `.story.luau` files; it defaults to `root` for plain Luau projects.
Use `UIClaps.control.udim(...)` and `UIClaps.control.udim2(...)` for Roblox
scale/offset values instead of splitting dimensions across loose number sliders.

Rovy projects can use the first-party Rovy story adapter. The story provides the
project app bootstrap explicitly, while `runtime` lets StoryBlox prepare optional
Rovy UI or custom runtime context before `render`.

```ts
import { bootTemplateApp } from "shared/bootstrap";

const story = UIClaps.rovy.story({
  name: "Tool Window",
  app: () => bootTemplateApp(),
  runtime: {
    kind: "rovy-ui",
    roots: ({ target }) => target,
  },
  render: ({ runtime }) => {
    return () => {
      runtime.rovyUi.window("Tools", () => {
        runtime.rovyUi.label("Hello from Rovy UI");
      });
    };
  },
});

export = story;
```
