import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { JsonValue, RenderResponse, StoryManifest } from "../shared/types.js";
import type {
  ResolvedUiClapsConfig,
  RojoModel,
  WorkerBaseRequest,
  WorkerManifestResponse,
  WorkerRenderResponse,
} from "./types.js";
import { resolveRuntimeFile } from "./runtime-paths.js";

export interface ZuneAvailability {
  available: boolean;
  message?: string;
}

export async function checkZune(command: string): Promise<ZuneAvailability> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        available: false,
        message: `Timed out while checking ${command}.`,
      });
    }, 2500);

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      resolve({
        available: false,
        message:
          error.code === "ENOENT"
            ? `Zune was not found. Install Zune and make sure "${command}" is on PATH.`
            : error.message,
      });
    });

    child.on("close", () => {
      clearTimeout(timeout);
      resolve({ available: true });
    });
  });
}

export function getZuneInstallHelp(command: string): string {
  return [
    `UI Claps requires Zune to execute Luau stories, but "${command}" is not available.`,
    "",
    "Install Zune from https://zune.sh/ and make sure the binary is on PATH,",
    "or set zuneCommand in ui-claps.config.ts to the correct executable path.",
  ].join("\n");
}

export async function hydrateStoryManifests(
  config: ResolvedUiClapsConfig,
  rojo: RojoModel,
  stories: StoryManifest[],
): Promise<{ stories: StoryManifest[]; warnings: string[] }> {
  const warnings: string[] = [];
  const hydrated: StoryManifest[] = [];

  for (const story of stories) {
    const response = await runWorker<WorkerManifestResponse>(config, rojo, {
      action: "manifest",
      storyPath: story.filePath,
    });

    if (!response.ok) {
      hydrated.push(story);
      warnings.push(
        `${story.relativePath}: ${response.error?.message ?? "Could not read story manifest."}`,
      );
      continue;
    }

    hydrated.push({
      ...story,
      name: response.story?.name ?? story.name,
      controls: response.story?.controls ?? {},
    });
    warnings.push(
      ...(response.warnings ?? []).map(
        (warning: string) => `${story.relativePath}: ${warning}`,
      ),
    );
  }

  return { stories: hydrated, warnings };
}

export async function renderStory(
  config: ResolvedUiClapsConfig,
  rojo: RojoModel,
  story: StoryManifest,
  props: Record<string, JsonValue>,
): Promise<RenderResponse> {
  const response = await runWorker<WorkerRenderResponse>(config, rojo, {
    action: "render",
    storyPath: story.filePath,
    props,
  });

  return response;
}

interface WorkerRequestPartial {
  action: "manifest" | "render";
  storyPath: string;
  props?: Record<string, unknown>;
}

async function runWorker<T>(
  config: ResolvedUiClapsConfig,
  rojo: RojoModel,
  partial: WorkerRequestPartial,
): Promise<T> {
  const workerPath = resolveRuntimeFile("worker.luau");
  const adapterPath = resolveRuntimeFile("adapter.luau");
  const tempDir = await mkdtemp(join(tmpdir(), "ui-claps-"));
  const requestPath = join(tempDir, "request.json");

  const request: WorkerBaseRequest = {
    action: partial.action,
    storyPath: partial.storyPath,
    adapterPath,
    rojoTree: rojo.root,
    aliases: config.aliases,
  };

  if (partial.props) {
    request.props = partial.props;
  }

  await writeFile(requestPath, JSON.stringify(request), "utf8");

  try {
    const output = await runZune(config.zuneCommand, workerPath, requestPath, config.projectRoot);
    return JSON.parse(output) as T;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runZune(
  command: string,
  workerPath: string,
  requestPath: string,
  cwd: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["run", workerPath, requestPath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || `Zune worker exited with status code ${code}.`,
          ),
        );
        return;
      }

      resolve(stdout.trim());
    });
  });
}
