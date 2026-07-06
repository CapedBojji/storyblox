local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "ImageLabel",
  controls = {
    image = UI.control.string("rbxassetid://textures/ui/GuiImagePlaceholder.png", { label = "Image" }),
    imageColor = UI.control.color(Color3.fromRGB(14, 165, 233), { label = "ImageColor3" }),
    transparency = UI.control.slider(0.05, 0, 1, 0.01, { label = "ImageTransparency" }),
  },
  render = function(props)
    return H.root("ImageLabel", "Controls change image id, color tint, and transparency.", {
      UI.create("ImageLabel", {
        Image = H.textValue(props.image, "rbxassetid://textures/ui/GuiImagePlaceholder.png"),
        ImageColor3 = props.imageColor,
        ImageTransparency = H.number(props.transparency, 0.05),
        ScaleType = Enum.ScaleType.Fit,
        Size = UDim2.fromOffset(180, 150),
        Position = UDim2.fromOffset(148, 30),
        BackgroundColor3 = Color3.fromRGB(15, 23, 42),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.75),
      }),
    })
  end,
}
