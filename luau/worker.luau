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

local function makeInstanceProxy(node)
  return setmetatable({
    __uiClapsInstance = true,
    __uiClapsNode = node,
    Name = node.name,
    ClassName = node.className,
    Parent = node.Parent and makeInstanceProxy(node.Parent) or nil,
  }, {
    __index = function(_, key)
      if key == "FindFirstChild" then
        return function(_, childName)
          for _, child in ipairs(node.children or {}) do
            if child.name == childName then
              return makeInstanceProxy(child)
            end
          end
          return nil
        end
      end

      for _, child in ipairs(node.children or {}) do
        if child.name == key then
          return makeInstanceProxy(child)
        end
      end

      return nil
    end,
  })
end

local game = makeInstanceProxy(request.rojoTree)

local function nodeForFile(filePath)
  return nodeByFile[normalizePath(filePath)]
end

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
  env.script = nodeForFile(modulePath) and makeInstanceProxy(nodeForFile(modulePath)) or nil

  local function localRequire(moduleId)
    if moduleId == "@ui-claps/adapter" then
      return loadModule(request.adapterPath)
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

local ok, response = xpcall(function()
  local story = loadModule(request.storyPath)
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
    }
  end

  if request.action == "render" then
    if type(story.render) ~= "function" then
      error("Story table must include render(props).")
    end

    local props = mergeProps(controlDefaults(story.controls), request.props or {})
    local tree = story.render(props)

    return {
      ok = true,
      tree = serialize(tree),
      warnings = {},
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
    error = {
      message = tostring(response),
      stack = tostring(response),
    },
  })
end
