import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "stillmap#unit",
		include: ["src/**/*.spec.ts"],
		environment: "node",
	},
});
