import { defineProject } from "vitest/config";

export default defineProject({
	/*
	 * tsconfig.json sets `jsx: "preserve"` because Next requires it, and Vite
	 * takes its JSX setting from there. Without this override the .tsx specs
	 * reach the SSR transform with their JSX intact and fail to parse.
	 */
	oxc: { jsx: { runtime: "automatic", importSource: "react" } },
	test: {
		name: "@stillmap-examples/nextjs#unit",
		include: ["src/**/*.spec.{ts,tsx}"],
		environment: "node",
		setupFiles: ["./test/support/cwd.ts"],
	},
});
