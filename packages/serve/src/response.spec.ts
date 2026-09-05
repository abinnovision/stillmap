import { describe, expect, it } from "vitest";

import {
	buildImageResponse,
	etagMatches,
	IMMUTABLE,
	notModified,
} from "./response.js";

const BYTES = new Uint8Array([1, 2, 3]);

describe("buildImageResponse", () => {
	it("attaches the validators", () => {
		const response = buildImageResponse({
			bytes: BYTES,
			etag: "abc",
			contentType: "image/png",
			cacheControl: IMMUTABLE,
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("ETag")).toBe('"abc"');
		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(response.headers.get("Content-Length")).toBe("3");
		expect(response.headers.get("Cache-Control")).toBe(IMMUTABLE);
	});
});

describe("notModified", () => {
	it("has no body and keeps the validators", async () => {
		const response = notModified("abc", IMMUTABLE);

		expect(response.status).toBe(304);
		expect(response.headers.get("ETag")).toBe('"abc"');
		expect(await response.text()).toBe("");
	});
});

describe("etagMatches", () => {
	it.each([
		[null, false],
		['"abc"', true],
		['"other"', false],
		['W/"abc"', true],
		['"other", "abc"', true],
	] as const)("%s", (header, expected) => {
		expect(etagMatches(header, "abc")).toBe(expected);
	});

	it("treats a wildcard as a match", () => {
		expect(etagMatches("*", "abc")).toBe(true);
	});
});
