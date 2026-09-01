import { describe, expect, it, vi } from "vitest";

import { StillmapError } from "./errors.js";
import { createWarningCollector } from "./warnings.js";

describe("createWarningCollector", () => {
	it("accumulates warnings in order", () => {
		const collector = createWarningCollector({});

		collector.warn("ZOOM_CLAMPED", "clamped to 17");
		collector.warn("LABEL_DROPPED", "no room for Hamburg");

		expect(collector.warnings.map((w) => w.code)).toEqual([
			"ZOOM_CLAMPED",
			"LABEL_DROPPED",
		]);
	});

	it("forwards each warning to onWarning", () => {
		const onWarning = vi.fn();
		const collector = createWarningCollector({ onWarning });

		collector.warn("MARKER_OFFSCREEN", "marker 2 is off canvas", { index: 2 });

		expect(onWarning).toHaveBeenCalledWith({
			code: "MARKER_OFFSCREEN",
			message: "marker 2 is off canvas",
			detail: { index: 2 },
		});
	});

	it("omits the detail key entirely when none is given", () => {
		const collector = createWarningCollector({});

		collector.warn("ZOOM_CLAMPED", "clamped");

		expect(collector.warnings[0]).not.toHaveProperty("detail");
	});

	it("throws instead of collecting in strict mode", () => {
		const collector = createWarningCollector({ strict: true });

		expect(() => {
			collector.warn("TILE_FETCH_FAILED", "z13/4402/2685");
		}).toThrow(StillmapError);
	});
});
