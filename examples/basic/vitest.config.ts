import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap-examples/basic#unit",
		include: ["src/**/*.spec.{ts,tsx}"],
		environment: "node",
	},
});
