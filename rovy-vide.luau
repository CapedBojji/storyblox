local function createRovyVideStory(config, shiftedConfig)
  if type(config) == "table" and config.createRovyVideStory == createRovyVideStory then
    config = shiftedConfig
  end

  if type(config) ~= "table" then
    error("createRovyVideStory expects a story config table.", 2)
  end

  config.kind = "rovy-vide"
  return config
end

return {
  createRovyVideStory = createRovyVideStory,
}
