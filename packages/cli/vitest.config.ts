import { defineProject } from "vitest/config";

export default defineProject({
	/*
	 * Vitest launches its workers with `--conditions development`, which would
	 * make Node resolve workspace packages to their TypeScript sources when the
	 * previewer imports a bundled template. A published install has no such
	 * condition, so narrowing this keeps the tests on the same path as users.
	 */
	resolve: { conditions: ["node"] },
	test: {
		name: "stillmap#unit",
		include: ["src/**/*.spec.ts"],
		environment: "node",
	},
});
