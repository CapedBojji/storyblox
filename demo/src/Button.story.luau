local UI = require("@ui-claps/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Click me"),
    disabled = UI.control.boolean(false),
    width = UI.control.slider(160, 96, 320, 4),
    accent = UI.control.color(Color3.fromRGB(0, 170, 255)),
  },
  render = function(props)
    return UI.create("Frame", {
      Size = UDim2.fromOffset(420, 260),
      BackgroundColor3 = Color3.fromRGB(18, 24, 32),
    }, {
      UI.create("UICorner", { CornerRadius = UDim.new(0, 16) }),
      UI.create("UIPadding", {
        PaddingTop = UDim.new(0, 24),
        PaddingRight = UDim.new(0, 24),
        PaddingBottom = UDim.new(0, 24),
        PaddingLeft = UDim.new(0, 24),
      }),
      UI.create("TextButton", {
        Text = props.text,
        Size = UDim2.fromOffset(props.width, 44),
        Position = UDim2.fromOffset(0, 0),
        BackgroundColor3 = props.accent,
        BackgroundTransparency = props.disabled and 0.45 or 0,
        TextColor3 = Color3.fromRGB(255, 255, 255),
        TextSize = 18,
        Active = not props.disabled,
      }, {
        UI.create("UICorner", { CornerRadius = UDim.new(0, 8) }),
        UI.create("UIStroke", {
          Color = Color3.fromRGB(255, 255, 255),
          Transparency = 0.75,
          Thickness = 1,
        }),
      }),
      UI.create("TextLabel", {
        Text = "Rendered through Zune into DOM/CSS",
        Size = UDim2.fromOffset(340, 28),
        Position = UDim2.fromOffset(0, 68),
        BackgroundTransparency = 1,
        TextColor3 = Color3.fromRGB(198, 210, 224),
        TextXAlignment = Enum.TextXAlignment.Left,
        TextSize = 15,
      }),
    })
  end,
}
