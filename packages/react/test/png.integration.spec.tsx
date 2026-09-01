import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createFixtureSource } from "./support/fixture-source.js";
import { Font, Map, Water, renderMap } from "../src/index.js";

import type { ReactElement, ReactNode } from "react";

/**
 * Inter subset to printable ASCII. A real face is needed because every scene
 * carries attribution, and resvg loads no system fonts.
 */
const INTER = fileURLToPath(
	new URL("./fixtures/Inter-subset.ttf", import.meta.url),
);

const scene = (children: ReactNode): ReactElement => (
	<Map
		source={createFixtureSource()}
		center={[9.9937, 53.5511]}
		zoom={13}
		width={400}
		height={200}
	>
		{children}
	</Map>
);

describe("renderMap png", () => {
	it("returns a PNG buffer alongside the SVG", async () => {
		const result = await renderMap(
			scene(
				<>
					<Font family="Inter" file={INTER} />
					<Water fill="#E1E4E7" />
				</>,
			),
			{ format: "png", scale: 2 },
		);

		expect(result.png.subarray(1, 4).toString("ascii")).toBe("PNG");
		// PNG IHDR width lives at byte offset 16.
		expect(result.png.readUInt32BE(16)).toBe(800);
		expect(result.svg.startsWith("<svg")).toBe(true);
	});

	it("refuses to rasterise with no font, rather than drop the attribution", async () => {
		await expect(
			renderMap(scene(<Water fill="#E1E4E7" />), { format: "png" }),
		).rejects.toMatchObject({ code: "FONT_MISSING_FOR_TEXT" });
	});
});
