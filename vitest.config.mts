import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["{examples,packages}/*/vitest.config.{mts,ts}"],
		coverage: {
			provider: "v8",
			include: ["packages/*/src/**/*.{ts,tsx}"],
			reporter: [["lcovonly", { projectRoot: "./" }], "text"],
		},
	},
});
