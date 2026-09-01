import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap/core#integration",
		include: ["test/**/*.integration.spec.ts"],
		environment: "node",
	},
});
