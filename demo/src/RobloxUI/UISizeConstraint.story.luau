local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UISizeConstraint",
  controls = {
    requestedWidth = UI.control.slider(360, 80, 460, 4, { label = "Requested width" }),
    minWidth = UI.control.slider(140, 80, 240, 4, { label = "Min width" }),
    maxWidth = UI.control.slider(280, 180, 420, 4, { label = "Max width" }),
  },
  render = function(props)
    return H.root("UISizeConstraint", "Controls request one size while the constraint clamps it.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(H.number(props.requestedWidth, 360), 120),
        Position = UDim2.fromOffset(98, 48),
        BackgroundColor3 = Color3.fromRGB(20, 184, 166),
        BorderSizePixel = 0,
      }, {
        UI.create("UISizeConstraint", {
          MinSize = Vector2.new(H.number(props.minWidth, 140), 80),
          MaxSize = Vector2.new(H.number(props.maxWidth, 280), 150),
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.35),
      }),
    })
  end,
}
