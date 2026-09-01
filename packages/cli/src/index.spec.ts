import { describe, expect, it } from "vitest";

import { VERSION } from "./index.js";

describe("stillmap", () => {
	it("exposes a semver version string", () => {
		expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});
});
