import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { discover } from "./discover.js";
import { PreviewError } from "./errors.js";

const ROOT = fileURLToPath(
	new URL("../../test/fixtures/maps", import.meta.url),
);

describe("discover", () => {
	it("finds templates at every depth, sorted by id", async () => {
		const found = await discover(ROOT);

		expect(found.map((one) => one.id)).toEqual([
			"broken",
			"locator",
			"nested/inset",
			"no-default",
		]);
	});

	it("skips spec files", async () => {
		const found = await discover(ROOT);

		expect(found.map((one) => one.id)).not.toContain("notes.spec");
	});

	it("reports a missing directory as a PreviewError", async () => {
		const failure = await discover(`${ROOT}-absent`).catch(
			(error: unknown) => error,
		);

		expect(failure).toBeInstanceOf(PreviewError);
		expect((failure as PreviewError).code).toBe("TEMPLATES_DIRECTORY_MISSING");
	});
});
