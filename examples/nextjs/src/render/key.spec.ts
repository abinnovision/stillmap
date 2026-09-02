import { describe, expect, it } from "vitest";

import { mapVersion, renderKey, STYLE_VERSION } from "./key";

import type { RenderKeyInput } from "./key";

const BASE: RenderKeyInput = {
	storeId: "hamburg-mitte",
	updatedAt: "2026-01-14",
	width: 600,
	height: 300,
	scale: 2,
};

describe("renderKey", () => {
	it("does not depend on property order", () => {
		const reordered: RenderKeyInput = {
			scale: 2,
			height: 300,
			width: 600,
			updatedAt: "2026-01-14",
			storeId: "hamburg-mitte",
		};

		expect(renderKey(reordered)).toBe(renderKey(BASE));
	});

	it.each([
		["storeId", { storeId: "hamburg-hafencity" }],
		["updatedAt", { updatedAt: "2026-01-15" }],
		["width", { width: 601 }],
		["height", { height: 301 }],
		["scale", { scale: 3 }],
	])("changes with %s", (_name, patch) => {
		expect(renderKey({ ...BASE, ...patch })).not.toBe(renderKey(BASE));
	});

	it("is safe as both a filename and an ETag", () => {
		expect(renderKey(BASE)).toMatch(/^[0-9a-f]{32}$/);
	});
});

describe("mapVersion", () => {
	it("carries the style version and the store's own timestamp", () => {
		const version = mapVersion({
			id: "hamburg-mitte",
			name: "Hamburg Mitte",
			address: "Rathausmarkt 1",
			position: [9.9937, 53.5511],
			updatedAt: "2026-01-14",
		});

		expect(version).toBe(`v${String(STYLE_VERSION)}-2026-01-14`);
	});
});
