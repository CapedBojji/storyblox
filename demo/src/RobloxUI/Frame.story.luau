local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "Frame",
  controls = {
    width = UI.control.slider(260, 120, 420, 4, { label = "Width" }),
    height = UI.control.slider(132, 72, 190, 4, { label = "Height" }),
    color = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "BackgroundColor3" }),
    transparency = UI.control.slider(0, 0, 1, 0.01, { label = "BackgroundTransparency" }),
    rotation = UI.control.slider(0, -12, 12, 1, { label = "Rotation" }),
  },
  render = function(props)
    return H.root("Frame", "Controls change Size, BackgroundColor3, BackgroundTransparency, and Rotation.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(H.number(props.width, 260), H.number(props.height, 132)),
        Position = UDim2.fromOffset(108, 38),
        BackgroundColor3 = props.color,
        BackgroundTransparency = H.number(props.transparency, 0),
        Rotation = H.number(props.rotation, 0),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.35),
      }),
    })
  end,
}
