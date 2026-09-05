import type { Bytes } from "./store/index.js";

/** A year. Safe only because the URL carries a version parameter. */
export const IMMUTABLE = "public, max-age=31536000, immutable";

export interface ImageResponseArgs {
	readonly bytes: Bytes;
	readonly etag: string;
	readonly contentType: string;
	readonly cacheControl: string;
}

/** An image response with validators attached. */
export function buildImageResponse(args: ImageResponseArgs): Response {
	return new Response(args.bytes, {
		status: 200,
		headers: {
			"Cache-Control": args.cacheControl,
			"Content-Length": String(args.bytes.byteLength),
			"Content-Type": args.contentType,
			ETag: quote(args.etag),
		},
	});
}

export function notModified(etag: string, cacheControl: string): Response {
	return new Response(null, {
		status: 304,
		headers: { "Cache-Control": cacheControl, ETag: quote(etag) },
	});
}

/**
 * Whether a conditional request already holds this render.
 *
 * Because the ETag is derived from the request rather than from the bytes, this
 * can be answered before anything is rendered, read, or fetched.
 *
 * `If-None-Match` is a comma-separated list, and may be `*`.
 */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
	if (ifNoneMatch === null) {
		return false;
	}

	if (ifNoneMatch.trim() === "*") {
		return true;
	}

	return ifNoneMatch
		.split(",")
		.map((candidate) => candidate.trim().replace(/^W\//, ""))
		.includes(quote(etag));
}

function quote(etag: string): string {
	return `"${etag}"`;
}
