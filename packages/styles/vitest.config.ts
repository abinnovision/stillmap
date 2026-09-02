import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap/styles#unit",
		include: ["src/**/*.spec.{ts,tsx}"],
		environment: "node",
	},
});
