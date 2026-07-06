local UI = {}

local function isArray(value)
  if type(value) ~= "table" then
    return false
  end

  local count = 0
  for key in pairs(value) do
    if type(key) ~= "number" or key < 1 or key % 1 ~= 0 then
      return false
    end
    count += 1
  end

  for index = 1, count do
    if value[index] == nil then
      return false
    end
  end

  return true
end

local function clone(value, seen)
  local valueType = type(value)

  if valueType == "nil" or valueType == "string" or valueType == "number" or valueType == "boolean" then
    return value
  end

  if valueType ~= "table" then
    return tostring(value)
  end

  if value.__uiClapsSerialized ~= nil then
    return value.__uiClapsSerialized
  end

  seen = seen or {}
  if seen[value] then
    return "<circular>"
  end
  seen[value] = true

  local result = {}
  for key, childValue in pairs(value) do
    if type(key) == "string" and string.sub(key, 1, 9) ~= "__uiClaps" then
      result[key] = clone(childValue, seen)
    elseif type(key) == "number" then
      result[key] = clone(childValue, seen)
    end
  end

  seen[value] = nil
  return result
end

local function makeSerialized(serialized)
  local value = {
    __uiClapsSerialized = serialized,
  }

  local valueType = type(serialized) == "table" and serialized["$type"] or nil
  if valueType == "UDim" then
    value.Scale = serialized.scale
    value.Offset = serialized.offset
    value.scale = serialized.scale
    value.offset = serialized.offset
  elseif valueType == "UDim2" then
    value.X = makeSerialized(serialized.x)
    value.Y = makeSerialized(serialized.y)
  elseif valueType == "Color3" then
    value.R = serialized.r
    value.G = serialized.g
    value.B = serialized.b
    value.r = serialized.r
    value.g = serialized.g
    value.b = serialized.b
  elseif valueType == "Vector2" then
    value.X = serialized.x
    value.Y = serialized.y
    value.x = serialized.x
    value.y = serialized.y
  end

  return value
end

local UDim = {}
function UDim.new(scale, offset)
  return makeSerialized({
    ["$type"] = "UDim",
    scale = scale or 0,
    offset = offset or 0,
  })
end

local UDim2 = {}
function UDim2.new(xScale, xOffset, yScale, yOffset)
  return makeSerialized({
    ["$type"] = "UDim2",
    x = { ["$type"] = "UDim", scale = xScale or 0, offset = xOffset or 0 },
    y = { ["$type"] = "UDim", scale = yScale or 0, offset = yOffset or 0 },
  })
end

function UDim2.fromScale(xScale, yScale)
  return UDim2.new(xScale or 0, 0, yScale or 0, 0)
end

function UDim2.fromOffset(xOffset, yOffset)
  return UDim2.new(0, xOffset or 0, 0, yOffset or 0)
end

local Color3 = {}
function Color3.new(r, g, b)
  return makeSerialized({
    ["$type"] = "Color3",
    r = r or 0,
    g = g or 0,
    b = b or 0,
  })
end

function Color3.fromRGB(r, g, b)
  return Color3.new((r or 0) / 255, (g or 0) / 255, (b or 0) / 255)
end

function Color3.fromHex(hex)
  local normalized = string.gsub(hex or "#000000", "#", "")
  local r = tonumber(string.sub(normalized, 1, 2), 16) or 0
  local g = tonumber(string.sub(normalized, 3, 4), 16) or 0
  local b = tonumber(string.sub(normalized, 5, 6), 16) or 0
  return Color3.fromRGB(r, g, b)
end

local Vector2 = {}
function Vector2.new(x, y)
  return makeSerialized({
    ["$type"] = "Vector2",
    x = x or 0,
    y = y or 0,
  })
end

local function makeRuntimeValue(serialized, exposed)
  exposed = exposed or {}
  exposed.__uiClapsSerialized = serialized
  return exposed
end

