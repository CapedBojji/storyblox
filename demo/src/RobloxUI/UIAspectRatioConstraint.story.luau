local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIAspectRatioConstraint",
  controls = {
    aspect = UI.control.slider(1.6, 0.5, 3, 0.05, { label = "AspectRatio" }),
    width = UI.control.slider(260, 120, 380, 4, { label = "Width" }),
  },
  render = function(props)
    return H.root("UIAspectRatioConstraint", "Controls change the ratio while width stays controlled.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(H.number(props.width, 260), 120),
        Position = UDim2.fromOffset(108, 48),
        BackgroundColor3 = Color3.fromRGB(14, 165, 233),
        BorderSizePixel = 0,
      }, {
        UI.create("UIAspectRatioConstraint", {
          AspectRatio = H.number(props.aspect, 1.6),
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.35),
      }),
    })
  end,
}
