local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "TextLabel",
  controls = {
    text = UI.control.string("TextLabel preview", { label = "Text" }),
    textColor = UI.control.color(Color3.fromRGB(248, 250, 252), { label = "TextColor3" }),
    textSize = UI.control.slider(24, 12, 42, 1, { label = "TextSize" }),
    wrapped = UI.control.boolean(true, { label = "TextWrapped" }),
    align = UI.control.select("Center", {
      label = "TextXAlignment",
      options = { H.option("Left", "Left"), H.option("Center", "Center"), H.option("Right", "Right") },
    }),
  },
  render = function(props)
    return H.root("TextLabel", "Controls change text content, size, color, wrapping, and alignment.", {
      UI.create("TextLabel", {
        Text = H.textValue(props.text, "TextLabel preview"),
        Size = UDim2.fromOffset(390, 126),
        Position = UDim2.fromOffset(43, 44),
        BackgroundColor3 = Color3.fromRGB(30, 41, 59),
        TextColor3 = props.textColor,
        TextSize = H.number(props.textSize, 24),
        TextWrapped = props.wrapped == true,
        TextXAlignment = H.enum(Enum.TextXAlignment, props.align, "Center"),
        TextYAlignment = Enum.TextYAlignment.Center,
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(148, 163, 184), 1, 0.4),
      }),
    })
  end,
}
