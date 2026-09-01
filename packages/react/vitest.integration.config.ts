import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@stillmap/react#integration",
		include: ["test/**/*.integration.spec.tsx"],
		environment: "node",
	},
});
