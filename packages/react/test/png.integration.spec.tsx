import { describe, expect, it } from "vitest";

import { createFixtureSource } from "./support/fixture-source.js";
import { Map, Water, renderMap } from "../src/index.js";

describe("renderMap png", () => {
	it("returns a PNG buffer alongside the SVG", async () => {
		const result = await renderMap(
			<Map
				source={createFixtureSource()}
				center={[9.9937, 53.5511]}
				zoom={13}
				width={400}
				height={200}
			>
				<Water fill="#E1E4E7" />
			</Map>,
			{ format: "png", scale: 2 },
		);

		expect(result.png.subarray(1, 4).toString("ascii")).toBe("PNG");
		// PNG IHDR width lives at byte offset 16.
		expect(result.png.readUInt32BE(16)).toBe(800);
		expect(result.svg.startsWith("<svg")).toBe(true);
	});
});
