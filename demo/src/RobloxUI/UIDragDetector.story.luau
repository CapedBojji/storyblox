local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "UIDragDetector",
  controls = {
    enabled = UI.control.boolean(true, { label = "Enabled" }),
    label = UI.control.string("Drag target", { label = "Label" }),
    color = UI.control.color(Color3.fromRGB(249, 115, 22), { label = "Target color" }),
  },
  render = function(props)
    return H.root("UIDragDetector", "The preview shows the detector target and toggles Enabled.", {
      UI.create("Frame", {
        Size = UDim2.fromOffset(260, 128),
        Position = UDim2.fromOffset(108, 42),
        BackgroundColor3 = props.color,
        BackgroundTransparency = props.enabled == true and 0 or 0.45,
        BorderSizePixel = 0,
      }, {
        UI.create("UIDragDetector", {
          Enabled = props.enabled == true,
        }),
        H.corner(3),
        H.stroke(Color3.fromRGB(255, 255, 255), 2, 0.35),
        H.label(H.textValue(props.label, "Drag target"), UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), 20, Color3.fromRGB(255, 255, 255), "Center", true),
      }),
    })
  end,
}
