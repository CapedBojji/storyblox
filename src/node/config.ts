import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfigFromFile } from "vite";
import type { ResolvedUiClapsConfig, UiClapsConfigInput } from "./types.js";

const DEFAULT_STORY_PATTERNS = [
  "**/*.story.lua",
  "**/*.story.luau",
  "**/*.stories.lua",
  "**/*.stories.luau",
];

const DEFAULT_STORYBOOK_PATTERNS = ["**/*.storybook.lua", "**/*.storybook.luau"];

export function defineConfig(config: UiClapsConfigInput): UiClapsConfigInput {
  return config;
}

export function getMissingConfigMessage(configPath: string): string {
  return [
    `UI Claps config was not found at ${configPath}.`,
    "",
    "Create ui-claps.config.ts:",
    "",
    "import { defineConfig } from \"ui-claps\";",
    "",
    "export default defineConfig({",
    "  root: \"src\",",
    "  storyRoot: \"out\", // optional; defaults to root",
    "  rojoProject: \"default.project.json\",",
    "  storyPatterns: [\"**/*.story.lua\", \"**/*.story.luau\", \"**/*.stories.lua\", \"**/*.stories.luau\"],",
    "  storybookPatterns: [\"**/*.storybook.lua\", \"**/*.storybook.luau\"],",
    "  aliases: {",
    "    \"game.ReplicatedStorage.Packages\": \"Packages\"",
    "  },",
    "  zuneCommand: \"zune\",",
    "  port: 4500,",
    "});",
  ].join("\n");
}

export async function loadUiClapsConfig(
  configPath = "ui-claps.config.ts",
  cwd = process.cwd(),
): Promise<ResolvedUiClapsConfig> {
  const absoluteConfigPath = resolve(cwd, configPath);

  if (!existsSync(absoluteConfigPath)) {
    throw new Error(getMissingConfigMessage(absoluteConfigPath));
  }

  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    absoluteConfigPath,
  );

  if (!loaded?.config || typeof loaded.config !== "object") {
    throw new Error(`Config at ${absoluteConfigPath} must export a UI Claps config object.`);
  }

  return normalizeConfig(loaded.config as UiClapsConfigInput, absoluteConfigPath);
}

export function normalizeConfig(
  input: UiClapsConfigInput,
  configPath: string,
): ResolvedUiClapsConfig {
  if (!input.root || typeof input.root !== "string") {
    throw new Error("ui-claps.config.ts must set root to a source directory.");
  }

  if (!input.rojoProject || typeof input.rojoProject !== "string") {
    throw new Error("ui-claps.config.ts must set rojoProject to a Rojo project file.");
  }

  const projectRoot = dirname(configPath);
  const aliasEntries = Object.entries(input.aliases ?? {}) as Array<[string, string]>;
  const aliases = Object.fromEntries(
    aliasEntries.map(([key, value]) => [key, resolve(projectRoot, value)]),
  );

  return {
    projectRoot,
    configPath,
    root: resolve(projectRoot, input.root),
    storyRoot: resolve(projectRoot, input.storyRoot ?? input.root),
    rojoProject: resolve(projectRoot, input.rojoProject),
    storyPatterns: input.storyPatterns?.length ? input.storyPatterns : DEFAULT_STORY_PATTERNS,
    storybookPatterns: input.storybookPatterns?.length
      ? input.storybookPatterns
      : DEFAULT_STORYBOOK_PATTERNS,
    aliases,
    zuneCommand: input.zuneCommand ?? "zune",
    port: input.port ?? 4500,
    open: input.open ?? true,
  };
}