local Vector3 = {}
function Vector3.new(x, y, z)
  x = x or 0
  y = y or 0
  z = z or 0
  return makeRuntimeValue({
    ["$type"] = "Vector3",
    x = x,
    y = y,
    z = z,
  }, {
    X = x,
    Y = y,
    Z = z,
  })
end
Vector3.zero = Vector3.new(0, 0, 0)
Vector3.one = Vector3.new(1, 1, 1)
Vector3.xAxis = Vector3.new(1, 0, 0)
Vector3.yAxis = Vector3.new(0, 1, 0)
Vector3.zAxis = Vector3.new(0, 0, 1)

local CFrame = {}
function CFrame.new(x, y, z)
  if type(x) == "table" and x.X ~= nil then
    y = x.Y
    z = x.Z
    x = x.X
  end
  x = x or 0
  y = y or 0
  z = z or 0
  return makeRuntimeValue({
    ["$type"] = "CFrame",
    x = x,
    y = y,
    z = z,
  }, {
    X = x,
    Y = y,
    Z = z,
    Position = Vector3.new(x, y, z),
  })
end
function CFrame.Angles()
  return CFrame.new()
end
function CFrame.fromEulerAngles()
  return CFrame.new()
end
function CFrame.fromEulerAnglesXYZ()
  return CFrame.new()
end
function CFrame.fromEulerAnglesYXZ()
  return CFrame.new()
end
function CFrame.fromOrientation()
  return CFrame.new()
end
function CFrame.lookAt(at)
  return CFrame.new(at)
end
CFrame.identity = CFrame.new()

local NumberRange = {}
function NumberRange.new(min, max)
  max = max or min or 0
  min = min or max
  return makeRuntimeValue({
    ["$type"] = "NumberRange",
    min = min,
    max = max,
  }, {
    Min = min,
    Max = max,
  })
end

local Rect = {}
function Rect.new(minX, minY, maxX, maxY)
  if type(minX) == "table" and type(minY) == "table" then
    maxX = minY.X
    maxY = minY.Y
    minY = minX.Y
    minX = minX.X
  end
  minX = minX or 0
  minY = minY or 0
  maxX = maxX or 0
  maxY = maxY or 0
  return makeRuntimeValue({
    ["$type"] = "Rect",
    min = { x = minX, y = minY },
    max = { x = maxX, y = maxY },
  }, {
    Min = Vector2.new(minX, minY),
    Max = Vector2.new(maxX, maxY),
    Width = maxX - minX,
    Height = maxY - minY,
  })
end

local BrickColor = {}
function BrickColor.new(first, g, b)
  local name = "Medium stone grey"
  local number = 194
  local color = Color3.new(0.64, 0.64, 0.64)
  if type(first) == "string" then
    name = first
  elseif type(first) == "number" and g == nil and b == nil then
    number = first
  elseif type(first) == "number" and type(g) == "number" and type(b) == "number" then
    color = Color3.new(first, g, b)
  elseif type(first) == "table" then
    color = first
  end
  return makeRuntimeValue({
    ["$type"] = "BrickColor",
    name = name,
    number = number,
    color = clone(color),
  }, {
    Name = name,
    Number = number,
    Color = color,
    r = type(color) == "table" and color.r or 0.64,
    g = type(color) == "table" and color.g or 0.64,
    b = type(color) == "table" and color.b or 0.64,
  })
end
function BrickColor.White()
  return BrickColor.new("White")
end
function BrickColor.Gray()
  return BrickColor.new("Medium stone grey")
end
function BrickColor.DarkGray()
  return BrickColor.new("Dark stone grey")
end
function BrickColor.Black()
  return BrickColor.new("Black")
end
function BrickColor.Red()
  return BrickColor.new("Bright red")
end
function BrickColor.Yellow()
  return BrickColor.new("Bright yellow")
end
function BrickColor.Green()
  return BrickColor.new("Dark green")
end
function BrickColor.Blue()
  return BrickColor.new("Bright blue")
end

