import { fileURLToPath } from "node:url";

/**
 * Resolved against this module's own URL, which is the supported strategy for
 * plain Node. Under a bundler that rewrites assets, resolve from
 * `process.cwd()` instead; see `docs/fonts.md`.
 */
export const INTER = fileURLToPath(
	new URL("../assets/Inter.ttf", import.meta.url),
);
