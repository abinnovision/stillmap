import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { Overlay } from "./overlay.js";
import { walk } from "./walk.js";

describe("overlay", () => {
	it("projects placement, size, and inset into a declaration", () => {
		const [overlay] = walk(
			<Overlay placement="top-right" size={[160, 64]} inset={[12, 8]}>
				<rect width="160" height="64" fill="#FFFFFF" />
			</Overlay>,
			createWarningCollector({}),
		).overlays;

		expect(overlay).toMatchObject({
			kind: "overlay",
			placement: "top-right",
			size: [160, 64],
			inset: [12, 8],
		});
		expect(overlay?.markup).toContain("<rect");
	});

	it("omits inset and reserve unless given", () => {
		const [overlay] = walk(
			<Overlay placement="bottom-left" size={[10, 10]}>
				<circle />
			</Overlay>,
			createWarningCollector({}),
		).overlays;

		expect(overlay).not.toHaveProperty("inset");
		expect(overlay).not.toHaveProperty("reserve");
	});

	it("passes the reserve opt-out through", () => {
		const [overlay] = walk(
			<Overlay placement="bottom-left" size={[10, 10]} reserve={false}>
				<circle />
			</Overlay>,
			createWarningCollector({}),
		).overlays;

		expect(overlay?.reserve).toBe(false);
	});

	it("drops an HTML child and warns", () => {
		const warn = createWarningCollector({});

		walk(
			<Overlay placement="top-left" size={[10, 10]}>
				<div>not svg</div>
			</Overlay>,
			warn,
		);

		expect(warn.warnings.map((w) => w.code)).toContain(
			"MARKER_UNSUPPORTED_ELEMENT",
		);
	});
});
