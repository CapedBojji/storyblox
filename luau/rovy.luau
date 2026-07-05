local function createRovyStory(config, shiftedConfig)
  if type(config) == "table" and config.createRovyStory == createRovyStory then
    config = shiftedConfig
  end

  if type(config) ~= "table" then
    error("createRovyStory expects a story config table.", 2)
  end

  config.kind = "rovy"
  return config
end

return {
  createRovyStory = createRovyStory,
}
