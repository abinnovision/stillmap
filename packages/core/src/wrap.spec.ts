import { describe, expect, it } from "vitest";

import { estimateMeasurer } from "./metrics.js";
import { wrapText } from "./wrap.js";

import type { TextStyle } from "./metrics.js";

const STYLE: TextStyle = {
	fontFamily: "Inter",
	fontWeight: 500,
	fontSize: 10,
	letterSpacing: 0,
};

/** 5.5px per character under the estimate at 10px. */
function wrap(text: string, maxWidth: number): readonly string[] {
	return wrapText(text, { style: STYLE, measure: estimateMeasurer, maxWidth });
}

describe("wrapText", () => {
	it("keeps a short label on one line", () => {
		expect(wrap("Hamburg", 200)).toEqual(["Hamburg"]);
	});

	it("keeps an unbreakable word whole even when too wide", () => {
		expect(wrap("Sint-Jans-Molenbeek".replace(/-/gu, ""), 40)).toEqual([
			"SintJansMolenbeek",
		]);
	});

	it("aims lines at even length rather than filling the first", () => {
		/*
		 * 24 chars = 132px against 110px: two lines of about 66px each,
		 * not a 110px line followed by a 22px remnant.
		 */
		const lines = wrap("Woluwe Saint Lambert etc", 110);

		expect(lines).toEqual(["Woluwe Saint", "Lambert etc"]);
	});

	it("breaks after a slash and keeps it on the first line", () => {
		const lines = wrap("Ixelles/Elsene", 45);

		expect(lines).toEqual(["Ixelles/", "Elsene"]);
	});

	it("drops the space at a break", () => {
		for (const line of wrap("Molenbeek Saint Jean", 60)) {
			expect(line).toBe(line.trim());
		}
	});

	it("splits a long bilingual name onto balanced lines", () => {
		const name = "Molenbeek-Saint-Jean - Sint-Jans-Molenbeek";
		const lines = wrap(name, 130);

		expect(lines.length).toBe(2);
		expect(lines.join(" ").replace(/ +/gu, " ")).not.toContain("  ");
	});
});
