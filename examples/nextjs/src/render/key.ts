import { createHash } from "node:crypto";

import type { Store } from "../stores";

/**
 * Bump when `src/map/style.tsx` changes. Map URLs are served `immutable`, so
 * nothing else will ever invalidate a cached render: forget this and every
 * visitor keeps the old map indefinitely.
 *
 * A stricter alternative is to hash a canonical render at startup, which
 * removes the discipline at the cost of a render on boot.
 */
export const STYLE_VERSION = 1;

export interface RenderKeyInput {
	readonly storeId: string;
	readonly updatedAt: string;
	readonly width: number;
	readonly height: number;
	readonly scale: number;
}

/**
 * A stable identity for one rendered map. Written out field by field rather
 * than via `JSON.stringify`, so it does not silently depend on property order.
 *
 * The result is hex, which makes it safe both as a filename for the output
 * store and as an ETag.
 */
export function renderKey(input: RenderKeyInput): string {
	const parts = [
		`style=${String(STYLE_VERSION)}`,
		`store=${input.storeId}`,
		`updated=${input.updatedAt}`,
		`w=${String(input.width)}`,
		`h=${String(input.height)}`,
		`scale=${String(input.scale)}`,
	];

	return createHash("sha256")
		.update(parts.join("\n"))
		.digest("hex")
		.slice(0, 32);
}

/**
 * The version segment of a map URL. Changing the style or moving the store
 * changes the URL, which is what makes an immutable response safe.
 */
export function mapVersion(store: Store): string {
	return `v${String(STYLE_VERSION)}-${store.updatedAt}`;
}
