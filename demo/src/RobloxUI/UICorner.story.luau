local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UICorner",
  controls = {
    radius = UI.control.slider(22, 0, 60, 1, { label = "CornerRadius" }),
    color = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "Frame color" }),
  },
  render = function(props)
    return H.root("UICorner", "Controls change the corner radius applied to a Frame.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(280, 150),
        Position = UDim2.fromOffset(98, 30),
        BackgroundColor3 = props.color,
        BorderSizePixel = 0,
      }, {
        H.corner(H.number(props.radius, 22)),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.38),
      }),
    })
  end,
}
