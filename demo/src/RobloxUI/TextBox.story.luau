local H = require("./ExampleHelpers")
local UI = H.UI

return {
  name = "TextBox",
  controls = {
    text = UI.control.string("TextBox value", { label = "Text" }),
    placeholder = UI.control.string("Placeholder", { label = "PlaceholderText" }),
    multiline = UI.control.boolean(false, { label = "MultiLine" }),
    textSize = UI.control.slider(17, 12, 28, 1, { label = "TextSize" }),
  },
  render = function(props)
    return H.root("TextBox", "Controls change Text, PlaceholderText, MultiLine, and TextSize.", {
      UI.create("TextBox", {
        Text = H.textValue(props.text, "TextBox value"),
        PlaceholderText = H.textValue(props.placeholder, "Placeholder"),
        PlaceholderColor3 = Color3.fromRGB(148, 163, 184),
        Size = UDim2.fromOffset(350, props.multiline == true and 118 or 54),
        Position = UDim2.fromOffset(63, props.multiline == true and 52 or 84),
        BackgroundColor3 = Color3.fromRGB(248, 250, 252),
        TextColor3 = Color3.fromRGB(15, 23, 42),
        TextSize = H.number(props.textSize, 17),
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = props.multiline == true and Enum.TextYAlignment.Top or Enum.TextYAlignment.Center,
        MultiLine = props.multiline == true,
        ClearTextOnFocus = false,
        BorderSizePixel = 0,
      }, {
        H.corner(3),
        H.stroke(Color3.fromRGB(14, 165, 233), 2, 0.3),
      }),
    })
  end,
}
