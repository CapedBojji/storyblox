local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIStroke",
  controls = {
    enabled = UI.control.boolean(true, { label = "Enabled" }),
    thickness = UI.control.slider(4, 0, 12, 1, { label = "Thickness" }),
    transparency = UI.control.slider(0.15, 0, 1, 0.01, { label = "Transparency" }),
    color = UI.control.color(Color3.fromRGB(34, 197, 94), { label = "Color" }),
  },
  render = function(props)
    return H.root("UIStroke", "Controls change the stroke around a Frame.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(280, 140),
        Position = UDim2.fromOffset(98, 36),
        BackgroundColor3 = Color3.fromRGB(30, 41, 59),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(props.color, H.number(props.thickness, 4), H.number(props.transparency, 0.15), props.enabled == true),
      }),
    })
  end,
}
