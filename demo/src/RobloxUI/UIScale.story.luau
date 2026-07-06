local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIScale",
  controls = {
    scale = UI.control.slider(1, 0.5, 1.5, 0.05, { label = "Scale" }),
    color = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "Color" }),
  },
  render = function(props)
    return H.root("UIScale", "Controls scale the target Frame without changing its requested size.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(220, 112),
        Position = UDim2.fromOffset(128, 62),
        BackgroundColor3 = props.color,
        BorderSizePixel = 0,
      }, {
        UI.create("UIScale", {
          Scale = H.number(props.scale, 1),
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.35),
        H.label("Scaled Frame", UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), 18, Color3.fromRGB(255, 255, 255), "Center", true),
      }),
    })
  end,
}
