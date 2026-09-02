import { describe, expect, it } from "vitest";

import { buildImageResponse } from "./image-response";

const BYTES = Uint8Array.of(137, 80, 78, 71);
const ETAG = "0123456789abcdef";

describe("buildImageResponse", () => {
	it("serves the image with its validators", async () => {
		const response = buildImageResponse({
			bytes: BYTES,
			etag: ETAG,
			ifNoneMatch: null,
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(response.headers.get("Content-Length")).toBe("4");
		expect(response.headers.get("ETag")).toBe(`"${ETAG}"`);
		expect(response.headers.get("Cache-Control")).toContain("immutable");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(BYTES);
	});

	it("answers a matching conditional request with 304 and no body", async () => {
		const response = buildImageResponse({
			bytes: BYTES,
			etag: ETAG,
			ifNoneMatch: `"${ETAG}"`,
		});

		expect(response.status).toBe(304);
		expect(await response.arrayBuffer()).toHaveProperty("byteLength", 0);
		expect(response.headers.get("ETag")).toBe(`"${ETAG}"`);
		expect(response.headers.get("Cache-Control")).toContain("immutable");
	});

	it("handles a list and a weak validator", () => {
		expect(
			buildImageResponse({
				bytes: BYTES,
				etag: ETAG,
				ifNoneMatch: `"other", W/"${ETAG}"`,
			}).status,
		).toBe(304);
	});

	it("serves the image when the validator does not match", () => {
		expect(
			buildImageResponse({
				bytes: BYTES,
				etag: ETAG,
				ifNoneMatch: '"stale"',
			}).status,
		).toBe(200);
	});
});
