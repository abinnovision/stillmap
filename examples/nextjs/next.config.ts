import { join } from "node:path";

import type { NextConfig } from "next";

const config: NextConfig = {
	// Next writes AGENTS.md and CLAUDE.md into the app directory otherwise.
	agentRules: false,

	/*
	 * resvg is a native .node addon that picks a per-platform package through a
	 * runtime require. Bundling it does not survive that, and the failure is
	 * disguised: core catches the import error and reports PNG_BACKEND_MISSING,
	 * which reads as "install @resvg/resvg-js" even though it is installed.
	 *
	 * The stillmap packages need nothing here; they bundle as they are.
	 */
	serverExternalPackages: ["@resvg/resvg-js"],

	/*
	 * The workspace root, because yarn's node-modules linker hoists @resvg/* out
	 * of this directory. Tracing from the app directory alone would miss it.
	 */
	outputFileTracingRoot: join(import.meta.dirname, "../.."),

	// Fonts are read from disk by path, so the files have to reach the server.
	outputFileTracingIncludes: {
		"/api/**": ["./src/assets/**"],
	},
};

export default config;
