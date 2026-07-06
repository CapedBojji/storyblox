local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "ScrollingFrame",
  controls = {
    rows = UI.control.slider(8, 3, 18, 1, { label = "Rows" }),
    thickness = UI.control.slider(8, 2, 16, 1, { label = "ScrollBarThickness" }),
    accent = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "ScrollBarImageColor3" }),
  },
  render = function(props)
    local children = {
      H.corner(3),
      H.stroke(Color3.fromRGB(148, 163, 184), 1, 0.45),
      H.padding(12),
      UI.create("UIListLayout", {
        FillDirection = Enum.FillDirection.Vertical,
        Padding = UDim.new(0, 8),
      }),
    }

    for index = 1, math.floor(H.number(props.rows, 8)) do
      table.insert(children, H.card(string.format("Row %02d", index), index % 2 == 0 and Color3.fromRGB(30, 41, 59) or Color3.fromRGB(51, 65, 85), UDim2.new(1, -4, 0, 34)))
    end

    return H.root("ScrollingFrame", "Controls change row count and scrollbar styling.", {
      UI.create("ScrollingFrame", {
        Size = UDim2.fromOffset(330, 170),
        Position = UDim2.fromOffset(73, 22),
        BackgroundColor3 = Color3.fromRGB(15, 23, 42),
        CanvasSize = UDim2.fromOffset(0, math.floor(H.number(props.rows, 8)) * 44),
        AutomaticCanvasSize = Enum.AutomaticSize.Y,
        ScrollBarThickness = H.number(props.thickness, 8),
        ScrollBarImageColor3 = props.accent,
        ScrollBarImageTransparency = 0.1,
        ScrollingEnabled = true,
        BorderSizePixel = 0,
      }, children),
    })
  end,
}
