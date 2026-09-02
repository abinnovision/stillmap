import { join } from "node:path";

/**
 * Resolved from the working directory rather than from `import.meta.url`.
 * Turbopack rewrites a computed `new URL(..., import.meta.url)` to its own
 * emitted copy and collapses every such reference to whichever asset it emitted
 * first, which shows up as a map with no labels. See `docs/fonts.md`.
 */
export const INTER = join(process.cwd(), "src/assets/Inter.ttf");
