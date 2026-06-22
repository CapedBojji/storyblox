#!/usr/bin/env node
import { startDevServer } from "./server.js";

interface ParsedArgs {
  command?: string;
  config?: string;
  help: boolean;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp(): void {
  console.log(`UI Claps

Usage:
  ui-claps dev --config ui-claps.config.ts

Commands:
  dev       Start the story preview server.

Options:
  -c, --config <path>   Path to the required UI Claps config file.
  -h, --help            Show this help.
`);
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

  await startDevServer({ configPath: args.config ?? "ui-claps.config.ts" });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
