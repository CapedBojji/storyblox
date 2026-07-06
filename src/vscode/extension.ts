import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import * as vscode from "vscode";
import { resolveConfigPath } from "../node/cli.js";
import { startDevServer, type DevServerHandle } from "../node/server.js";

interface SharedServer {
  handle: DevServerHandle;
  refs: number;
}

const activeServers = new Map<string, SharedServer>();

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "uiClaps.openPreview",
      async (input?: string | vscode.Uri) => {
        try {
          await openPreview(context, input);
        } catch (error) {
          if (isCanceled(error)) return;
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(message);
        }
      },
    ),
  );
}

export function deactivate(): Thenable<void> {
  return Promise.all(
    Array.from(activeServers.values(), (server) => server.handle.close().catch(() => undefined)),
  ).then(() => undefined);
}

async function openPreview(
  context: vscode.ExtensionContext,
  input?: string | vscode.Uri,
): Promise<void> {
  const configPath = resolveConfigPath(await resolvePreviewTarget(input));
  const server = await acquireServer(configPath);
  const panel = vscode.window.createWebviewPanel(
    "uiClaps.preview",
    `UI Claps: ${basename(configPath)}`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "client")],
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = await createWebviewHtml(context, panel.webview, server.handle.url);
  panel.onDidDispose(
    () => {
      void releaseServer(configPath);
    },
    undefined,
    context.subscriptions,
  );
}

async function resolvePreviewTarget(input?: string | vscode.Uri): Promise<string | undefined> {
  if (typeof input === "string") return input;
  if (input instanceof vscode.Uri) return input.fsPath;

  const configuredPath = readConfiguredPath();
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const defaultPath = configuredPath ?? workspacePath;
  const defaultLabel = defaultPath ? `Use ${defaultPath}` : "Use current directory";

  const selection = await vscode.window.showQuickPick(
    [
      { label: defaultLabel, target: defaultPath },
      { label: "Choose project folder...", target: "folder" },
      { label: "Choose config file...", target: "config" },
    ],
    {
      placeHolder: "Open UI Claps preview",
    },
  );

  if (!selection) {
    throw new PreviewCanceledError();
  }

  if (selection.target === "folder") return chooseProjectFolder();
  if (selection.target === "config") return chooseConfigFile();
  return selection.target;
}

function readConfiguredPath(): string | undefined {
  const configuration = vscode.workspace.getConfiguration("uiClaps");
  const configPath = configuration.get<string>("configPath");
  if (configPath?.trim()) return configPath;

  const projectPath = configuration.get<string>("projectPath");
  return projectPath?.trim() ? projectPath : undefined;
}

async function chooseProjectFolder(): Promise<string> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Open UI Claps Preview",
  });

  const folder = selected?.[0]?.fsPath;
  if (!folder) throw new PreviewCanceledError();
  return folder;
}

async function chooseConfigFile(): Promise<string> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      "UI Claps config": ["ts", "mts", "cts", "js", "mjs", "cjs"],
    },
    openLabel: "Open UI Claps Preview",
  });

  const config = selected?.[0]?.fsPath;
  if (!config) throw new PreviewCanceledError();
  return config;
}

async function acquireServer(configPath: string): Promise<SharedServer> {
  const existing = activeServers.get(configPath);
  if (existing) {
    existing.refs += 1;
    return existing;
  }

  const handle = await startDevServer({
    configPath,
    handleSignals: false,
    open: false,
  });
  const server = { handle, refs: 1 };
  activeServers.set(configPath, server);
  return server;
}

async function releaseServer(configPath: string): Promise<void> {
  const server = activeServers.get(configPath);
  if (!server) return;

  server.refs -= 1;
  if (server.refs > 0) return;

  activeServers.delete(configPath);
  await server.handle.close().catch(() => undefined);
}

async function createWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  serverUrl: string,
): Promise<string> {
  const clientRoot = vscode.Uri.joinPath(context.extensionUri, "dist", "client");
  const indexUri = vscode.Uri.joinPath(clientRoot, "index.html");
  const indexPath = indexUri.fsPath;
  const nonce = createNonce();
  const csp = [
    "default-src 'none'",
    `font-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `connect-src ${serverUrl}`,
  ].join("; ");

  let html = await readFile(indexPath, "utf8");
  html = html.replace(/(src|href)="\/([^"]+)"/g, (_match, attribute: string, assetPath: string) => {
    const assetUri = vscode.Uri.joinPath(clientRoot, ...assetPath.split("/"));
    return `${attribute}="${webview.asWebviewUri(assetUri)}"`;
  });
  html = html.replace(/<script\b/g, `<script nonce="${nonce}"`);
  html = html.replace(
    /<head>/,
    `<head><meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">`,
  );
  html = html.replace(
    /<\/head>/,
    `<script nonce="${nonce}">window.__UI_CLAPS_API_BASE_URL__=${JSON.stringify(
      serverUrl,
    )};window.__UI_CLAPS_EMBEDDED__=true;</script></head>`,
  );

  return html;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return nonce;
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

class PreviewCanceledError extends Error {
  constructor() {
    super("UI Claps preview was canceled.");
  }
}

function isCanceled(error: unknown): boolean {
  return error instanceof PreviewCanceledError;
}
