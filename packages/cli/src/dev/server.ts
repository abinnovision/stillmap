import { createServer } from "node:http";

import { SHELL } from "./ui.js";

import type { Template } from "./discover.js";
import type { Format, RenderResponse } from "./render.js";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

export interface DevServerOptions {
	/** `0` asks the operating system for a free port. */
	readonly port: number;
	readonly list: () => Promise<readonly Template[]>;
	readonly render: (file: string, format: Format) => Promise<RenderResponse>;
}

export interface DevServer {
	readonly port: number;
	readonly url: string;
	/** Tells every connected browser to re-fetch. */
	reload: () => void;
	close: () => Promise<void>;
}

const RENDER_PREFIX = "/api/render/";
const PORT_ATTEMPTS = 10;

function json(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	response.end(JSON.stringify(body));
}

function notFound(response: ServerResponse, message: string): void {
	json(response, 404, { kind: "error", code: "NOT_FOUND", message });
}

function openStream(
	request: IncomingMessage,
	response: ServerResponse,
	clients: Set<ServerResponse>,
): void {
	response.writeHead(200, {
		"content-type": "text/event-stream",
		"cache-control": "no-store",
		connection: "keep-alive",
	});
	response.write(": connected\n\n");
	clients.add(response);

	request.on("close", () => {
		clients.delete(response);
	});
}

interface Context {
	readonly options: DevServerOptions;
	readonly clients: Set<ServerResponse>;
}

async function handle(
	request: IncomingMessage,
	response: ServerResponse,
	context: Context,
): Promise<void> {
	const { options, clients } = context;

	const url = new URL(request.url ?? "/", "http://localhost");
	const path = url.pathname;

	if (path === "/") {
		response.writeHead(200, {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
		});
		response.end(SHELL);

		return;
	}

	if (path === "/events") {
		openStream(request, response, clients);

		return;
	}

	if (path === "/api/templates") {
		json(response, 200, { templates: await options.list() });

		return;
	}

	if (path.startsWith(RENDER_PREFIX)) {
		const id = decodeURIComponent(path.slice(RENDER_PREFIX.length));
		const template = (await options.list()).find((one) => one.id === id);

		if (template === undefined) {
			notFound(response, `No template with id ${id}.`);

			return;
		}

		const format: Format =
			url.searchParams.get("format") === "svg" ? "svg" : "png";

		json(response, 200, await options.render(template.file, format));

		return;
	}

	notFound(response, `No route for ${path}.`);
}

function isAddressInUse(error: unknown): boolean {
	return (
		error instanceof Error && "code" in error && error.code === "EADDRINUSE"
	);
}

/**
 * Binds the server, stepping to the next port when one is taken. A dev server
 * that refuses to start because something else owns 3000 is an annoyance, not a
 * safety feature.
 */
async function listen(
	server: Server,
	port: number,
	attemptsLeft: number,
): Promise<void> {
	try {
		await new Promise<void>((resolve, reject) => {
			const onError = (error: Error): void => {
				server.removeListener("listening", onListening);
				reject(error);
			};

			const onListening = (): void => {
				server.removeListener("error", onError);
				resolve();
			};

			server.once("error", onError);
			server.once("listening", onListening);
			server.listen(port);
		});
	} catch (error) {
		if (attemptsLeft <= 0 || !isAddressInUse(error)) {
			throw error;
		}

		await listen(server, port + 1, attemptsLeft - 1);
	}
}

export async function startDevServer(
	options: DevServerOptions,
): Promise<DevServer> {
	const clients = new Set<ServerResponse>();

	const server = createServer((request, response) => {
		handle(request, response, { options, clients }).catch((error: unknown) => {
			json(response, 500, {
				kind: "error",
				code: "SERVER_ERROR",
				message: error instanceof Error ? error.message : "Unknown failure.",
			});
		});
	});

	await listen(server, options.port, PORT_ATTEMPTS);

	const address = server.address();
	const port =
		typeof address === "object" && address !== null ? address.port : 0;

	return {
		port,
		url: `http://localhost:${String(port)}`,
		reload: () => {
			for (const client of clients) {
				client.write("event: reload\ndata: {}\n\n");
			}
		},
		close: async () => {
			for (const client of clients) {
				client.end();
			}

			clients.clear();
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		},
	};
}
