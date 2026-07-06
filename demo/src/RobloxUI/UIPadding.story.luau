local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIPadding",
  controls = {
    padding = UI.control.slider(22, 0, 48, 1, { label = "Padding" }),
    gap = UI.control.slider(10, 0, 24, 1, { label = "Layout gap" }),
  },
  render = function(props)
    return H.root("UIPadding", "Controls change inner padding around laid-out children.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(360, 154),
        Position = UDim2.fromOffset(58, 28),
        BackgroundColor3 = Color3.fromRGB(30, 41, 59),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(148, 163, 184), 1, 0.45),
        H.padding(H.number(props.padding, 22)),
        UI.create("UIListLayout", {
          FillDirection = Enum.FillDirection.Horizontal,
          Padding = UDim.new(0, H.number(props.gap, 10)),
          HorizontalAlignment = Enum.HorizontalAlignment.Center,
          VerticalAlignment = Enum.VerticalAlignment.Center,
        }),
        H.card("A", Color3.fromRGB(14, 165, 233), UDim2.fromOffset(82, 72)),
        H.card("B", Color3.fromRGB(20, 184, 166), UDim2.fromOffset(82, 72)),
        H.card("C", Color3.fromRGB(34, 197, 94), UDim2.fromOffset(82, 72)),
      }),
    })
  end,
}
