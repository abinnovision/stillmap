import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		/*
		 * Both files per package. The integration configs name their projects
		 * `#integration`, and without them here `--project '*#integration'`
		 * matches nothing and fails at startup rather than passing empty.
		 */
		projects: [
			"{examples,packages}/*/vitest.config.{mts,ts}",
			"{examples,packages}/*/vitest.integration.config.{mts,ts}",
		],
		coverage: {
			provider: "v8",
			include: ["packages/*/src/**/*.{ts,tsx}"],
			reporter: [["lcovonly", { projectRoot: "./" }], "text"],
		},
	},
});
