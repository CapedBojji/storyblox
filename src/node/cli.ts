#!/usr/bin/env node
import { existsSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startDevServer } from "./server.js";

interface ParsedArgs {
  command?: string;
  config?: string;
  help: boolean;
  target?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;

    if (arg === "-h" || arg === "--help") {
      parsed.help = true;
      continue;
    }

    if (arg === "--config" || arg === "-c") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a path.`);
      }
      parsed.config = value;
      index += 1;
      continue;
    }

    if (!parsed.command) {
      parsed.command = arg;
      continue;
    }

    if (!parsed.target) {
      parsed.target = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp(): void {
  console.log(`UI Claps

Usage:
  ui-claps dev
  ui-claps dev ./path/to/project
  ui-claps dev --config ./path/to/ui-claps.config.ts

Commands:
  dev       Start the story preview server.

Options:
  -c, --config <path>   Path to a UI Claps config file.
  -h, --help            Show this help.

When a project folder is provided, UI Claps looks for ui-claps.config.ts in that folder.
`);
}

export function resolveConfigPath(target?: string, config?: string): string {
  if (config) {
    return resolve(config);
  }

  if (!target) {
    return resolve("ui-claps.config.ts");
  }

  const absoluteTarget = resolve(target);
  if (existsSync(absoluteTarget) && statSync(absoluteTarget).isDirectory()) {
    return join(absoluteTarget, "ui-claps.config.ts");
  }

  return absoluteTarget;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.command) {
    printHelp();
    return;
  }

  if (args.command !== "dev") {
    throw new Error(`Unknown command: ${args.command}`);
  }

  await startDevServer({ configPath: resolveConfigPath(args.target, args.config) });
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
