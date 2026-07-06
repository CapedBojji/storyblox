local UI = require("@ui-claps/adapter")

local function enumValue(enumGroup, value, fallback)
  if type(value) == "string" then
    return enumGroup[value]
  end

  return enumGroup[fallback]
end

local function numberValue(value, fallback)
  if type(value) == "number" then
    return value
  end

  return fallback
end

local function hasValue(list, target)
  if type(list) ~= "table" then
    return false
  end

  for _, entry in ipairs(list) do
    if entry == target then
      return true
    end
  end

  return false
end

return {
  name = "Control Types",
  controls = {
    title = UI.control.string("All control types", {
      label = "String",
      description = "Text shown inside the preview card.",
    }),
    enabled = UI.control.boolean(true, {
      label = "Boolean",
      description = "Toggles the card's active-looking state.",
    }),
    borderThickness = UI.control.number(2, {
      label = "Number",
      min = 0,
      max = 10,
      step = 1,
      description = "UIStroke thickness.",
    }),
    opacity = UI.control.slider(0, 0, 0.8, 0.05, {
      label = "Slider",
      description = "BackgroundTransparency for the card.",
    }),
    accent = UI.control.color(Color3.fromRGB(2, 156, 253), {
      label = "Color",
      description = "BackgroundColor3 for the main card.",
    }),
    alignment = UI.control.select("Center", {
      label = "Select",
      description = "TextXAlignment value.",
      options = {
        { label = "Left", value = "Left" },
        { label = "Center", value = "Center" },
        { label = "Right", value = "Right" },
      },
    }),
    variant = UI.control.radio("solid", {
      label = "Radio",
      description = "Stroke style for the card button.",
      inline = true,
      options = {
        { label = "Solid", value = "solid" },
        { label = "Outline", value = "outline" },
        { label = "Ghost", value = "ghost" },
      },
    }),
    features = UI.control.check({ "Rounded" }, {
      label = "Check",
      description = "Toggle several card features at once.",
      options = {
        { label = "Rounded", value = "Rounded" },
        { label = "Uppercase", value = "Uppercase" },
        { label = "Muted", value = "Muted" },
      },
    }),
    tags = UI.control.multiselect({ "Alpha" }, {
      label = "Multi select",
      description = "Shown in the footer line under the card.",
      options = {
        { label = "Alpha", value = "Alpha" },
        { label = "Beta", value = "Beta" },
        { label = "Release", value = "Release" },
      },
    }),
    layout = UI.control.object({ padding = 20, footer = "Tags" }, {
      label = "Object",
      description = "Free-form JSON: inner padding + footer label.",
    }),
    cornerRadius = UI.control.udim(UDim.new(0, 14), {
      label = "UDim",
      description = "CornerRadius for the card.",
      scaleMin = 0,
      scaleMax = 0.5,
      scaleStep = 0.01,
      offsetMin = 0,
      offsetMax = 48,
      offsetStep = 1,
    }),
    cardSize = UI.control.udim2(UDim2.fromOffset(300, 112), {
      label = "UDim2",
      description = "Size for the preview card.",
      scaleMin = 0,
      scaleMax = 1,
      scaleStep = 0.01,
      offsetMin = 0,
      offsetMax = 420,
      offsetStep = 1,
    }),
    itemGap = UI.control.udim(UDim.new(0, 10), {
      label = "UDim gap",
      description = "UIListLayout.Padding between chips.",
      scaleMin = 0,
      scaleMax = 0.2,
      scaleStep = 0.01,
      offsetMin = 0,
      offsetMax = 32,
      offsetStep = 1,
    }),
  },
  render = function(props)
    local active = props.enabled == true
    local background = props.accent
    local textColor = active and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(148, 163, 184)
    local transparency = numberValue(props.opacity, 0)

    local title = type(props.title) == "string" and props.title or ""
    if hasValue(props.features, "Uppercase") then
      title = string.upper(title)
    end
    if hasValue(props.features, "Muted") then
      textColor = Color3.fromRGB(148, 163, 184)
    end

    local strokeThickness = numberValue(props.borderThickness, 2)
    local strokeTransparency = active and 0.45 or 0.8
    if props.variant == "outline" then
      strokeThickness = math.max(strokeThickness, 3)
      strokeTransparency = 0.15
    elseif props.variant == "ghost" then
      strokeTransparency = 1
    end

    local layout = type(props.layout) == "table" and props.layout or {}
    local innerPadding = numberValue(layout.padding, 20)
    local footerLabel = type(layout.footer) == "string" and layout.footer or "Tags"
    local tags = {}
    if type(props.tags) == "table" then
      for _, tag in ipairs(props.tags) do
        table.insert(tags, tostring(tag))
      end
    end
    local footerText = footerLabel .. ": " .. (#tags > 0 and table.concat(tags, ", ") or "none")

    return UI.create("Frame", {
      Size = UDim2.fromOffset(560, 360),
      BackgroundColor3 = Color3.fromRGB(8, 13, 24),
      BorderSizePixel = 0,
    }, {
      UI.create("UICorner", { CornerRadius = UDim.new(0, 3) }),
      UI.create("UIStroke", {
        Color = Color3.fromRGB(148, 163, 184),
        Thickness = 1,
        Transparency = 0.55,
      }),
      UI.create("TextLabel", {
        Text = "Control playground",
        Size = UDim2.fromOffset(512, 32),
        Position = UDim2.fromOffset(24, 20),
        BackgroundTransparency = 1,
        TextColor3 = Color3.fromRGB(248, 250, 252),
        TextSize = 22,
        TextXAlignment = Enum.TextXAlignment.Left,
      }),
      UI.create("TextLabel", {
        Text = "Use the addon panel to update string, boolean, number, slider, color, select, radio, check, multi select, object, UDim, and UDim2 controls.",
        Size = UDim2.fromOffset(512, 36),
        Position = UDim2.fromOffset(24, 54),
        BackgroundTransparency = 1,
        TextColor3 = Color3.fromRGB(203, 213, 225),
        TextSize = 13,
        TextWrapped = true,
        TextXAlignment = Enum.TextXAlignment.Left,
      }),
      UI.create("Frame", {
        Size = UDim2.fromOffset(512, 220),
        Position = UDim2.fromOffset(24, 106),
        BackgroundColor3 = Color3.fromRGB(2, 6, 23),
        BackgroundTransparency = 0.08,
        BorderSizePixel = 0,
      }, {
        UI.create("UICorner", { CornerRadius = UDim.new(0, 3) }),
        UI.create("UIPadding", {
          PaddingTop = UDim.new(0, innerPadding),
          PaddingRight = UDim.new(0, innerPadding),
          PaddingBottom = UDim.new(0, innerPadding),
          PaddingLeft = UDim.new(0, innerPadding),
        }),
        UI.create("UIListLayout", {
          FillDirection = Enum.FillDirection.Vertical,
          Padding = props.itemGap,
          HorizontalAlignment = Enum.HorizontalAlignment.Center,
          VerticalAlignment = Enum.VerticalAlignment.Center,
        }),
        UI.create("TextButton", {
          Text = title,
          Size = props.cardSize,
          BackgroundColor3 = background,
          BackgroundTransparency = active and transparency or 0.64,
          BorderSizePixel = 0,
          TextColor3 = textColor,
          TextSize = 20,
          TextWrapped = true,
          TextXAlignment = enumValue(Enum.TextXAlignment, props.alignment, "Center"),
          Active = active,
        }, {
          UI.create("UICorner", {
            CornerRadius = hasValue(props.features, "Rounded") and props.cornerRadius or UDim.new(0, 0),
          }),
          UI.create("UIStroke", {
            Color = Color3.fromRGB(255, 255, 255),
            Thickness = strokeThickness,
            Transparency = strokeTransparency,
          }),
        }),
        UI.create("TextLabel", {
          Text = active and "Boolean: enabled" or "Boolean: disabled",
          Size = UDim2.fromOffset(260, 24),
          BackgroundTransparency = 1,
          TextColor3 = textColor,
          TextSize = 14,
          TextXAlignment = Enum.TextXAlignment.Center,
        }),
        UI.create("TextLabel", {
          Text = footerText,
          Size = UDim2.fromOffset(360, 20),
          BackgroundTransparency = 1,
          TextColor3 = Color3.fromRGB(148, 163, 184),
          TextSize = 13,
          TextXAlignment = Enum.TextXAlignment.Center,
        }),
      }),
    })
  end,
}
