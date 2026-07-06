local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIFlexItem",
  controls = {
    mode = UI.control.select("Custom", {
      label = "FlexMode",
      options = { H.option("None", "None"), H.option("Grow", "Grow"), H.option("Shrink", "Shrink"), H.option("Fill", "Fill"), H.option("Custom", "Custom") },
    }),
    grow = UI.control.slider(2, 0, 5, 0.25, { label = "GrowRatio" }),
    shrink = UI.control.slider(1, 0, 5, 0.25, { label = "ShrinkRatio" }),
  },
  render = function(props)
    return H.root("UIFlexItem", "Controls change the middle item flex behavior.", {
      UI.create("UIListLayout", {
        FillDirection = Enum.FillDirection.Horizontal,
        Padding = UDim.new(0, 10),
        HorizontalAlignment = Enum.HorizontalAlignment.Center,
        VerticalAlignment = Enum.VerticalAlignment.Center,
      }),
      H.card("Fixed", Color3.fromRGB(30, 41, 59), UDim2.fromOffset(92, 92)),
      UI.create("Frame", {
        Size = UDim2.fromOffset(110, 92),
        BackgroundColor3 = Color3.fromRGB(14, 165, 233),
        BorderSizePixel = 0,
      }, {
        UI.create("UIFlexItem", {
          FlexMode = H.enum(Enum.UIFlexMode, props.mode, "Custom"),
          GrowRatio = H.number(props.grow, 2),
          ShrinkRatio = H.number(props.shrink, 1),
          ItemLineAlignment = Enum.ItemLineAlignment.Stretch,
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.7),
        H.label("Flex item", UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), 15, Color3.fromRGB(255, 255, 255), "Center", true),
      }),
      H.card("Fixed", Color3.fromRGB(30, 41, 59), UDim2.fromOffset(92, 92)),
    })
  end,
}
