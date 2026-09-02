import { fileURLToPath } from "node:url";

/*
 * `src/assets.ts` resolves the font from the working directory, because that is
 * the only strategy a bundler cannot rewrite. A Next server always runs with the
 * app root as its working directory; vitest invoked from the repository root
 * does not, so reproduce it here rather than weakening the resolution the
 * example exists to demonstrate.
 */
process.chdir(fileURLToPath(new URL("../../", import.meta.url)));
