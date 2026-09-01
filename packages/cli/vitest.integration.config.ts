import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "stillmap#integration",
		include: ["test/**/*.integration.spec.ts"],
		environment: "node",
	},
});
