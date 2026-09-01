import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cacheDirectory } from "../src/dev/bundle.js";
import { discover } from "../src/dev/discover.js";
import { renderTemplate } from "../src/dev/render.js";
import { startDevServer } from "../src/dev/server.js";

import type { RenderOk, RenderResponse } from "../src/dev/render.js";
import type { DevServer } from "../src/dev/server.js";

const ROOT = fileURLToPath(new URL("./fixtures/maps", import.meta.url));
const CACHE = cacheDirectory(ROOT);

let server: DevServer;

async function get(path: string): Promise<Response> {
	return await fetch(`${server.url}${path}`);
}

/** Narrows outside the test body, which may not branch. */
function expectRendered(body: RenderResponse): RenderOk {
	if (body.kind !== "ok") {
		throw new Error(`Expected a render, got ${body.code}: ${body.message}`);
	}

	return body;
}

beforeAll(async () => {
	server = await startDevServer({
		port: 0,
		list: async () => await discover(ROOT),
		render: async (file, format) => await renderTemplate(file, CACHE, format),
	});
});

afterAll(async () => {
	await server.close();
});

describe("dev server", () => {
	it("serves the preview shell", async () => {
		const response = await get("/");

		expect(response.status).toBe(200);
		expect(await response.text()).toContain("<title>stillmap</title>");
	});

	it("lists the discovered templates", async () => {
		const body = (await (await get("/api/templates")).json()) as {
			templates: { id: string }[];
		};

		expect(body.templates.map((one) => one.id)).toContain("locator");
	});

	it("renders a template to SVG with its resolved viewport", async () => {
		const body = expectRendered(
			(await (
				await get("/api/render/locator?format=svg")
			).json()) as RenderResponse,
		);

		expect(body.output).toMatchObject({ kind: "svg" });
		expect(JSON.stringify(body.output)).toContain("<svg");
		expect(body.width).toBe(400);
		expect(body.height).toBe(200);
		expect(body.viewport.zoom).toBe(13);
		expect(body.viewport.center).toEqual([9.9937, 53.5511]);
		expect(body.warnings.every((one) => !one.code.startsWith("SCHEMA_"))).toBe(
			true,
		);
	});

	it("addresses a nested template by its encoded id", async () => {
		const response = await get(
			`/api/render/${encodeURIComponent("nested/inset")}?format=svg`,
		);

		expect(((await response.json()) as RenderResponse).kind).toBe("ok");
	});

	it("rasterises to PNG by default, or notes why it could not", async () => {
		const body = expectRendered(
			(await (await get("/api/render/locator")).json()) as RenderResponse,
		);

		expect(body.output.kind === "png" || body.note !== undefined).toBe(true);
	});

	it("keeps serving after a template throws", async () => {
		const failed = (await (
			await get("/api/render/broken")
		).json()) as RenderResponse;

		expect(failed).toMatchObject({ kind: "error", code: "RENDER_FAILED" });
		expect((await get("/api/templates")).status).toBe(200);
	});

	it("404s an unknown template", async () => {
		expect((await get("/api/render/nope")).status).toBe(404);
	});

	it("pushes a reload event to connected clients", async () => {
		const controller = new AbortController();
		const response = await fetch(`${server.url}/events`, {
			signal: controller.signal,
		});
		const body = response.body;

		expect(body).not.toBeNull();

		const reader = (body as ReadableStream<Uint8Array>).getReader();

		await reader.read();
		server.reload();

		const next = await reader.read();

		expect(new TextDecoder().decode(next.value)).toContain("event: reload");
		controller.abort();
	});
});
