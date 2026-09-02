import type { PngBytes } from "../render/store";

/** A year. Safe only because the URL carries a version segment. */
const IMMUTABLE = "public, max-age=31536000, immutable";

export interface ImageResponseArgs {
	readonly bytes: PngBytes;
	readonly etag: string;
	readonly ifNoneMatch: string | null;
}

/**
 * A PNG response with validators attached.
 *
 * The ETag comes from the render key rather than from the bytes, which is what
 * lets a caller answer a conditional request without rendering at all.
 */
export function buildImageResponse(args: ImageResponseArgs): Response {
	const etag = `"${args.etag}"`;

	const headers = new Headers({
		"Cache-Control": IMMUTABLE,
		ETag: etag,
	});

	if (args.ifNoneMatch !== null && matchesEtag(args.ifNoneMatch, etag)) {
		return new Response(null, { status: 304, headers });
	}

	headers.set("Content-Type", "image/png");
	headers.set("Content-Length", String(args.bytes.byteLength));

	return new Response(args.bytes, { status: 200, headers });
}

/** `If-None-Match` is a comma-separated list, and may be `*`. */
function matchesEtag(ifNoneMatch: string, etag: string): boolean {
	if (ifNoneMatch.trim() === "*") {
		return true;
	}

	return ifNoneMatch
		.split(",")
		.map((candidate) => candidate.trim().replace(/^W\//, ""))
		.includes(etag);
}