local TweenInfo = {}
function TweenInfo.new(time, easingStyle, easingDirection, repeatCount, reverses, delayTime)
  return makeRuntimeValue({
    ["$type"] = "TweenInfo",
    time = time or 1,
    easingStyle = clone(easingStyle),
    easingDirection = clone(easingDirection),
    repeatCount = repeatCount or 0,
    reverses = reverses == true,
    delayTime = delayTime or 0,
  }, {
    Time = time or 1,
    EasingStyle = easingStyle,
    EasingDirection = easingDirection,
    RepeatCount = repeatCount or 0,
    Reverses = reverses == true,
    DelayTime = delayTime or 0,
  })
end

local ENUM_VALUES = {
  RenderPriority = {
    First = 0,
    Input = 100,
    Camera = 200,
    Character = 300,
    Last = 2000,
  },
}

local function makeEnumItem(enumType, itemName)
  local value = ENUM_VALUES[enumType] and ENUM_VALUES[enumType][itemName] or nil
  return makeRuntimeValue({
    ["$type"] = "EnumItem",
    enumType = enumType,
    name = itemName,
    value = value,
  }, {
    EnumType = enumType,
    Name = itemName,
    Value = value,
  })
end

local function makeEnum()
  return setmetatable({}, {
    __index = function(_, enumType)
      return setmetatable({}, {
        __index = function(_, itemName)
          return makeEnumItem(enumType, itemName)
        end,
      })
    end,
  })
end

local function colorKeypoint(time, value)
  return { time = time, value = clone(value) }
end

local ColorSequence = {}
function ColorSequence.new(first, second)
  local keypoints
  if type(first) == "table" and isArray(first) then
    keypoints = clone(first)
  elseif second ~= nil then
    keypoints = {
      colorKeypoint(0, first),
      colorKeypoint(1, second),
    }
  else
    keypoints = {
      colorKeypoint(0, first),
      colorKeypoint(1, first),
    }
  end

  return makeSerialized({
    ["$type"] = "ColorSequence",
    keypoints = keypoints,
  })
end

local NumberSequence = {}
function NumberSequence.new(first, second)
  local keypoints
  if type(first) == "table" and isArray(first) then
    keypoints = clone(first)
  elseif second ~= nil then
    keypoints = {
      { time = 0, value = first or 0 },
      { time = 1, value = second or 0 },
    }
  else
    keypoints = {
      { time = 0, value = first or 0 },
      { time = 1, value = first or 0 },
    }
  end

  return makeSerialized({
    ["$type"] = "NumberSequence",
    keypoints = keypoints,
  })
end

local Font = {}
function Font.fromEnum(font)
  return makeSerialized({
    ["$type"] = "Font",
    family = clone(font),
  })
end

function UI.create(className, props, children, shiftedChildren)
  if className == UI then
    className = props
    props = children
    children = shiftedChildren
  end

  local normalizedChildren = {}

  if type(children) == "table" then
    if isArray(children) then
      for _, child in ipairs(children) do
        table.insert(normalizedChildren, clone(child))
      end
    else
      for name, child in pairs(children) do
        local cloned = clone(child)
        if type(cloned) == "table" then
          cloned.name = cloned.name or tostring(name)
        end
        table.insert(normalizedChildren, cloned)
      end
    end
  elseif children ~= nil then
    table.insert(normalizedChildren, clone(children))
  end

  return {
    className = className,
    props = clone(props or {}),
    children = normalizedChildren,
  }
end

UI.control = {}
UI.rovy = {}
UI.rovyVide = {}

function UI.rovy.story(config, shiftedConfig)
  if config == UI.rovy then
    config = shiftedConfig
  end

  if type(config) ~= "table" then
    error("UIClaps.rovy.story expects a story config table.", 2)
  end

  config.kind = "rovy"
  return config
end

function UI.rovyVide.story(config, shiftedConfig)
  if config == UI.rovyVide then
    config = shiftedConfig
  end

  if type(config) ~= "table" then
    error("UIClaps.rovyVide.story expects a story config table.", 2)
  end

  config.kind = "rovy-vide"
  return config
