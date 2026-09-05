import type { OutputStore } from "./index.js";

/** Renders every time. Useful for measuring what the cache is worth. */
export function nullStore(): OutputStore {
	return {
		get: () => Promise.resolve(null),
		set: () => Promise.resolve(),
	};
}
