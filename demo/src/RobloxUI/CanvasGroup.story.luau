local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "CanvasGroup",
  controls = {
    groupTransparency = UI.control.slider(0.15, 0, 1, 0.01, { label = "GroupTransparency" }),
    background = UI.control.color(Color3.fromRGB(37, 99, 235), { label = "BackgroundColor3" }),
    childColor = UI.control.color(Color3.fromRGB(34, 197, 94), { label = "Child color" }),
  },
  render = function(props)
    return H.root("CanvasGroup", "Controls change group opacity for all children at once.", {
      UI.create("CanvasGroup", {
        Size = UDim2.fromOffset(330, 150),
        Position = UDim2.fromOffset(72, 28),
        BackgroundColor3 = props.background,
        GroupTransparency = H.number(props.groupTransparency, 0.15),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.3),
        H.padding(18),
        UI.create("UIListLayout", {
          FillDirection = Enum.FillDirection.Horizontal,
          Padding = UDim.new(0, 12),
          HorizontalAlignment = Enum.HorizontalAlignment.Center,
          VerticalAlignment = Enum.VerticalAlignment.Center,
        }),
        H.card("Child A", props.childColor, UDim2.fromOffset(118, 86)),
        H.card("Child B", Color3.fromRGB(249, 115, 22), UDim2.fromOffset(118, 86)),
      }),
    })
  end,
}