end

function UI.control.string(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "string",
    default = default or "",
    label = options.label,
    description = options.description,
  }
end

function UI.control.boolean(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "boolean",
    default = default == true,
    label = options.label,
    description = options.description,
  }
end

function UI.control.number(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "number",
    default = default or 0,
    min = options.min,
    max = options.max,
    step = options.step,
    label = options.label,
    description = options.description,
  }
end

function UI.control.slider(default, min, max, step, options, shiftedOptions)
  if default == UI.control then
    default = min
    min = max
    max = step
    step = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "slider",
    default = default or 0,
    min = min or 0,
    max = max or 100,
    step = step,
    label = options.label,
    description = options.description,
  }
end

function UI.control.color(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "color",
    default = clone(default or Color3.fromRGB(255, 255, 255)),
    label = options.label,
    description = options.description,
  }
end

function UI.control.select(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "select",
    default = clone(default),
    options = clone(options.options or {}),
    label = options.label,
    description = options.description,
  }
end

function UI.control.radio(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "radio",
    default = clone(default),
    options = clone(options.options or {}),
    inline = options.inline == true,
    label = options.label,
    description = options.description,
  }
end

function UI.control.check(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "check",
    default = clone(default or {}),
    options = clone(options.options or {}),
    inline = options.inline == true,
    label = options.label,
    description = options.description,
  }
end

function UI.control.multiselect(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "multiselect",
    default = clone(default or {}),
    options = clone(options.options or {}),
    label = options.label,
    description = options.description,
  }
end

function UI.control.object(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "object",
    default = clone(default or {}),
    label = options.label,
    description = options.description,
  }
end

function UI.control.udim(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "udim",
    default = clone(default or UDim.new(0, 0)),
    scaleMin = options.scaleMin,
    scaleMax = options.scaleMax,
    scaleStep = options.scaleStep,
    offsetMin = options.offsetMin,
    offsetMax = options.offsetMax,
    offsetStep = options.offsetStep,
    label = options.label,
    description = options.description,
  }
end

function UI.control.udim2(default, options, shiftedOptions)
  if default == UI.control then
    default = options
    options = shiftedOptions
  end

  options = options or {}
  return {
    type = "udim2",
    default = clone(default or UDim2.fromOffset(0, 0)),
    scaleMin = options.scaleMin,
    scaleMax = options.scaleMax,
    scaleStep = options.scaleStep,
    offsetMin = options.offsetMin,
    offsetMax = options.offsetMax,
    offsetStep = options.offsetStep,
    label = options.label,
    description = options.description,
  }
end

function UI.serialize(value, shiftedValue)
  if value == UI then
    value = shiftedValue
  end

  return clone(value)
end

function UI.globals()
  return {
    UDim = UDim,
    UDim2 = UDim2,
    Color3 = Color3,
    ColorSequence = ColorSequence,
    NumberSequence = NumberSequence,
    Vector2 = Vector2,
    Vector3 = Vector3,
    CFrame = CFrame,
    NumberRange = NumberRange,
    Rect = Rect,
    BrickColor = BrickColor,
    TweenInfo = TweenInfo,
    Font = Font,
    Enum = makeEnum(),
  }
end

function UI.installGlobals(target)
  for key, value in pairs(UI.globals()) do
    target[key] = value
  end
  target.UIClaps = UI
end

UI.UDim = UDim
UI.UDim2 = UDim2
UI.Color3 = Color3
UI.ColorSequence = ColorSequence
UI.NumberSequence = NumberSequence
UI.Vector2 = Vector2
UI.Vector3 = Vector3
UI.CFrame = CFrame
UI.NumberRange = NumberRange
UI.Rect = Rect
UI.BrickColor = BrickColor
UI.TweenInfo = TweenInfo
UI.Font = Font
UI.Enum = makeEnum()

return UI
