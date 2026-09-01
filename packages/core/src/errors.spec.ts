import { describe, expect, it } from "vitest";

import { StillmapError } from "./errors.js";

describe("stillmapError", () => {
	it("carries a stable code and is instanceof Error", () => {
		const error = new StillmapError(
			"FONT_NOT_FOUND",
			"missing Inter-Medium.ttf",
		);

		expect(error).toBeInstanceOf(Error);
		expect(error.code).toBe("FONT_NOT_FOUND");
		expect(error.message).toBe("missing Inter-Medium.ttf");
		expect(error.name).toBe("StillmapError");
	});

	it("keeps structured detail alongside the message", () => {
		const error = new StillmapError("TILE_BUDGET_EXCEEDED", "too many tiles", {
			requested: 96,
			budget: 24,
		});

		expect(error.detail).toEqual({ requested: 96, budget: 24 });
	});
});
