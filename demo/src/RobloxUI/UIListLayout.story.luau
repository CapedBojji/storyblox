local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIListLayout",
  controls = {
    direction = UI.control.select("Horizontal", {
      label = "FillDirection",
      options = { H.option("Horizontal", "Horizontal"), H.option("Vertical", "Vertical") },
    }),
    gap = UI.control.slider(12, 0, 36, 1, { label = "Padding" }),
    horizontal = UI.control.select("Center", {
      label = "HorizontalAlignment",
      options = { H.option("Left", "Left"), H.option("Center", "Center"), H.option("Right", "Right") },
    }),
    vertical = UI.control.select("Center", {
      label = "VerticalAlignment",
      options = { H.option("Top", "Top"), H.option("Center", "Center"), H.option("Bottom", "Bottom") },
    }),
    wraps = UI.control.boolean(false, { label = "Wraps" }),
  },
  render = function(props)
    return H.root("UIListLayout", "Controls change direction, gap, alignment, and wrapping.", {
      UI.create("UIListLayout", {
        FillDirection = H.enum(Enum.FillDirection, props.direction, "Horizontal"),
        Padding = UDim.new(0, H.number(props.gap, 12)),
        HorizontalAlignment = H.enum(Enum.HorizontalAlignment, props.horizontal, "Center"),
        VerticalAlignment = H.enum(Enum.VerticalAlignment, props.vertical, "Center"),
        Wraps = props.wraps == true,
      }),
      H.card("One", Color3.fromRGB(14, 165, 233), UDim2.fromOffset(112, 74)),
      H.card("Two", Color3.fromRGB(20, 184, 166), UDim2.fromOffset(112, 74)),
      H.card("Three", Color3.fromRGB(34, 197, 94), UDim2.fromOffset(112, 74)),
    })
  end,
}
