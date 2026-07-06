import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import type { ResolvedUiClapsConfig, RojoModel, RojoNode } from "./types.js";

interface RojoProjectFile {
  name?: string;
  tree?: Record<string, unknown>;
}

interface RojoTreeNode {
  $className?: string;
  $path?: string;
  [key: string]: unknown;
}

export async function loadRojoModel(config: ResolvedUiClapsConfig): Promise<RojoModel> {
  const raw = await readFile(config.rojoProject, "utf8");
  const parsed = JSON.parse(raw) as RojoProjectFile;

  if (!parsed.tree || typeof parsed.tree !== "object") {
    throw new Error(`Rojo project ${config.rojoProject} must contain a tree object.`);
  }

  const rootName = parsed.name ?? "game";
  const root = await buildRojoNode(
    rootName,
    parsed.tree as RojoTreeNode,
    dirname(config.rojoProject),
    `game`,
  );

  const modulesByFile: Record<string, string> = {};
  collectModules(root, modulesByFile);

  return { root, modulesByFile };
}

async function buildRojoNode(
  name: string,
  rawNode: RojoTreeNode,
  projectRoot: string,
  instancePath: string,
): Promise<RojoNode> {
  const className = rawNode.$className ?? "Folder";
  const node: RojoNode = {
    name,
    className,
    instancePath,
    children: [],
  };

  if (typeof rawNode.$path === "string") {
    const diskPath = resolve(projectRoot, rawNode.$path);
    const expanded = await expandDiskPath(name, className, instancePath, diskPath);
    if (expanded.filePath) {
      node.filePath = expanded.filePath;
    }
    node.children.push(...expanded.children);
  }

  for (const [childName, childValue] of Object.entries(rawNode)) {
    if (childName.startsWith("$")) continue;
    if (!childValue || typeof childValue !== "object") continue;

    node.children.push(
      await buildRojoNode(
        childName,
        childValue as RojoTreeNode,
        projectRoot,
        `${instancePath}.${childName}`,
      ),
    );
  }

  return node;
}

async function expandDiskPath(
  name: string,
  className: string,
  instancePath: string,
  diskPath: string,
): Promise<{ filePath?: string; children: RojoNode[] }> {
  const info = await stat(diskPath);

  if (info.isFile()) {
    return {
      filePath: diskPath,
      children: [],
    };
  }

  if (!info.isDirectory()) {
    return { children: [] };
  }

  const entries = await readdir(diskPath, { withFileTypes: true });
  const children: RojoNode[] = [];
  let initFilePath: string | undefined = await readPackageMain(diskPath);

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = join(diskPath, entry.name);
    const entryInfo = await stat(entryPath);

    if (entryInfo.isDirectory()) {
      children.push(
        await buildDirectoryNode(
          entry.name,
          entryPath,
          `${instancePath}.${toInstanceName(entry.name)}`,
        ),
      );
      continue;
    }

    if (!entryInfo.isFile() || !isLuauModule(entry.name)) continue;

    if (isInitModule(entry.name)) {
      initFilePath = entryPath;
      continue;
    }

    const childName = toInstanceName(entry.name);
    children.push({
      name: childName,
      className: "ModuleScript",
      instancePath: `${instancePath}.${childName}`,
      filePath: entryPath,
      children: [],
    });
  }

  const expanded: { filePath?: string; children: RojoNode[] } = { children };

  if (initFilePath) {
    expanded.filePath = initFilePath;
  }

  return expanded;
}

async function readPackageMain(diskPath: string): Promise<string | undefined> {
  try {
    const packageJsonPath = join(diskPath, "package.json");
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { main?: unknown };
    if (typeof parsed.main !== "string" || !isLuauModule(parsed.main)) {
      return undefined;
    }

    const mainPath = join(diskPath, parsed.main);
    const mainInfo = await stat(mainPath);
    return mainInfo.isFile() ? mainPath : undefined;
  } catch {
    return undefined;
  }
}

async function buildDirectoryNode(
  directoryName: string,
  diskPath: string,
  instancePath: string,
): Promise<RojoNode> {
  const expanded = await expandDiskPath(directoryName, "Folder", instancePath, diskPath);

  const node: RojoNode = {
    name: toInstanceName(directoryName),
    className: expanded.filePath ? "ModuleScript" : "Folder",
    instancePath,
    children: expanded.children,
  };

  if (expanded.filePath) {
    node.filePath = expanded.filePath;
  }

  return node;
}

function collectModules(node: RojoNode, target: Record<string, string>): void {
  if (node.filePath && target[node.filePath] === undefined) {
    target[node.filePath] = node.instancePath;
  }

  for (const child of node.children) {
    collectModules(child, target);
  }
}

function isLuauModule(fileName: string): boolean {
  return fileName.endsWith(".luau") || fileName.endsWith(".lua");
}

function isInitModule(fileName: string): boolean {
  return /^init(?:\.(?:server|client))?\.(?:lua|luau)$/i.test(fileName);
}

function toInstanceName(name: string): string {
  const extension = extname(name);
  const withoutExtension = extension ? basename(name, extension) : name;
  return withoutExtension.replace(/\.(server|client)$/i, "");
}

export function toDisplayProjectPath(config: ResolvedUiClapsConfig, filePath: string): string {
  return relative(config.projectRoot, filePath).replaceAll("\\", "/");
}
