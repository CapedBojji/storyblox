import { defineConfig } from "./src/node/index.js";

export default defineConfig({
  root: "demo/src",
  rojoProject: "demo/default.project.json",
  storyPatterns: ["**/*.story.lua", "**/*.story.luau", "**/*.stories.lua", "**/*.stories.luau"],
  storybookPatterns: ["**/*.storybook.lua", "**/*.storybook.luau"],
  aliases: {
    "@demo": "demo/src",
    "game.ReplicatedStorage.Packages": "demo/Packages"
  },
  zuneCommand: "zune",
  port: 4500,
});
