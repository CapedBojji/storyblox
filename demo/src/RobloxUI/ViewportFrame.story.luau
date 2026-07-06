local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "ViewportFrame",
  controls = {
    ambient = UI.control.color(Color3.fromRGB(96, 165, 250), { label = "Ambient" }),
    light = UI.control.color(Color3.fromRGB(255, 255, 255), { label = "LightColor" }),
    transparency = UI.control.slider(0, 0, 1, 0.01, { label = "ImageTransparency" }),
  },
  render = function(props)
    return H.root("ViewportFrame", "The web preview shows ViewportFrame as a bounded 3D placeholder.", {
      UI.create("ViewportFrame", {
        Ambient = props.ambient,
        LightColor = props.light,
        ImageTransparency = H.number(props.transparency, 0),
        Size = UDim2.fromOffset(330, 156),
        Position = UDim2.fromOffset(73, 30),
        BackgroundColor3 = Color3.fromRGB(15, 23, 42),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(props.light, 2, 0.45),
        H.label("3D preview surface", UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), 20, Color3.fromRGB(226, 232, 240), "Center", true),
      }),
    })
  end,
}
