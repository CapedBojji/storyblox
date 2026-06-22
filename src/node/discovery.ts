import { createHash } from "node:crypto";
import { dirname, relative } from "node:path";
import fg from "fast-glob";
import type { ProjectManifest, StoryManifest, StorybookManifest } from "../shared/types.js";
import type { ResolvedUiClapsConfig } from "./types.js";

export async function discoverProject(config: ResolvedUiClapsConfig): Promise<ProjectManifest> {
  const [storyFiles, storybookFiles] = await Promise.all([
    fg(config.storyPatterns, {
      cwd: config.root,
      absolute: true,
      onlyFiles: true,
      unique: true,
    }),
    fg(config.storybookPatterns, {
      cwd: config.root,
      absolute: true,
      onlyFiles: true,
      unique: true,
    }),
  ]);

  const storybooks = storybookFiles
    .sort()
    .map((filePath) => createStorybookManifest(config, filePath));

  const stories = storyFiles
    .sort()
    .map((filePath) => createStoryManifest(config, filePath, storybooks));

  return {
    root: config.root,
    projectRoot: config.projectRoot,
    configPath: config.configPath,
    zuneCommand: config.zuneCommand,
    stories,
    storybooks,
    warnings: [],
  };
}

export function createStoryManifest(
  config: ResolvedUiClapsConfig,
  filePath: string,
  storybooks: StorybookManifest[],
): StoryManifest {
  const relativePath = normalizeSlash(relative(config.root, filePath));
  const group = findStorybookGroup(filePath, storybooks);

  return {
    id: createStoryId(filePath),
    name: inferStoryName(relativePath),
    filePath,
    relativePath,
    group,
    controls: {},
  };
}

function createStorybookManifest(
  config: ResolvedUiClapsConfig,
  filePath: string,
): StorybookManifest {
  const relativePath = normalizeSlash(relative(config.root, filePath));

  return {
    name: stripStorybookSuffix(relativePath.split("/").at(-1) ?? relativePath),
    filePath,
    relativePath,
    rootDir: dirname(filePath),
  };
}

function findStorybookGroup(filePath: string, storybooks: StorybookManifest[]): string {
  const candidates = storybooks
    .filter((storybook) => filePath.startsWith(storybook.rootDir))
    .sort((a, b) => b.rootDir.length - a.rootDir.length);

  return candidates[0]?.name ?? "Unknown Stories";
}

export function createStoryId(filePath: string): string {
  return createHash("sha1").update(filePath).digest("hex").slice(0, 12);
}

function inferStoryName(relativePath: string): string {
  const fileName = relativePath.split("/").at(-1) ?? relativePath;
  const baseName = fileName
    .replace(/\.story\.luau$/i, "")
    .replace(/\.story\.lua$/i, "")
    .replace(/\.stories\.luau$/i, "")
    .replace(/\.stories\.lua$/i, "");

  return baseName
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function stripStorybookSuffix(fileName: string): string {
  return fileName.replace(/\.storybook\.luau$/i, "").replace(/\.storybook\.lua$/i, "");
}

function normalizeSlash(value: string): string {
  return value.replaceAll("\\", "/");
}
