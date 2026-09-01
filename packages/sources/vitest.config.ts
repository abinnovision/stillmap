import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap/sources#unit",
		include: ["src/**/*.spec.ts"],
		environment: "node",
	},
});
