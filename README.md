# UI Claps

UI Claps is a web story renderer for Roblox UI. It discovers Luau story modules,
evaluates them through an installed `zune` binary, and renders the returned
virtual Roblox UI tree in a browser with DOM/CSS.

```sh
npm install
npm run dev
```

The dev command reads `ui-claps.config.ts`, checks for Zune, discovers stories,
and serves the preview UI. If Zune is not installed, the CLI exits with setup
guidance.

Stories export a table with `name`, optional `controls`, and `render(props)`.

```lua
local UI = require("@ui-claps/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Click me"),
    disabled = UI.control.boolean(false),
  },
  render = function(props)
    return UI.create("TextButton", {
      Text = props.text,
      Size = UDim2.fromOffset(140, 40),
      Active = not props.disabled,
    })
  end,
}
```
