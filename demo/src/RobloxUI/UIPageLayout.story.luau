local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIPageLayout",
  controls = {
    direction = UI.control.select("Horizontal", {
      label = "FillDirection",
      options = { H.option("Horizontal", "Horizontal"), H.option("Vertical", "Vertical") },
    }),
    gap = UI.control.slider(12, 0, 32, 1, { label = "Padding" }),
    circular = UI.control.boolean(true, { label = "Circular" }),
    tweenTime = UI.control.slider(0.25, 0, 1, 0.05, { label = "TweenTime" }),
  },
  render = function(props)
    return H.root("UIPageLayout", "Controls change page direction, spacing, circular flag, and tween time.", {
      UI.create("UIPageLayout", {
        FillDirection = H.enum(Enum.FillDirection, props.direction, "Horizontal"),
        Padding = UDim.new(0, H.number(props.gap, 12)),
        HorizontalAlignment = Enum.HorizontalAlignment.Left,
        VerticalAlignment = Enum.VerticalAlignment.Center,
        Circular = props.circular == true,
        Animated = true,
        TweenTime = H.number(props.tweenTime, 0.25),
      }),
      H.card("Page 1", Color3.fromRGB(14, 165, 233), UDim2.fromOffset(160, 128)),
      H.card("Page 2", Color3.fromRGB(20, 184, 166), UDim2.fromOffset(160, 128)),
      H.card("Page 3", Color3.fromRGB(34, 197, 94), UDim2.fromOffset(160, 128)),
    })
  end,
}
