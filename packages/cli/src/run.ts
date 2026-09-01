import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { startDev } from "./dev/start.js";
import { VERSION } from "./index.js";

import type { DevOptions } from "./dev/start.js";

export interface RunIo {
	readonly out: (text: string) => void;
	readonly err: (text: string) => void;
	/** Injectable so dispatch can be tested without binding a port. */
	readonly startDev?: (options: DevOptions) => Promise<void>;
}

const DEFAULT_DIRECTORY = "maps";
const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;

const USAGE = `stillmap dev [dir]

Watches a directory of map templates and previews them in the browser.

Arguments:
  dir               Directory holding the templates. Defaults to ./${DEFAULT_DIRECTORY}

Options:
  --port <number>   Port to listen on. Defaults to ${String(DEFAULT_PORT)}
  --open            Open the preview in the default browser
  -h, --help        Show this message
  -v, --version     Show the version
`;

interface Parsed {
	readonly command: string | undefined;
	readonly directory: string;
	readonly port: number;
	readonly open: boolean;
	readonly help: boolean;
	readonly version: boolean;
}

function parsePort(raw: string | undefined): number {
	if (raw === undefined) {
		return DEFAULT_PORT;
	}

	const port = Number.parseInt(raw, 10);

	if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
		throw new TypeError(`--port must be between 0 and ${String(MAX_PORT)}.`);
	}

	return port;
}

function parse(argv: readonly string[]): Parsed {
	const { values, positionals } = parseArgs({
		args: [...argv],
		allowPositionals: true,
		options: {
			port: { type: "string" },
			open: { type: "boolean", default: false },
			help: { type: "boolean", short: "h", default: false },
			version: { type: "boolean", short: "v", default: false },
		},
	});

	return {
		command: positionals[0],
		directory: positionals[1] ?? DEFAULT_DIRECTORY,
		port: parsePort(values.port),
		open: values.open,
		help: values.help,
		version: values.version,
	};
}

/**
 * Parses arguments and dispatches. Returns the exit code rather than calling
 * `process.exit`, so the whole surface is testable.
 */
export async function run(argv: readonly string[], io: RunIo): Promise<number> {
	let parsed: Parsed;

	try {
		parsed = parse(argv);
	} catch (error) {
		io.err(`${error instanceof Error ? error.message : "Bad arguments."}\n\n`);
		io.err(USAGE);

		return 1;
	}

	if (parsed.version) {
		io.out(`${VERSION}\n`);

		return 0;
	}

	if (parsed.help || parsed.command === undefined) {
		io.out(USAGE);

		return parsed.help ? 0 : 1;
	}

	if (parsed.command !== "dev") {
		io.err(`Unknown command: ${parsed.command}\n\n`);
		io.err(USAGE);

		return 1;
	}

	const start = io.startDev ?? startDev;

	try {
		await start({
			root: resolve(process.cwd(), parsed.directory),
			port: parsed.port,
			open: parsed.open,
			out: io.out,
		});

		return 0;
	} catch (error) {
		io.err(`${error instanceof Error ? error.message : "Failed to start."}\n`);

		if (error instanceof Error && "hint" in error) {
			io.err(`${String(error.hint)}\n`);
		}

		return 1;
	}
}
