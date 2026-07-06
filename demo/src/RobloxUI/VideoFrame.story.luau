local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "VideoFrame",
  controls = {
    video = UI.control.string("rbxassetid://example-video", { label = "Video" }),
    playing = UI.control.boolean(true, { label = "Playing" }),
    looped = UI.control.boolean(true, { label = "Looped" }),
    volume = UI.control.slider(0.35, 0, 1, 0.05, { label = "Volume" }),
  },
  render = function(props)
    return H.root("VideoFrame", "The web preview shows VideoFrame as a bounded media placeholder.", {
      UI.create("VideoFrame", {
        Video = H.textValue(props.video, "rbxassetid://example-video"),
        Playing = props.playing == true,
        Looped = props.looped == true,
        Volume = H.number(props.volume, 0.35),
        Size = UDim2.fromOffset(330, 156),
        Position = UDim2.fromOffset(73, 30),
        BackgroundColor3 = Color3.fromRGB(15, 23, 42),
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(14, 165, 233), 2, 0.32),
      }),
    })
  end,
}
