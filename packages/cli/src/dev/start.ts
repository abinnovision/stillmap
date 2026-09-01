import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

import { cacheDirectory } from "./bundle.js";
import { discover } from "./discover.js";
import { renderTemplate } from "./render.js";
import { startDevServer } from "./server.js";
import { watchTemplates } from "./watch.js";

export interface DevOptions {
	/** Absolute path to the templates directory. */
	readonly root: string;
	readonly port: number;
	readonly open: boolean;
	readonly out: (text: string) => void;
}

function openBrowser(url: string): void {
	const command =
		process.platform === "darwin"
			? "open"
			: process.platform === "win32"
				? "start"
				: "xdg-open";

	spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

/**
 * Starts the preview server and blocks until the process is interrupted.
 *
 * Discovery runs once up front so a missing directory fails immediately rather
 * than as an empty sidebar.
 */
export async function startDev(options: DevOptions): Promise<void> {
	const templates = await discover(options.root);
	const cache = cacheDirectory(options.root);

	await rm(cache, { recursive: true, force: true });

	const server = await startDevServer({
		port: options.port,
		list: async () => await discover(options.root),
		render: async (file, format) => await renderTemplate(file, cache, format),
	});

	const watcher = watchTemplates(options.root, server.reload);

	options.out(
		`stillmap dev on ${server.url}\n` +
			`watching ${options.root} (${String(templates.length)} template${
				templates.length === 1 ? "" : "s"
			})\n`,
	);

	if (options.open) {
		openBrowser(server.url);
	}

	await new Promise<void>((resolve) => {
		const stop = (): void => {
			watcher.close();
			void server.close().then(resolve, resolve);
		};

		process.once("SIGINT", stop);
		process.once("SIGTERM", stop);
	});
}
