import { fileURLToPath } from "node:url";

/**
 * Resolved against this module's own URL. A font is not optional: attribution
 * always renders, and the rasteriser loads no system fonts, so a map with no
 * declared font is refused rather than drawn with the text missing.
 */
export const INTER = fileURLToPath(
	new URL("../assets/Inter.ttf", import.meta.url),
);
