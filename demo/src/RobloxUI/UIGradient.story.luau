local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIGradient",
  controls = {
    from = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "Color A" }),
    to = UI.control.color(Color3.fromRGB(20, 184, 166), { label = "Color B" }),
    rotation = UI.control.slider(0, 0, 360, 5, { label = "Rotation" }),
    enabled = UI.control.boolean(true, { label = "Enabled" }),
  },
  render = function(props)
    return H.root("UIGradient", "Controls change gradient colors, rotation, and enabled state.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(320, 150),
        Position = UDim2.fromOffset(78, 30),
        BackgroundColor3 = Color3.fromRGB(30, 41, 59),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.65),
        UI.create("UIGradient", {
          Color = ColorSequence.new(props.from, props.to),
          Rotation = H.number(props.rotation, 0),
          Enabled = props.enabled == true,
        }),
      }),
    })
  end,
}
