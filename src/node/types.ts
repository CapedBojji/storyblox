import type { ProjectManifest, RenderResponse, StoryManifest } from "../shared/types.js";

export interface UiClapsConfigInput {
  root: string;
  storyRoot?: string;
  rojoProject: string;
  storyPatterns?: string[];
  storybookPatterns?: string[];
  aliases?: Record<string, string>;
  zuneCommand?: string;
  port?: number;
  open?: boolean;
}

export interface ResolvedUiClapsConfig {
  projectRoot: string;
  configPath: string;
  root: string;
  storyRoot: string;
  rojoProject: string;
  storyPatterns: string[];
  storybookPatterns: string[];
  aliases: Record<string, string>;
  zuneCommand: string;
  port: number;
  open: boolean;
}

export interface RojoNode {
  name: string;
  className: string;
  instancePath: string;
  filePath?: string;
  children: RojoNode[];
}

export interface RojoModel {
  root: RojoNode;
  modulesByFile: Record<string, string>;
}

export interface WorkerBaseRequest {
  action: "manifest" | "render";
  storyPath: string;
  adapterPath: string;
  rojoTree: RojoNode;
  aliases: Record<string, string>;
  props?: Record<string, unknown>;
}

export interface WorkerManifestResponse {
  ok: boolean;
  story?: Pick<StoryManifest, "name" | "controls">;
  warnings?: string[];
  error?: {
    message: string;
    stack?: string;
  };
}

export type WorkerRenderResponse = RenderResponse;

export interface AppState {
  config: ResolvedUiClapsConfig;
  project: ProjectManifest;
  rojo: RojoModel;
}
