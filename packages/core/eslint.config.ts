import {
	base,
	configFiles,
	stylistic,
	vitest,
} from "@abinnovision/eslint-config-base";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
	{
		extends: [base, vitest, stylistic],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{ files: ["*.{c,m,}{t,j}s"], extends: [configFiles] },
	globalIgnores(["dist"]),
]);
