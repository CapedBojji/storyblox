local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UITextSizeConstraint",
  controls = {
    text = UI.control.string("Constrained text", { label = "Text" }),
    requested = UI.control.slider(42, 10, 64, 1, { label = "Requested TextSize" }),
    min = UI.control.slider(12, 8, 24, 1, { label = "MinTextSize" }),
    max = UI.control.slider(28, 18, 48, 1, { label = "MaxTextSize" }),
  },
  render = function(props)
    return H.root("UITextSizeConstraint", "Controls clamp the rendered TextSize.", {
      UI.create("TextLabel", {
        Text = H.textValue(props.text, "Constrained text"),
        Size = UDim2.fromOffset(380, 128),
        Position = UDim2.fromOffset(48, 44),
        BackgroundColor3 = Color3.fromRGB(30, 41, 59),
        TextColor3 = Color3.fromRGB(248, 250, 252),
        TextSize = H.number(props.requested, 42),
        TextWrapped = true,
        BorderSizePixel = 0,
      }, {
        UI.create("UITextSizeConstraint", {
          MinTextSize = H.number(props.min, 12),
          MaxTextSize = H.number(props.max, 28),
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(14, 165, 233), 2, 0.35),
      }),
    })
  end,
}
