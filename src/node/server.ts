import express from "express";
import open from "open";
import { readdir, readFile, stat } from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import { loadUiClapsConfig } from "./config.js";
import { discoverProject } from "./discovery.js";
import { loadRojoModel } from "./rojo.js";
import { resolveClientAssets } from "./runtime-paths.js";
import { checkZune, getZuneInstallHelp, hydrateStoryManifests, renderStory } from "./zune.js";
import type { ApiErrorResponse, ProjectUpdateEvent, RenderRequest, StoryManifest } from "../shared/types.js";
import type { AppState, ResolvedUiClapsConfig } from "./types.js";

interface StartOptions {
  configPath: string;
}

export async function startDevServer(options: StartOptions): Promise<void> {
  const config = await loadUiClapsConfig(options.configPath);
  const zune = await checkZune(config.zuneCommand);

  if (!zune.available) {
    throw new Error(getZuneInstallHelp(config.zuneCommand));
  }

  const app = express();
  app.use(express.json({ limit: "2mb" }));

  let appState = await loadAppState(config);
  let projectVersion = 0;
  const eventClients = new Set<express.Response>();
  const watcher = startProjectWatcher(config, async () => {
    projectVersion += 1;
    appState = await loadAppState(config);
    broadcastProjectUpdate(eventClients, projectVersion);
  });

  app.get("/api/project", async (_request, response) => {
    try {
      appState = await loadAppState(config);
      response.json(appState.project);
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/render", async (request, response) => {
    try {
      const body = request.body as RenderRequest;
      appState = await loadAppState(config);
      const story = appState.project.stories.find(
        (candidate: StoryManifest) => candidate.id === body.storyId,
      );

      if (!story) {
        response.status(404).json({ message: `Story ${body.storyId} was not found.` });
        return;
      }

      const rendered = await renderStory(config, appState.rojo, story, body.props ?? {});
      response.json(rendered);
    } catch (error) {
      sendError(response, error);
    }
  });

  app.get("/api/events", (request, response) => {
    response.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    });
    response.write(": connected\n\n");
    eventClients.add(response);

    request.on("close", () => {
      eventClients.delete(response);
    });
  });

  const clientAssets = resolveClientAssets();
  const vite =
    clientAssets.mode === "vite"
      ? await createViteServer({
          root: clientAssets.root,
          configFile: clientAssets.configFile,
          server: { middlewareMode: true },
          appType: "spa",
        })
      : null;

  if (clientAssets.mode === "vite") {
    if (!vite) {
      throw new Error("Vite server was not initialized.");
    }
    app.use(vite.middlewares);
  } else {
    app.use(express.static(clientAssets.root));
    app.use(async (request, response, next) => {
      if (request.method !== "GET") {
        next();
        return;
      }

      response.type("html").send(await readFile(clientAssets.indexHtml, "utf8"));
    });
  }

  const server = app.listen(config.port, () => {
    const url = `http://localhost:${config.port}`;
    console.log(`UI Claps is running at ${url}`);
    if (config.open) {
      void open(url).catch(() => undefined);
    }
  });

  const shutdown = async (): Promise<void> => {
    watcher.close();
    for (const client of eventClients) {
      client.end();
    }
    eventClients.clear();
    await vite?.close();
    server.close();
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
}

interface ProjectWatcher {
  close(): void;
}

function startProjectWatcher(
  config: ResolvedUiClapsConfig,
  onChange: () => Promise<void>,
): ProjectWatcher {
  const roots = Array.from(new Set([config.storyRoot, config.rojoProject]));
  let closed = false;
  let running = false;
  let lastSignature: string | undefined;

  const tick = async (): Promise<void> => {
    if (closed || running) return;
    running = true;
    try {
      const nextSignature = await projectSignature(roots);
      if (lastSignature === undefined) {
        lastSignature = nextSignature;
        return;
      }
      if (nextSignature !== lastSignature) {
        lastSignature = nextSignature;
        await onChange();
      }
    } catch (error) {
      console.warn(
        `UI Claps hot reload watcher failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      running = false;
    }
  };

  void tick();
  const interval = setInterval(() => {
    void tick();
  }, 500);

  return {
    close() {
      closed = true;
      clearInterval(interval);
    },
  };
}

async function projectSignature(paths: string[]): Promise<string> {
  const entries: string[] = [];
  for (const path of paths) {
    await collectSignatureEntries(path, entries);
  }
  return entries.sort().join("|");
}

async function collectSignatureEntries(path: string, entries: string[]): Promise<void> {
  let info;
  try {
    info = await stat(path);
  } catch {
    entries.push(`${path}:missing`);
    return;
  }

  if (info.isDirectory()) {
    const children = await readdir(path, { withFileTypes: true });
    await Promise.all(
      children
        .filter((child) => !shouldIgnoreWatchedEntry(child.name))
        .map((child) => collectSignatureEntries(`${path}/${child.name}`, entries)),
    );
    return;
  }

  if (info.isFile()) {
    entries.push(`${path}:${info.mtimeMs}:${info.size}`);
  }
}

function shouldIgnoreWatchedEntry(name: string): boolean {
  return (
    name === ".git" ||
    name === "node_modules" ||
    name === "tsconfig.tsbuildinfo" ||
    name === "tsconfig.ui-claps.tsbuildinfo" ||
    name.endsWith(".tmp")
  );
}

function broadcastProjectUpdate(clients: Set<express.Response>, version: number): void {
  const event: ProjectUpdateEvent = { type: "project-update", version };
  const payload = `event: project-update\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

async function loadAppState(config: ResolvedUiClapsConfig): Promise<AppState> {
  const rojo = await loadRojoModel(config);
  const project = await discoverProject(config);
  const hydrated = await hydrateStoryManifests(config, rojo, project.stories);

  return {
    config,
    rojo,
    project: {
      ...project,
      stories: hydrated.stories,
      warnings: [...project.warnings, ...hydrated.warnings],
    },
  };
}

function sendError(response: express.Response, error: unknown): void {
  const payload: ApiErrorResponse = {
    message: error instanceof Error ? error.message : String(error),
  };

  if (error instanceof Error && error.stack) {
    payload.details = error.stack;
  }

  response.status(500).json(payload);
}
