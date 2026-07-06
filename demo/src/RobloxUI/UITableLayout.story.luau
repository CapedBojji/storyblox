local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UITableLayout",
  controls = {
    gap = UI.control.slider(10, 0, 28, 1, { label = "Padding" }),
    horizontal = UI.control.select("Center", {
      label = "HorizontalAlignment",
      options = { H.option("Left", "Left"), H.option("Center", "Center"), H.option("Right", "Right") },
    }),
    vertical = UI.control.select("Center", {
      label = "VerticalAlignment",
      options = { H.option("Top", "Top"), H.option("Center", "Center"), H.option("Bottom", "Bottom") },
    }),
  },
  render = function(props)
    return H.root("UITableLayout", "Controls change table padding and alignment.", {
      UI.create("UITableLayout", {
        Padding = UDim2.fromOffset(H.number(props.gap, 10), H.number(props.gap, 10)),
        HorizontalAlignment = H.enum(Enum.HorizontalAlignment, props.horizontal, "Center"),
        VerticalAlignment = H.enum(Enum.VerticalAlignment, props.vertical, "Center"),
        FillEmptySpaceColumns = true,
        FillEmptySpaceRows = true,
        MajorAxis = Enum.TableMajorAxis.RowMajor,
      }),
      H.card("A1", Color3.fromRGB(14, 165, 233), UDim2.fromOffset(148, 70)),
      H.card("A2", Color3.fromRGB(20, 184, 166), UDim2.fromOffset(148, 70)),
      H.card("B1", Color3.fromRGB(34, 197, 94), UDim2.fromOffset(148, 70)),
      H.card("B2", Color3.fromRGB(249, 115, 22), UDim2.fromOffset(148, 70)),
    })
  end,
}
