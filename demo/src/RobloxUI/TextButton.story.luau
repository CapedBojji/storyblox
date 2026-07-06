local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "TextButton",
  controls = {
    text = UI.control.string("TextButton", { label = "Text" }),
    active = UI.control.boolean(true, { label = "Active" }),
    width = UI.control.slider(220, 120, 360, 4, { label = "Width" }),
    accent = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "BackgroundColor3" }),
  },
  render = function(props)
    return H.root("TextButton", "Controls change button text, active state, width, and color.", {
      UI.create("TextButton", {
        Text = H.textValue(props.text, "TextButton"),
        Size = UDim2.fromOffset(H.number(props.width, 220), 58),
        Position = UDim2.fromOffset(128, 76),
        BackgroundColor3 = props.accent,
        BackgroundTransparency = props.active == true and 0 or 0.45,
        TextColor3 = Color3.fromRGB(255, 255, 255),
        TextSize = 20,
        Active = props.active == true,
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.6),
      }),
    })
  end,
}
