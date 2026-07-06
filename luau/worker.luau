local fs = zune.fs
local serde = zune.serde
local luau = zune.luau
local process = zune.process
local io = zune.io

local requestPath = process.args[#process.args]
local request = serde.json.decode(fs.readFileSync(requestPath))
local moduleCache = {}
local pathByInstance = {}
local nodeByFile = {}
local proxyByNode = {}
local syntheticServices = {}
local syntheticOrder = 0
local outputLogs = {}

local CLASS_NAMES = {
  BillboardGui = true,
  CanvasGroup = true,
  Folder = true,
  Frame = true,
  ImageButton = true,
  ImageLabel = true,
  ModuleScript = true,
  Player = true,
  PlayerGui = true,
  ScreenGui = true,
  ScrollingFrame = true,
  SurfaceGui = true,
  TextBox = true,
  TextButton = true,
  TextLabel = true,
  UIAspectRatioConstraint = true,
  UICorner = true,
  UIFlexItem = true,
  UIGradient = true,
  UIGridLayout = true,
  UIListLayout = true,
  UIPadding = true,
  UIScale = true,
  UISizeConstraint = true,
  UITableLayout = true,
  UIStroke = true,
}

local GUI_CLASSES = {
  BillboardGui = true,
  CanvasGroup = true,
  Frame = true,
  ImageButton = true,
  ImageLabel = true,
  ScreenGui = true,
  ScrollingFrame = true,
  SurfaceGui = true,
  TextBox = true,
  TextButton = true,
  TextLabel = true,
  VideoFrame = true,
  ViewportFrame = true,
}

local INSTANCE_SIGNALS = {
  AncestryChanged = true,
  Changed = true,
  ChildAdded = true,
  ChildRemoved = true,
  DescendantAdded = true,
  DescendantRemoving = true,
  Destroying = true,
  InputBegan = true,
  InputChanged = true,
  InputEnded = true,
  MouseEnter = true,
  MouseLeave = true,
  MouseMoved = true,
}

local CLASS_BY_TAG = {}
for className in pairs(CLASS_NAMES) do
  CLASS_BY_TAG[string.lower(className)] = className
end

local function dirname(path)
  return string.match(path, "^(.*)[/\\][^/\\]+$") or "."
end

local function joinPath(a, b)
  if string.sub(a, -1) == "/" then
    return a .. b
  end
  return a .. "/" .. b
end

local function normalizePath(path)
  local parts = {}
  path = string.gsub(path, "\\", "/")

  for part in string.gmatch(path, "[^/]+") do
    if part == ".." then
      table.remove(parts)
    elseif part ~= "." and part ~= "" then
      table.insert(parts, part)
    end
  end

  local prefix = string.sub(path, 1, 1) == "/" and "/" or ""
  return prefix .. table.concat(parts, "/")
end

local function statKind(path)
  local ok, result = pcall(function()
    return fs.stat(path).kind
  end)

  if not ok then
    return "none"
  end

  return result
end

local function fileExists(path)
  return statKind(path) == "file"
end

local function directoryExists(path)
  return statKind(path) == "directory"
end

local function resolveModuleFile(path)
  local candidates = {
    path,
    path .. ".luau",
    path .. ".lua",
    joinPath(path, "init.luau"),
    joinPath(path, "init.lua"),
  }

  for _, candidate in ipairs(candidates) do
    if fileExists(candidate) then
      return candidate
    end
  end

  if directoryExists(path) then
    local initLuau = joinPath(path, "init.luau")
    local initLua = joinPath(path, "init.lua")
    if fileExists(initLuau) then
      return initLuau
    end
    if fileExists(initLua) then
      return initLua
    end
  end

  error("Could not resolve module " .. path, 3)
end

local function indexRojoNode(node, parent)
  node.Parent = parent
  if node.filePath ~= nil then
    nodeByFile[normalizePath(node.filePath)] = node
  end
  pathByInstance[node.instancePath] = node

  for _, child in ipairs(node.children or {}) do
    indexRojoNode(child, node)
  end
end

indexRojoNode(request.rojoTree, nil)

local function adapterSibling(fileName)
  return joinPath(dirname(request.adapterPath), fileName)
end

local function makeVirtualNode(name, className, parent, filePath)
  local parentPath = parent and parent.instancePath or "game"
  return {
    name = name,
    className = className,
    Parent = parent,
    instancePath = parentPath .. "." .. name,
    filePath = filePath,
    children = {},
  }
end

local function appendRojoChild(parent, child)
  parent.children = parent.children or {}
  table.insert(parent.children, child)
  child.Parent = parent
  pathByInstance[child.instancePath] = child
  if child.filePath ~= nil then
    nodeByFile[normalizePath(child.filePath)] = child
  end
  return child
end

local function findRojoChild(node, childName)
  for _, child in ipairs(node.children or {}) do
    if child.name == childName then
      return child
    end
  end
  return nil
end

local function ensureUiClapsRuntimeChild(node, childName)
  if node.name == "node_modules" and childName == "ui-claps" then
    local existing = findRojoChild(node, "ui-claps")
    if existing ~= nil then
      return existing
    end

    local folder = appendRojoChild(node, makeVirtualNode("ui-claps", "Folder", node, nil))
    appendRojoChild(folder, makeVirtualNode("rovy", "ModuleScript", folder, adapterSibling("rovy.luau")))
    appendRojoChild(folder, makeVirtualNode("rovy-vide", "ModuleScript", folder, adapterSibling("rovy-vide.luau")))
    return folder
  end

  if node.name == "ui-claps" and childName == "rovy" then
    local existing = findRojoChild(node, "rovy")
    if existing ~= nil then
      return existing
    end

    return appendRojoChild(node, makeVirtualNode("rovy", "ModuleScript", node, adapterSibling("rovy.luau")))
  end

  if node.name == "ui-claps" and childName == "rovy-vide" then
    local existing = findRojoChild(node, "rovy-vide")
    if existing ~= nil then
      return existing
    end

    return appendRojoChild(node, makeVirtualNode("rovy-vide", "ModuleScript", node, adapterSibling("rovy-vide.luau")))
  end

  return nil
end

local function normalizeClassName(className)
  if type(className) ~= "string" then
    error("Instance.new expects a string class name", 3)
  end

  return CLASS_BY_TAG[string.lower(className)] or className
end

local function isSyntheticInstance(value)
  return type(value) == "table" and value.__uiClapsSyntheticInstance == true
end

local function isInstanceProxy(value)
  return type(value) == "table" and value.__uiClapsInstance == true
end

local function removeChild(parent, child)
  if parent == nil or parent.__uiClapsChildren == nil then
    return
  end

  for index = #parent.__uiClapsChildren, 1, -1 do
    if parent.__uiClapsChildren[index] == child then
      table.remove(parent.__uiClapsChildren, index)
      return
    end
  end
end

local function appendChild(parent, child)
  if parent == nil then
    return
  end

  parent.__uiClapsChildren = parent.__uiClapsChildren or {}
  for _, existing in ipairs(parent.__uiClapsChildren) do
    if existing == child then
      return
    end
  end

  table.insert(parent.__uiClapsChildren, child)
end

local function makeSignal()
  local listeners = {}
  local signal = {
    __uiClapsSignal = true,
  }

  function signal:Connect(callback)
    if type(callback) ~= "function" then
      error("RBXScriptSignal:Connect expects a function", 2)
    end

    local connection = {
      __uiClapsConnection = true,
      Connected = true,
    }

    function connection:Disconnect()
      self.Connected = false
    end

    table.insert(listeners, {
      callback = callback,
      connection = connection,
    })

    return connection
  end

  function signal:Once(callback)
    local connection
    connection = self:Connect(function(...)
      connection:Disconnect()
      callback(...)
    end)
    return connection
  end

  function signal:Fire(...)
    for _, listener in ipairs(listeners) do
      if listener.connection.Connected then
        listener.callback(...)
      end
    end

    for index = #listeners, 1, -1 do
      if not listeners[index].connection.Connected then
        table.remove(listeners, index)
      end
    end
  end

  function signal:Wait()
    return nil
  end

  return signal
end

local function getInstanceSignal(instance, signalName)
  local signals = rawget(instance, "__uiClapsSignals")
  if signals == nil then
    return nil
  end

  signals[signalName] = signals[signalName] or makeSignal()
  return signals[signalName]
end

local function fireInstanceSignal(instance, signalName, ...)
  local signal = getInstanceSignal(instance, signalName)
  if signal ~= nil then
    signal:Fire(...)
  end
end

local function firePropertyChanged(instance, property)
  fireInstanceSignal(instance, "Changed", property)
  fireInstanceSignal(instance, property)
end

local function visitSyntheticDescendants(instance, callback)
  for _, child in ipairs(rawget(instance, "__uiClapsChildren") or {}) do
    callback(child)
    visitSyntheticDescendants(child, callback)
  end
end

local function fireAncestorSignal(instance, signalName, descendant)
  local current = instance
  while current ~= nil do
    fireInstanceSignal(current, signalName, descendant)
    current = current.Parent
  end
end

local function setSyntheticParent(instance, parent)
  local previous = rawget(instance, "__uiClapsParent")
  if previous == parent then
    return
  end

  if previous ~= nil then
    fireAncestorSignal(previous, "DescendantRemoving", instance)
    visitSyntheticDescendants(instance, function(descendant)
      fireAncestorSignal(previous, "DescendantRemoving", descendant)
    end)
  end

  removeChild(previous, instance)
  rawset(instance, "__uiClapsParent", parent)
  appendChild(parent, instance)

  if previous ~= nil then
    fireInstanceSignal(previous, "ChildRemoved", instance)
  end
  if parent ~= nil then
    fireInstanceSignal(parent, "ChildAdded", instance)
    fireAncestorSignal(parent, "DescendantAdded", instance)
    visitSyntheticDescendants(instance, function(descendant)
      fireAncestorSignal(parent, "DescendantAdded", descendant)
    end)
  end

  fireInstanceSignal(instance, "AncestryChanged", instance, parent)
  visitSyntheticDescendants(instance, function(descendant)
    fireInstanceSignal(descendant, "AncestryChanged", descendant, descendant.Parent)
  end)
  firePropertyChanged(instance, "Parent")
end

local function makeSyntheticInstance(className)
  className = normalizeClassName(className)
  syntheticOrder += 1

  local instance = {
    __uiClapsInstance = true,
    __uiClapsSyntheticInstance = true,
    __uiClapsClassName = className,
    __uiClapsName = className,
    __uiClapsParent = nil,
    __uiClapsChildren = {},
    __uiClapsProperties = {},
    __uiClapsAttributes = {},
    __uiClapsSignals = {},
    __uiClapsOrder = syntheticOrder,
  }

  local methods = {}

  function methods:FindFirstChild(childName)
    for _, child in ipairs(self.__uiClapsChildren) do
      if child.Name == childName then
        return child
      end
    end
    return nil
  end

  function methods:FindFirstChildOfClass(className)
    className = normalizeClassName(className)
    for _, child in ipairs(self.__uiClapsChildren) do
      if child.ClassName == className then
        return child
      end
    end
    return nil
  end

  function methods:WaitForChild(childName, _timeOut)
    return self:FindFirstChild(childName)
  end

  function methods:GetChildren()
    local children = {}
    for _, child in ipairs(self.__uiClapsChildren) do
      table.insert(children, child)
    end
    return children
  end

  function methods:GetDescendants()
    local descendants = {}
    local function visit(parent)
      for _, child in ipairs(parent.__uiClapsChildren) do
        table.insert(descendants, child)
        visit(child)
      end
    end
    visit(self)
    return descendants
  end

  function methods:ClearAllChildren()
    for _, child in ipairs(self:GetChildren()) do
      child:Destroy()
    end
  end

  function methods:IsA(className)
    className = normalizeClassName(className)
    return self.ClassName == className
      or (className == "Instance" and isSyntheticInstance(self))
      or (className == "GuiObject" and GUI_CLASSES[self.ClassName] == true)
  end

  function methods:IsDescendantOf(ancestor)
    local current = self.Parent
    while current ~= nil do
      if current == ancestor then
        return true
      end
      current = current.Parent
    end
    return false
  end

  function methods:FindFirstAncestor(childName)
    local current = self.Parent
    while current ~= nil do
      if current.Name == childName then
        return current
      end
      current = current.Parent
    end
    return nil
  end

  function methods:FindFirstAncestorWhichIsA(className)
    className = normalizeClassName(className)
    local current = self.Parent
    while current ~= nil do
      if current:IsA(className) then
        return current
      end
      current = current.Parent
    end
    return nil
  end

  function methods:GetFullName()
    local names = {}
    local current = self
    while current ~= nil do
      table.insert(names, 1, current.Name)
      current = current.Parent
    end
    return table.concat(names, ".")
  end

  function methods:GetPropertyChangedSignal(property)
    self.__uiClapsSignals[property] = self.__uiClapsSignals[property] or makeSignal()
    return self.__uiClapsSignals[property]
  end

  function methods:GetAttributeChangedSignal(attribute)
    local signalName = "__attribute:" .. tostring(attribute)
    self.__uiClapsSignals[signalName] = self.__uiClapsSignals[signalName] or makeSignal()
    return self.__uiClapsSignals[signalName]
  end

  function methods:GetAttribute(attribute)
    return self.__uiClapsAttributes[attribute]
  end

  function methods:SetAttribute(attribute, value)
    self.__uiClapsAttributes[attribute] = value
    local signal = self.__uiClapsSignals["__attribute:" .. tostring(attribute)]
    if signal ~= nil then
      signal:Fire(value)
    end
  end

  function methods:Clone()
    local clone = makeSyntheticInstance(self.ClassName)
    clone.Name = self.Name
    for key, value in pairs(self.__uiClapsProperties) do
      clone[key] = value
    end
    for key, value in pairs(self.__uiClapsAttributes) do
      clone:SetAttribute(key, value)
    end
    for _, child in ipairs(self.__uiClapsChildren) do
      child:Clone().Parent = clone
    end
    return clone
  end

  function methods:Destroy()
    fireInstanceSignal(self, "Destroying")
    for _, child in ipairs(self:GetChildren()) do
      child:Destroy()
    end
    self.Parent = nil
    self.__uiClapsDestroyed = true
  end

  return setmetatable(instance, {
    __index = function(self, key)
      if key == "Name" then
        return rawget(self, "__uiClapsName")
      end
      if key == "ClassName" then
        return rawget(self, "__uiClapsClassName")
      end
      if key == "Parent" then
        return rawget(self, "__uiClapsParent")
      end
      if key == "AbsolutePosition" then
        return { X = 0, Y = 0 }
      end
      if key == "AbsoluteSize" then
        return { X = 0, Y = 0 }
      end

      local method = methods[key]
      if method ~= nil then
        return method
      end

      if INSTANCE_SIGNALS[key] then
        local signals = rawget(self, "__uiClapsSignals")
        signals[key] = signals[key] or makeSignal()
        return signals[key]
      end

      local properties = rawget(self, "__uiClapsProperties")
      if properties[key] ~= nil then
        return properties[key]
      end

      for _, child in ipairs(rawget(self, "__uiClapsChildren")) do
        if child.Name == key then
          return child
        end
      end

      return nil
    end,
    __newindex = function(self, key, value)
      if key == "Name" then
        rawset(self, "__uiClapsName", tostring(value))
        firePropertyChanged(self, "Name")
        return
      end
      if key == "Parent" then
        if value ~= nil and not isInstanceProxy(value) then
          error("Parent must be an Instance or nil", 2)
        end
        setSyntheticParent(self, value)
        return
      end

      rawget(self, "__uiClapsProperties")[key] = value
      firePropertyChanged(self, key)
    end,
  })
end

local function makeInstanceProxy(node)
  if proxyByNode[node] ~= nil then
    return proxyByNode[node]
  end

  local proxy = setmetatable({
    __uiClapsInstance = true,
    __uiClapsNode = node,
    Name = node.name,
    ClassName = node.className,
    Parent = node.Parent and makeInstanceProxy(node.Parent) or nil,
  }, {
    __index = function(_, key)
      if key == "FindFirstChild" then
        return function(_, childName)
          local child = findRojoChild(node, childName) or ensureUiClapsRuntimeChild(node, childName)
          if child ~= nil then
            return makeInstanceProxy(child)
          end
          return nil
        end
      end

      if key == "WaitForChild" then
        return function(self, childName, _timeOut)
          return self:FindFirstChild(childName)
        end
      end

      if key == "FindFirstChildOfClass" then
        return function(_, className)
          className = normalizeClassName(className)
          for _, child in ipairs(node.children or {}) do
            if child.className == className then
              return makeInstanceProxy(child)
            end
          end
          return nil
        end
      end

      if key == "GetChildren" then
        return function()
          local children = {}
          for _, child in ipairs(node.children or {}) do
            table.insert(children, makeInstanceProxy(child))
          end
          return children
        end
      end

      if key == "GetDescendants" then
        return function()
          local descendants = {}
          local function visit(parent)
            for _, child in ipairs(parent.children or {}) do
              table.insert(descendants, makeInstanceProxy(child))
              visit(child)
            end
          end
          visit(node)
          return descendants
        end
      end

      if key == "ClearAllChildren" then
        return function()
        end
      end

      if key == "IsA" then
        return function(_, className)
          className = normalizeClassName(className)
          return node.className == className
            or (className == "Instance" and true)
            or (className == "GuiObject" and GUI_CLASSES[node.className] == true)
        end
      end

      if key == "IsDescendantOf" then
        return function(_, ancestor)
          local current = node.Parent
          while current ~= nil do
            if makeInstanceProxy(current) == ancestor then
              return true
            end
            current = current.Parent
          end
          return false
        end
      end

      if key == "FindFirstAncestor" then
        return function(_, childName)
          local current = node.Parent
          while current ~= nil do
            if current.name == childName then
              return makeInstanceProxy(current)
            end
            current = current.Parent
          end
          return nil
        end
      end

      if key == "FindFirstAncestorWhichIsA" then
        return function(_, className)
          className = normalizeClassName(className)
          local current = node.Parent
          while current ~= nil do
            if current.className == className then
              return makeInstanceProxy(current)
            end
            current = current.Parent
          end
          return nil
        end
      end

      if key == "GetFullName" then
        return function()
          return node.instancePath
        end
      end

      if key == "Destroy" then
        return function()
        end
      end

      if key == "GetPropertyChangedSignal" or key == "GetAttributeChangedSignal" then
        return function()
          return makeSignal()
        end
      end

      if key == "GetAttribute" then
        return function()
          return nil
        end
      end

      if key == "SetAttribute" then
        return function()
        end
      end

      if key == "AbsolutePosition" then
        return { X = 0, Y = 0 }
      end

      if key == "AbsoluteSize" then
        return { X = 0, Y = 0 }
      end

      if INSTANCE_SIGNALS[key] then
        return makeSignal()
      end

      local child = findRojoChild(node, key) or ensureUiClapsRuntimeChild(node, key)
      if child ~= nil then
        return makeInstanceProxy(child)
      end

      return nil
    end,
  })

  proxyByNode[node] = proxy
  return proxy
end

local game

local function createReflectionService()
  local service = makeSyntheticInstance("ReflectionService")
  function service:GetClasses()
    local classes = {}
    for className in pairs(CLASS_NAMES) do
      table.insert(classes, { Name = className })
    end
    return classes
  end
  return service
end

local RENDER_PRIORITY_VALUES = {
  First = 0,
  Input = 100,
  Camera = 200,
  Character = 300,
  Last = 2000,
}

local function renderPriorityValue(priority)
  if type(priority) == "number" then
    return priority
  end

  if type(priority) == "table" then
    if type(priority.Value) == "number" then
      return priority.Value
    end

    local serialized = priority.__uiClapsSerialized
    if type(serialized) == "table" then
      if type(serialized.value) == "number" then
        return serialized.value
      end
      if serialized.enumType == "RenderPriority" and type(serialized.name) == "string" then
        return RENDER_PRIORITY_VALUES[serialized.name] or 0
      end
    end
  end

  return 0
end

local function createRunService()
  local service = makeSyntheticInstance("RunService")
  local renderBindings = {}
  local renderBindingOrder = 0

  service.PreRender = makeSignal()
  service.RenderStepped = makeSignal()
  service.PreAnimation = makeSignal()
  service.PreSimulation = makeSignal()
  service.PostSimulation = makeSignal()
  service.Heartbeat = makeSignal()
  service.FixedHeartbeat = makeSignal()
  service.Stepped = makeSignal()

  function service:BindToRenderStep(name, priority, callback)
    if type(name) ~= "string" then
      error("RunService:BindToRenderStep expects a string name", 2)
    end
    if type(callback) ~= "function" then
      error("RunService:BindToRenderStep expects a callback", 2)
    end

    renderBindingOrder += 1
    renderBindings[name] = {
      name = name,
      priority = renderPriorityValue(priority),
      callback = callback,
      order = renderBindingOrder,
    }
  end

  function service:UnbindFromRenderStep(name)
    renderBindings[name] = nil
  end

  function service:IsStudio()
    return false
  end
  function service:IsRunning()
    return true
  end
  function service:IsClient()
    return true
  end
  function service:IsServer()
    return false
  end

  function service:__uiClapsStep(deltaTime)
    local bindings = {}
    for _, binding in pairs(renderBindings) do
      table.insert(bindings, binding)
    end
    table.sort(bindings, function(left, right)
      if left.priority ~= right.priority then
        return left.priority < right.priority
      end
      return left.order < right.order
    end)

    for _, binding in ipairs(bindings) do
      if renderBindings[binding.name] == binding then
        binding.callback(deltaTime)
      end
    end

    self.PreRender:Fire(deltaTime)
    self.RenderStepped:Fire(deltaTime)
    self.PreAnimation:Fire(deltaTime)
    self.PreSimulation:Fire(deltaTime)
    self.Stepped:Fire(0, deltaTime)
    self.PostSimulation:Fire(deltaTime)
    self.Heartbeat:Fire(deltaTime)
    self.FixedHeartbeat:Fire(deltaTime)
  end

  return service
end

local function createTweenService()
  local service = makeSyntheticInstance("TweenService")

  function service:Create(instance, _tweenInfo, goals)
    if not isInstanceProxy(instance) then
      error("TweenService:Create expects an Instance", 2)
    end
    if type(goals) ~= "table" then
      error("TweenService:Create expects a property goal table", 2)
    end

    local tween = {
      Completed = makeSignal(),
      PlaybackState = "Begin",
    }

    function tween:Play()
      self.PlaybackState = "Playing"
      for key, value in pairs(goals) do
        instance[key] = value
      end
      self.PlaybackState = "Completed"
      self.Completed:Fire("Completed")
    end

    function tween:Pause()
      self.PlaybackState = "Paused"
    end

    function tween:Cancel()
      self.PlaybackState = "Cancelled"
      self.Completed:Fire("Cancelled")
    end

    function tween:Destroy()
      self.PlaybackState = "Cancelled"
    end

    return tween
  end

  function service:GetValue(alpha)
    return alpha
  end

  return service
end

local function createUserInputService()
  local service = makeSyntheticInstance("UserInputService")
  service.InputBegan = makeSignal()
  service.InputChanged = makeSignal()
  service.InputEnded = makeSignal()
  service.JumpRequest = makeSignal()
  service.LastInputTypeChanged = makeSignal()
  service.TouchEnabled = false
  service.MouseEnabled = true
  service.KeyboardEnabled = true
  service.GamepadEnabled = false
  service.VREnabled = false

  function service:GetMouseLocation()
    return { X = 0, Y = 0 }
  end
  function service:IsKeyDown()
    return false
  end
  function service:IsMouseButtonPressed()
    return false
  end
  function service:GetKeysPressed()
    return {}
  end
  function service:GetMouseButtonsPressed()
    return {}
  end
  function service:GetConnectedGamepads()
    return {}
  end

  return service
end

local function createGuiService()
  local service = makeSyntheticInstance("GuiService")
  service.MenuOpened = makeSignal()
  service.MenuClosed = makeSignal()
  service.GuiVisibilityChangedSignal = makeSignal()

  function service:GetGuiInset()
    return { X = 0, Y = 0 }, { X = 0, Y = 0 }
  end
  function service:GetScreenResolution()
    return { X = 0, Y = 0 }
  end
  function service:IsTenFootInterface()
    return false
  end

  return service
end

local function createContextActionService()
  local service = makeSyntheticInstance("ContextActionService")
  local boundActions = {}

  function service:BindAction(actionName, callback, createTouchButton, ...)
    boundActions[actionName] = {
      callback = callback,
      createTouchButton = createTouchButton == true,
      inputs = { ... },
    }
  end
  function service:BindActionAtPriority(actionName, callback, createTouchButton, priority, ...)
    boundActions[actionName] = {
      callback = callback,
      createTouchButton = createTouchButton == true,
      priority = priority,
      inputs = { ... },
    }
  end
  function service:UnbindAction(actionName)
    boundActions[actionName] = nil
  end
  function service:UnbindAllActions()
    boundActions = {}
  end
  function service:GetAllBoundActionInfo()
    return boundActions
  end
  function service:GetBoundActionInfo(actionName)
    return boundActions[actionName]
  end

  return service
end

local function createCollectionService()
  local service = makeSyntheticInstance("CollectionService")
  local tagsByInstance = {}
  local addedSignals = {}
  local removedSignals = {}

  local function tagsFor(instance)
    tagsByInstance[instance] = tagsByInstance[instance] or {}
    return tagsByInstance[instance]
  end

  function service:AddTag(instance, tag)
    local tags = tagsFor(instance)
    if tags[tag] == true then
      return
    end
    tags[tag] = true
    if addedSignals[tag] ~= nil then
      addedSignals[tag]:Fire(instance)
    end
  end
  function service:RemoveTag(instance, tag)
    local tags = tagsFor(instance)
    if tags[tag] ~= true then
      return
    end
    tags[tag] = nil
    if removedSignals[tag] ~= nil then
      removedSignals[tag]:Fire(instance)
    end
  end
  function service:HasTag(instance, tag)
    local tags = tagsByInstance[instance]
    return tags ~= nil and tags[tag] == true
  end
  function service:GetTags(instance)
    local result = {}
    for tag in pairs(tagsByInstance[instance] or {}) do
      table.insert(result, tag)
    end
    return result
  end
  function service:GetTagged(tag)
    local result = {}
    for instance, tags in pairs(tagsByInstance) do
      if tags[tag] == true then
        table.insert(result, instance)
      end
    end
    return result
  end
  function service:GetInstanceAddedSignal(tag)
    addedSignals[tag] = addedSignals[tag] or makeSignal()
    return addedSignals[tag]
  end
  function service:GetInstanceRemovedSignal(tag)
    removedSignals[tag] = removedSignals[tag] or makeSignal()
    return removedSignals[tag]
  end

  return service
end

local function createContentProvider()
  local service = makeSyntheticInstance("ContentProvider")
  service.AssetFetchFailed = makeSignal()

  function service:PreloadAsync(_assets, callback)
    if type(callback) == "function" then
      callback("", "Success")
    end
  end
  function service:GetAssetFetchStatus()
    return "Success"
  end
  function service:GetAssetFetchStatusChangedSignal()
    return makeSignal()
  end

  return service
end

local function createTextService()
  local service = makeSyntheticInstance("TextService")

  function service:GetTextSize(text, textSize, _font, bounds)
    local size = tonumber(textSize) or 14
    local width = math.ceil(#tostring(text or "") * size * 0.55)
    local height = math.ceil(size)
    if type(bounds) == "table" and type(bounds.X) == "number" and bounds.X > 0 then
      width = math.min(width, bounds.X)
    end
    return { X = width, Y = height }
  end

  function service:GetTextBoundsAsync(params)
    params = params or {}
    return self:GetTextSize(params.Text or "", params.Size or params.TextSize or 14, params.Font, params.Width or params.Bounds)
  end

  return service
end

local function createHttpService()
  local service = makeSyntheticInstance("HttpService")

  function service:JSONEncode(value)
    return serde.json.encode(value)
  end
  function service:JSONDecode(value)
    return serde.json.decode(value)
  end
  function service:GenerateGUID(wrapInCurlyBraces)
    local guid = "00000000-0000-4000-8000-000000000000"
    return if wrapInCurlyBraces == false then guid else "{" .. guid .. "}"
  end
  function service:UrlEncode(value)
    local encoded = tostring(value or ""):gsub("([^%w%-_%.~])", function(char)
      return string.format("%%%02X", string.byte(char))
    end)
    return encoded
  end

  return service
end

local function createPlayersService()
  local service = makeSyntheticInstance("Players")
  local localPlayer = makeSyntheticInstance("Player")
  localPlayer.Name = "LocalPlayer"
  local playerGui = makeSyntheticInstance("PlayerGui")
  playerGui.Name = "PlayerGui"
  playerGui.Parent = localPlayer
  localPlayer.Parent = service
  service.LocalPlayer = localPlayer
  return service
end

local function findRojoService(serviceName)
  local child = findRojoChild(request.rojoTree, serviceName)
  if child ~= nil then
    return makeInstanceProxy(child)
  end
  return nil
end

local function getSyntheticService(serviceName)
  if syntheticServices[serviceName] ~= nil then
    return syntheticServices[serviceName]
  end

  local service
  if serviceName == "RunService" then
    service = createRunService()
  elseif serviceName == "TweenService" then
    service = createTweenService()
  elseif serviceName == "UserInputService" then
    service = createUserInputService()
  elseif serviceName == "GuiService" then
    service = createGuiService()
  elseif serviceName == "ContextActionService" then
    service = createContextActionService()
  elseif serviceName == "CollectionService" then
    service = createCollectionService()
  elseif serviceName == "ContentProvider" then
    service = createContentProvider()
  elseif serviceName == "TextService" then
    service = createTextService()
  elseif serviceName == "HttpService" then
    service = createHttpService()
  elseif serviceName == "ReflectionService" then
    service = createReflectionService()
  elseif serviceName == "Players" then
    service = createPlayersService()
  else
    service = makeSyntheticInstance(serviceName)
  end

  service.Name = serviceName
  syntheticServices[serviceName] = service
  return service
end

local function makeGameProxy()
  local proxy = makeInstanceProxy(request.rojoTree)
  return setmetatable({
    __uiClapsInstance = true,
    __uiClapsNode = request.rojoTree,
    Name = "game",
    ClassName = "DataModel",
  }, {
    __index = function(_, key)
      if key == "GetService" then
        return function(_, serviceName)
          return findRojoService(serviceName) or getSyntheticService(serviceName)
        end
      end

      if key == "IsLoaded" then
        return function()
          return true
        end
      end

      if key == "Loaded" then
        syntheticServices.__Loaded = syntheticServices.__Loaded or makeSignal()
        return syntheticServices.__Loaded
      end

      local value = proxy[key]
      if value ~= nil then
        return value
      end

      return findRojoService(key) or getSyntheticService(key)
    end,
  })
end

game = makeGameProxy()

local function nodeForFile(filePath)
  return nodeByFile[normalizePath(filePath)]
end

local function uiClapsTypeof(value)
  if isInstanceProxy(value) then
    return "Instance"
  end

  if type(value) == "table" and value.__uiClapsSignal == true then
    return "RBXScriptSignal"
  end

  if type(value) == "table" and value.__uiClapsConnection == true then
    return "RBXScriptConnection"
  end

  if type(value) == "table" and value.__uiClapsSerialized ~= nil then
    local serialized = value.__uiClapsSerialized
    if type(serialized) == "table" and serialized["$type"] ~= nil then
      return serialized["$type"]
    end
  end

  if _G.typeof ~= nil then
    return _G.typeof(value)
  end

  return type(value)
end

local function uiClapsType(value)
  if isInstanceProxy(value) then
    return "userdata"
  end

  return _G.type(value)
end

local Instance = {}
function Instance.new(className)
  return makeSyntheticInstance(className)
end

local previewTask = _G.task or {}
previewTask.defer = previewTask.defer or function(callback, ...)
  callback(...)
end
previewTask.spawn = previewTask.spawn or function(callback, ...)
  callback(...)
end
previewTask.delay = previewTask.delay or function(_, callback, ...)
  callback(...)
end
previewTask.cancel = previewTask.cancel or function()
end

local previewVector = _G.vector or {
  zero = { X = 0, Y = 0, Z = 0 },
  create = function(x, y, z)
    return { X = x or 0, Y = y or 0, Z = z or 0 }
  end,
}

local function resolveAlias(moduleId)
  for alias, aliasPath in pairs(request.aliases or {}) do
    if string.sub(alias, 1, 5) ~= "game." then
      if moduleId == alias then
        return resolveModuleFile(aliasPath)
      end

      local prefix = alias .. "/"
      if string.sub(moduleId, 1, #prefix) == prefix then
        return resolveModuleFile(joinPath(aliasPath, string.sub(moduleId, #prefix + 1)))
      end
    end
  end

  return nil
end

local function makeEnv(modulePath)
  local env = {}
  setmetatable(env, { __index = _G })

  env.game = game
  env.Instance = Instance
  env.type = uiClapsType
  env.typeof = uiClapsTypeof
  env.task = previewTask
  env.vector = previewVector
  env.print = function(...)
    local parts = {}
    for index = 1, select("#", ...) do
      table.insert(parts, tostring(select(index, ...)))
    end
    table.insert(outputLogs, {
      level = "print",
      message = table.concat(parts, "\t"),
    })
  end
  env.warn = function(...)
    local parts = {}
    for index = 1, select("#", ...) do
      table.insert(parts, tostring(select(index, ...)))
    end
    table.insert(outputLogs, {
      level = "warn",
      message = table.concat(parts, "\t"),
    })
  end
  env.newproxy = _G.newproxy or function()
    return setmetatable({}, {})
  end
  env.script = nodeForFile(modulePath) and makeInstanceProxy(nodeForFile(modulePath)) or nil

  local function localRequire(moduleId)
    if moduleId == "@ui-claps/adapter" then
      return loadModule(request.adapterPath)
    end

    if moduleId == "@ui-claps/rovy" or moduleId == "ui-claps/rovy" then
      return loadModule(adapterSibling("rovy.luau"))
    end

    if moduleId == "@ui-claps/rovy-vide" or moduleId == "ui-claps/rovy-vide" then
      return loadModule(adapterSibling("rovy-vide.luau"))
    end

    if type(moduleId) == "table" and moduleId.__uiClapsInstance then
      local node = moduleId.__uiClapsNode
      if node.filePath == nil then
        error("Instance " .. node.instancePath .. " is not backed by a ModuleScript", 2)
      end
      return loadModule(node.filePath)
    end

    if type(moduleId) ~= "string" then
      error("require expects a string path or virtual ModuleScript instance", 2)
    end

    local resolved = resolveAlias(moduleId)
    if resolved ~= nil then
      return loadModule(resolved)
    end

    if string.sub(moduleId, 1, 2) == "./" or string.sub(moduleId, 1, 3) == "../" then
      return loadModule(resolveModuleFile(normalizePath(joinPath(dirname(modulePath), moduleId))))
    end

    return loadModule(resolveModuleFile(moduleId))
  end

  env.require = localRequire

  if normalizePath(modulePath) ~= normalizePath(request.adapterPath) then
    local adapter = localRequire("@ui-claps/adapter")
    adapter.installGlobals(env)
  end

  return env
end

function loadModule(modulePath)
  modulePath = normalizePath(modulePath)

  if moduleCache[modulePath] ~= nil then
    return moduleCache[modulePath]
  end

  local source = fs.readFileSync(modulePath)
  local bytecode = luau.compile(source, {
    debug_level = 2,
    optimization_level = 1,
  })
  local loaded = luau.load(bytecode, {
    env = makeEnv(modulePath),
    chunk_name = modulePath,
  })

  local result = loaded()
  moduleCache[modulePath] = result
  return result
end

local function serialize(value)
  local adapter = loadModule(request.adapterPath)
  return adapter.serialize(value)
end

local function controlDefaults(controls)
  local props = {}
  for key, control in pairs(controls or {}) do
    props[key] = control.default
  end
  return props
end

local function mergeProps(defaults, overrides)
  local merged = {}
  for key, value in pairs(defaults or {}) do
    merged[key] = value
  end
  for key, value in pairs(overrides or {}) do
    merged[key] = value
  end
  return merged
end

local function writeResponse(response)
  io.stdout:write(serde.json.encode(response))
end

local function moduleFromInstancePath(instancePath)
  local node = pathByInstance[instancePath]
  if node == nil then
    return nil
  end
  return makeInstanceProxy(node)
end

local function requireInstanceModule(module)
  if type(module) ~= "table" or module.__uiClapsInstance ~= true then
    error("Expected a ModuleScript instance.", 3)
  end

  local node = module.__uiClapsNode
  if node == nil or node.filePath == nil then
    error("Instance is not backed by a ModuleScript.", 3)
  end

  return loadModule(node.filePath)
end

local function requireRovyVide()
  local module = moduleFromInstancePath("game.ReplicatedStorage.rbxts_include.node_modules.@rovy.vide.out")
  if module == nil then
    local replicatedStorage = game:GetService("ReplicatedStorage")
    module = replicatedStorage
      :WaitForChild("rbxts_include")
      :WaitForChild("node_modules")
      :WaitForChild("@rovy")
      :WaitForChild("vide")
      :WaitForChild("out")
  end
  return requireInstanceModule(module)
end

local function requireRovyUi()
  local module = moduleFromInstancePath("game.ReplicatedStorage.rbxts_include.node_modules.@rovy.ui.out")
  if module == nil then
    local replicatedStorage = game:GetService("ReplicatedStorage")
    module = replicatedStorage
      :WaitForChild("rbxts_include")
      :WaitForChild("node_modules")
      :WaitForChild("@rovy")
      :WaitForChild("ui")
      :WaitForChild("out")
  end

  local exports = requireInstanceModule(module)
  local rovyUi = exports.rovyUi or exports.default or exports
  if type(rovyUi) ~= "table" or type(rovyUi.new) ~= "function" or type(rovyUi.start) ~= "function" then
    error("@rovy/ui did not export new(root) and start(root, callback).")
  end
  return rovyUi
end

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

local function normalizeInstanceList(value, label)
  if isInstanceProxy(value) then
    return { value }
  end

  if isArray(value) then
    local roots = {}
    for _, child in ipairs(value) do
      if not isInstanceProxy(child) then
        error(label .. " must contain only Instances.")
      end
      table.insert(roots, child)
    end
    if #roots == 0 then
      error(label .. " must include at least one Instance.")
    end
    return roots
  end

  error(label .. " must be an Instance or an array of Instances.")
end

local function parentRenderResult(result, target)
  if result == nil then
    return
  end

  if isInstanceProxy(result) then
    result.Parent = target
    return
  end

  if isArray(result) then
    for _, child in ipairs(result) do
      if not isInstanceProxy(child) then
        error("Rovy story returned an unsupported array value. Expected only Instances.")
      end
      child.Parent = target
    end
    return
  end

  error("Rovy story returned an unsupported value. Expected Instance, Instance[], function, or void.")
end

local function runCleanup(cleanups)
  for index = #cleanups, 1, -1 do
    local cleanup = cleanups[index]
    if type(cleanup) == "function" then
      cleanup()
    end
  end
end

local function pumpPreviewFrame()
  local runService = syntheticServices.RunService
  if type(runService) == "table" and type(runService.__uiClapsStep) == "function" then
    runService:__uiClapsStep(1 / 60)
  end
end

local function prepareRovyUiRuntime(runtimeConfig, baseCtx)
  local rovyUi = requireRovyUi()
  local rawRoots = baseCtx.target
  if type(runtimeConfig) == "table" and runtimeConfig.roots ~= nil then
    rawRoots = runtimeConfig.roots
    if type(rawRoots) == "function" then
      rawRoots = rawRoots(baseCtx)
    end
  end

  local rootInstances = normalizeInstanceList(rawRoots, "Rovy UI runtime roots")
  local roots = {}
  for _, rootInstance in ipairs(rootInstances) do
    table.insert(roots, rovyUi.new(rootInstance))
  end

  return {
    rovyUi = rovyUi,
    root = roots[1],
    roots = roots,
    start = function(callback)
      if type(callback) ~= "function" then
        error("Rovy UI runtime start(callback) expects a function.")
      end
      rovyUi.start(roots[1], callback)
    end,
    startAll = function(callback)
      if type(callback) ~= "function" then
        error("Rovy UI runtime startAll(callback) expects a function.")
      end
      for index, root in ipairs(roots) do
        rovyUi.start(root, function()
          callback(root, index)
        end)
      end
    end,
  }
end

local function prepareRovyRuntime(runtimeConfig, baseCtx)
  if runtimeConfig == nil or runtimeConfig == "vide" then
    return nil, nil
  end

  if runtimeConfig == "rovy-ui" then
    return prepareRovyUiRuntime(runtimeConfig, baseCtx), "rovy-ui"
  end

  if type(runtimeConfig) == "table" then
    if runtimeConfig.kind == "rovy-ui" then
      return prepareRovyUiRuntime(runtimeConfig, baseCtx), "rovy-ui"
    end
    error("Rovy runtime config table must include kind = \"rovy-ui\".")
  end

  if type(runtimeConfig) == "function" then
    return runtimeConfig(baseCtx), "custom"
  end

  error("Rovy runtime must be \"rovy-ui\", \"vide\", a Rovy UI config, or a function.")
end

local function serializePreviewValue(value)
  if isInstanceProxy(value) then
    local ok, fullName = pcall(function()
      return value:GetFullName()
    end)
    return if ok then fullName else tostring(value)
  end

  return serialize(value)
end

local function serializePreviewInstance(instance)
  local children = {}
  for _, child in ipairs(instance:GetChildren()) do
    table.insert(children, {
      order = child.__uiClapsOrder or 0,
      node = serializePreviewInstance(child),
    })
  end

  table.sort(children, function(left, right)
    local leftLayout = left.node.props.LayoutOrder
    local rightLayout = right.node.props.LayoutOrder
    if type(leftLayout) == "number" and type(rightLayout) == "number" and leftLayout ~= rightLayout then
      return leftLayout < rightLayout
    end
    return left.order < right.order
  end)

  local serializedChildren = {}
  for _, child in ipairs(children) do
    table.insert(serializedChildren, child.node)
  end

  local props = {}
  for key, value in pairs(instance.__uiClapsProperties or {}) do
    props[key] = serializePreviewValue(value)
  end

  local node = {
    className = instance.ClassName,
    props = props,
    children = serializedChildren,
  }

  if instance.Name ~= instance.ClassName then
    node.name = instance.Name
    node.props.Name = instance.Name
  end

  return node
end

local function serializePreviewTargetChildren(target)
  local children = target:GetChildren()
  if #children == 0 then
    return nil
  end

  if #children == 1 then
    return serializePreviewInstance(children[1])
  end

  local serializedChildren = {}
  for _, child in ipairs(children) do
    table.insert(serializedChildren, serializePreviewInstance(child))
  end

  return {
    className = "Folder",
    name = "RovyVideRoot",
    props = { Name = "RovyVideRoot" },
    children = serializedChildren,
  }
end

local function renderRovyVideStory(story, props)
  if type(story.bootstrap) ~= "function" then
    error("Rovy/Vide story must include bootstrap(props).")
  end

  if story.view == nil then
    error("Rovy/Vide story must include a view class.")
  end

  local app = story.bootstrap(props)
  if app == nil then
    error("Rovy/Vide story bootstrap(props) must return an app.")
  end

  local target = Instance.new("ScreenGui")
  target.Name = "UIClapsRovyVideTarget"

  local rovyVide = requireRovyVide()
  if type(rovyVide.mountView) ~= "function" then
    error("@rovy/vide did not export mountView.")
  end

  local handle = rovyVide.mountView(app, story.view, {
    target = target,
  })

  if type(app) == "table" and type(app.flush) == "function" then
    app:flush()
  end

  pumpPreviewFrame()
  local tree = serializePreviewTargetChildren(target)

  if type(handle) == "table" and type(handle.destroy) == "function" then
    handle.destroy()
  end
  target:Destroy()

  return tree
end

local function renderRovyStory(story, props)
  if type(story.app) ~= "function" then
    error("Rovy story must include app(props).")
  end

  if type(story.render) ~= "function" then
    error("Rovy story must include render(ctx).")
  end

  local app = story.app(props)
  if app == nil then
    error("Rovy story app(props) must return an app.")
  end

  local target = Instance.new("ScreenGui")
  target.Name = "UIClapsRovyTarget"

  local ctx = {
    app = app,
    props = props,
    target = target,
    cleanup = {},
    runtime = nil,
  }

  local runtimeKind
  ctx.runtime, runtimeKind = prepareRovyRuntime(story.runtime, ctx)

  local ok, result = xpcall(function()
    local renderResult = story.render(ctx)
    if type(renderResult) == "function" then
      if runtimeKind ~= "rovy-ui" or type(ctx.runtime) ~= "table" or type(ctx.runtime.start) ~= "function" then
        error("Rovy story returned a function, but only runtime = \"rovy-ui\" can run frame callbacks.")
      end
      ctx.runtime.start(renderResult)
    else
      parentRenderResult(renderResult, target)
    end

    if type(app) == "table" and type(app.flush) == "function" then
      app:flush()
    end

    pumpPreviewFrame()
    return serializePreviewTargetChildren(target)
  end, debug.traceback)

  local cleanupOk, cleanupError = xpcall(function()
    runCleanup(ctx.cleanup)
    if type(story.cleanup) == "function" then
      story.cleanup(ctx)
    end
  end, debug.traceback)
  target:Destroy()

  if not ok then
    error(result)
  end
  if not cleanupOk then
    error(cleanupError)
  end

  return result
end

local function unwrapStoryModule(module)
  if type(module) ~= "table" then
    return module
  end

  if type(module.render) == "function" or module.name ~= nil or module.controls ~= nil then
    return module
  end

  if type(module.default) == "table" then
    return module.default
  end

  if type(module.story) == "table" then
    return module.story
  end

  return module
end

local ok, response = xpcall(function()
  local story = unwrapStoryModule(loadModule(request.storyPath))
  if type(story) ~= "table" then
    error("Story module must return a table.")
  end

  if request.action == "manifest" then
    return {
      ok = true,
      story = {
        name = story.name,
        controls = serialize(story.controls or {}),
      },
      warnings = {},
      output = outputLogs,
    }
  end

  if request.action == "render" then
    local props = mergeProps(controlDefaults(story.controls), request.props or {})
    local tree

    if story.kind == "rovy-vide" then
      tree = renderRovyVideStory(story, props)
    elseif story.kind == "rovy" then
      tree = renderRovyStory(story, props)
    elseif type(story.render) == "function" then
      tree = story.render(props)
      pumpPreviewFrame()
    else
      error("Story table must include render(props).")
    end

    return {
      ok = true,
      tree = serialize(tree),
      warnings = {},
      output = outputLogs,
    }
  end

  error("Unknown worker action " .. tostring(request.action))
end, debug.traceback)

if ok then
  writeResponse(response)
else
  writeResponse({
    ok = false,
    warnings = {},
    output = outputLogs,
    error = {
      message = tostring(response),
      stack = tostring(response),
    },
  })
end
