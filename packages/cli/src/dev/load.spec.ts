import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { cacheDirectory } from "./bundle.js";
import { PreviewError } from "./errors.js";
import { loadTemplate } from "./load.js";

const MAPS = new URL("../../test/fixtures/maps/", import.meta.url);
const CACHE = cacheDirectory(fileURLToPath(new URL("../..", import.meta.url)));

function template(name: string): string {
	return fileURLToPath(new URL(name, MAPS));
}

/**
 * A scratch package whose `type` decides whether tsx loads the template as an
 * ES module or through CommonJS interop. Both paths reach real user projects.
 */
async function scratch(type: "commonjs" | "module"): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "stillmap-"));

	await writeFile(join(directory, "package.json"), JSON.stringify({ type }));

	return directory;
}

function tagged(tag: string): string {
	return `const T = () => null;\nT.PreviewProps = { tag: "${tag}" };\nexport default T;\n`;
}

describe("loadTemplate", () => {
	it("builds an element from a component and its PreviewProps", async () => {
		const element = await loadTemplate(template("locator.tsx"), CACHE);

		expect(element.props).toMatchObject({ position: [9.9937, 53.5511] });
	});

	it("builds an element from a component without PreviewProps", async () => {
		const element = await loadTemplate(template("nested/inset.tsx"), CACHE);

		expect(element.props).toEqual({});
	});

	it("rejects a template with no default export", async () => {
		const failure = await loadTemplate(template("no-default.tsx"), CACHE).catch(
			(error: unknown) => error,
		);

		expect(failure).toBeInstanceOf(PreviewError);
		expect((failure as PreviewError).code).toBe("TEMPLATE_NO_DEFAULT_EXPORT");
	});

	it("lets a throwing template body escape", async () => {
		const failure = await loadTemplate(template("broken.tsx"), CACHE).catch(
			(error: unknown) => error,
		);

		expect(failure).toBeInstanceOf(Error);
		expect((failure as Error).message).toContain("broken on purpose");
	});

	it("reads the default export of a CommonJS template", async () => {
		const file = join(await scratch("commonjs"), "template.tsx");

		await writeFile(file, tagged("cjs"));

		expect((await loadTemplate(file, CACHE)).props).toEqual({ tag: "cjs" });
	});

	it("picks up an edit to the template", async () => {
		const file = join(await scratch("module"), "template.tsx");

		await writeFile(file, tagged("one"));
		expect((await loadTemplate(file, CACHE)).props).toEqual({ tag: "one" });

		await writeFile(file, tagged("two"));
		expect((await loadTemplate(file, CACHE)).props).toEqual({ tag: "two" });
	});

	it("picks up an edit to a module the template imports", async () => {
		const directory = await scratch("module");
		const file = join(directory, "template.tsx");
		const shared = join(directory, "shared.ts");

		await writeFile(shared, 'export const TAG = "one";\n');
		await writeFile(
			file,
			'import { TAG } from "./shared.js";\n' +
				"const T = () => null;\n" +
				"T.PreviewProps = { tag: TAG };\n" +
				"export default T;\n",
		);
		expect((await loadTemplate(file, CACHE)).props).toEqual({ tag: "one" });

		await writeFile(shared, 'export const TAG = "two";\n');
		expect((await loadTemplate(file, CACHE)).props).toEqual({ tag: "two" });
	});
});
