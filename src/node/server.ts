import express from "express";
import open from "open";
import { readFile } from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import { loadUiClapsConfig } from "./config.js";
import { discoverProject } from "./discovery.js";
import { loadRojoModel } from "./rojo.js";
import { resolveClientAssets } from "./runtime-paths.js";
import { checkZune, getZuneInstallHelp, hydrateStoryManifests, renderStory } from "./zune.js";
import type { ApiErrorResponse, RenderRequest, StoryManifest } from "../shared/types.js";
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
    await vite?.close();
    server.close();
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
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
