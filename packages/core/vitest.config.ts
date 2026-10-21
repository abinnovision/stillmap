import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap/core#unit",
		include: ["src/**/*.spec.ts"],
		environment: "node",
		benchmark: {
			include: ["bench/**/*.bench.ts"],
			suppressExportGetterWarnings: true,
		},
	},
});
