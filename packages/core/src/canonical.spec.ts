import { describe, expect, it } from "vitest";

import { CANONICAL_KINDS, FILL_KINDS, LINE_KINDS } from "./canonical.js";

describe("canonical vocabulary", () => {
	it("lists every kind exactly once", () => {
		expect(new Set(CANONICAL_KINDS).size).toBe(CANONICAL_KINDS.length);
		expect(CANONICAL_KINDS).toContain("road");
		expect(CANONICAL_KINDS).toContain("place");
	});

	it("classifies every kind as fillable, strokable, or a label kind", () => {
		for (const kind of CANONICAL_KINDS) {
			const known =
				(FILL_KINDS as readonly string[]).includes(kind) ||
				(LINE_KINDS as readonly string[]).includes(kind) ||
				kind === "place";

			expect(known, `${kind} is unclassified`).toBe(true);
		}
	});
});
