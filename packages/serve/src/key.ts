import { createHash } from "node:crypto";

import { canonicalQuery } from "./query.js";

import type { Format } from "./template.js";

export interface RenderKeyInput {
	/** Bumped globally to invalidate every cached render at once. */
	readonly epoch: string;
	readonly query: URLSearchParams;
	readonly format: Format;
	readonly scale: number;
}

/**
 * A stable identity for one rendered map.
 *
 * The query carries the template name and every parameter that template reads,
 * and the epoch carries everything a template decides in code. `format` and
 * `scale` are named separately because they decide the bytes without appearing
 * in either: leaving them out let a template switch from PNG to SVG and still
 * answer the old ETag with a 304.
 *
 * Derived from the request, never from the rendered bytes: that is what lets a
 * conditional request be answered before anything is rendered at all.
 *
 * The result is hex, which makes it safe both as a filename for the output
 * store and as an ETag.
 */
export function renderKey(input: RenderKeyInput): string {
	const parts = [
		`epoch=${input.epoch}`,
		`format=${input.format}`,
		`scale=${String(input.scale)}`,
		`query=${canonicalQuery(input.query)}`,
	];

	return createHash("sha256")
		.update(parts.join("\n"))
		.digest("hex")
		.slice(0, 32);
}
