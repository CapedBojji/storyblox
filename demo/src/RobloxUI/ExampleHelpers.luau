local UI = require("@ui-claps/adapter")

local H = {
  UI = UI,
}

function H.option(label, value)
  return { label = label, value = value }
end

function H.number(value, fallback)
  if type(value) == "number" then
    return value
  end

  return fallback
end

function H.textValue(value, fallback)
  if type(value) == "string" then
    return value
  end

  return fallback
end

function H.enum(enumGroup, value, fallback)
  return enumGroup[H.textValue(value, fallback)]
end

function H.color(value, fallback)
  if type(value) == "table" then
    return value
  end

  return fallback
end

function H.corner(radius)
  return UI.create("UICorner", {
    CornerRadius = UDim.new(0, math.max(H.number(radius, 0), 0)),
  })
end

function H.stroke(color, thickness, transparency, enabled)
  return UI.create("UIStroke", {
    Color = color,
    Thickness = H.number(thickness, 1),
    Transparency = H.number(transparency, 0),
    Enabled = enabled ~= false,
  })
end

function H.padding(amount)
  local padding = math.max(H.number(amount, 0), 0)
  return UI.create("UIPadding", {
    PaddingTop = UDim.new(0, padding),
    PaddingRight = UDim.new(0, padding),
    PaddingBottom = UDim.new(0, padding),
    PaddingLeft = UDim.new(0, padding),
  })
end

function H.label(text, size, position, textSize, color, align, wrapped)
  return UI.create("TextLabel", {
    Text = text,
    Size = size,
    Position = position or UDim2.fromOffset(0, 0),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    TextColor3 = color or Color3.fromRGB(226, 232, 240),
    TextSize = H.number(textSize, 16),
    TextWrapped = wrapped == true,
    TextXAlignment = H.enum(Enum.TextXAlignment, align, "Center"),
    TextYAlignment = Enum.TextYAlignment.Center,
  })
end

function H.card(text, background, size, children)
  local cardChildren = {
    H.corner(3),
    H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.82),
    H.label(text, UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), 15, Color3.fromRGB(255, 255, 255), "Center", true),
  }

  if type(children) == "table" then
    for _, child in ipairs(children) do
      table.insert(cardChildren, child)
    end
  end

  return UI.create("Frame", {
    Size = size or UDim2.fromOffset(130, 92),
    BackgroundColor3 = background,
    BorderSizePixel = 0,
  }, cardChildren)
end

function H.root(title, description, stageChildren)
  local content = {
    H.corner(3),
    H.stroke(Color3.fromRGB(148, 163, 184), 1, 0.55),
    H.label(title, UDim2.fromOffset(512, 34), UDim2.fromOffset(24, 20), 22, Color3.fromRGB(248, 250, 252), "Left", false),
    H.label(description, UDim2.fromOffset(512, 34), UDim2.fromOffset(24, 54), 13, Color3.fromRGB(203, 213, 225), "Left", true),
  }

  local stage = {
    H.corner(3),
    H.stroke(Color3.fromRGB(255, 255, 255), 1, 0.82),
    H.padding(18),
  }

  for _, child in ipairs(stageChildren) do
    table.insert(stage, child)
  end

  table.insert(content, UI.create("Frame", {
    Size = UDim2.fromOffset(512, 244),
    Position = UDim2.fromOffset(24, 92),
    BackgroundColor3 = Color3.fromRGB(2, 6, 23),
    BackgroundTransparency = 0.08,
    BorderSizePixel = 0,
  }, stage))

  return UI.create("Frame", {
    Size = UDim2.fromOffset(560, 360),
    BackgroundColor3 = Color3.fromRGB(8, 13, 24),
    BorderSizePixel = 0,
  }, content)
end

return H
