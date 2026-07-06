local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIGridLayout",
  controls = {
    cellWidth = UI.control.slider(96, 60, 150, 2, { label = "Cell width" }),
    cellHeight = UI.control.slider(62, 44, 110, 2, { label = "Cell height" }),
    gap = UI.control.slider(10, 0, 24, 1, { label = "CellPadding" }),
    columns = UI.control.slider(4, 2, 5, 1, { label = "Max cells" }),
  },
  render = function(props)
    local cells = {
      UI.create("UIGridLayout", {
        CellSize = UDim2.fromOffset(H.number(props.cellWidth, 96), H.number(props.cellHeight, 62)),
        CellPadding = UDim2.fromOffset(H.number(props.gap, 10), H.number(props.gap, 10)),
        FillDirectionMaxCells = H.number(props.columns, 4),
        HorizontalAlignment = Enum.HorizontalAlignment.Center,
        VerticalAlignment = Enum.VerticalAlignment.Top,
      }),
    }

    for index = 1, 8 do
      table.insert(cells, H.card(tostring(index), index % 2 == 0 and Color3.fromRGB(14, 165, 233) or Color3.fromRGB(20, 184, 166), UDim2.fromOffset(80, 60)))
    end

    return H.root("UIGridLayout", "Controls change cell size, padding, and max cells.", cells)
  end,
}
