import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { cacheDirectory } from "./bundle.js";
import { renderTemplate } from "./render.js";

const MAPS = new URL("../../test/fixtures/maps/", import.meta.url);
const CACHE = cacheDirectory(fileURLToPath(new URL("../..", import.meta.url)));

function template(name: string): string {
	return fileURLToPath(new URL(name, MAPS));
}

describe("renderTemplate", () => {
	it("reports a malformed template without throwing", async () => {
		const result = await renderTemplate(
			template("no-default.tsx"),
			CACHE,
			"svg",
		);

		expect(result.kind).toBe("error");
		expect(result).toMatchObject({ code: "TEMPLATE_NO_DEFAULT_EXPORT" });
	});

	it("reports an unexpected failure with its stack", async () => {
		const result = await renderTemplate(template("broken.tsx"), CACHE, "svg");

		expect(result).toMatchObject({
			kind: "error",
			code: "RENDER_FAILED",
			message: expect.stringContaining("broken on purpose"),
		});
		expect(result.kind === "error" && result.stack).toBeTruthy();
	});
});
