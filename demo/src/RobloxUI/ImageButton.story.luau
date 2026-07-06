local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "ImageButton",
  controls = {
    image = UI.control.string("rbxassetid://textures/ui/ImageSet/StudioSharedUI.png", { label = "Image" }),
    imageColor = UI.control.color(Color3.fromRGB(20, 184, 166), { label = "ImageColor3" }),
    transparency = UI.control.slider(0, 0, 1, 0.01, { label = "ImageTransparency" }),
    size = UI.control.slider(150, 90, 190, 4, { label = "Size" }),
  },
  render = function(props)
    local size = H.number(props.size, 150)
    return H.root("ImageButton", "Controls change the clickable image surface.", {
      UI.create("ImageButton", {
        Image = H.textValue(props.image, "rbxassetid://textures/ui/ImageSet/StudioSharedUI.png"),
        ImageColor3 = props.imageColor,
        ImageTransparency = H.number(props.transparency, 0),
        ScaleType = Enum.ScaleType.Fit,
        Size = UDim2.fromOffset(size, size),
        Position = UDim2.fromOffset(238 - size / 2, 104 - size / 2),
        BackgroundColor3 = Color3.fromRGB(15, 23, 42),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.7),
      }),
    })
  end,
}
