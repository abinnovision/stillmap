import { Attribution, Font, Map, renderMap } from "@stillmap/react";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { Dark, DARK } from "./dark.js";
import { Light, LIGHT } from "./light.js";
import { Neutral, NEUTRAL } from "./neutral.js";
import { createFixtureSource } from "../test/support/fixture-source.js";

import type { StyleProps } from "./props.js";
import type { LngLat, Palette } from "@stillmap/core";
import type { RenderedSvg } from "@stillmap/react";
import type { ReactNode } from "react";

/*
 * The committed tiles are z13 Hamburg only. Rendering anywhere else, or at any
 * other zoom, silently returns empty tiles and every assertion below passes on
 * an empty map.
 */
const HAMBURG: LngLat = [9.9937, 53.5511];

const INTER = fileURLToPath(
	new URL("../test/fixtures/Inter-subset.ttf", import.meta.url),
);

/*
 * A background no palette uses. Two of the three styles paint their roads
 * "#FFFFFF", so a white canvas would satisfy a colour assertion on its own.
 */
const CANARY = "#FF00FF";

const source = createFixtureSource();

function render(
	style: ReactNode,
	families: readonly string[] = ["Fixture"],
): Promise<RenderedSvg> {
	return renderMap(
		<Map
			source={source}
			center={HAMBURG}
			zoom={13}
			width={1200}
			height={300}
			background={CANARY}
		>
			{families.map((family) => (
				<Font key={family} family={family} file={INTER} />
			))}
			{style}
			<Attribution placement="bottom-right" />
		</Map>,
	);
}

const PRESETS: readonly [string, (props?: StyleProps) => ReactNode, Palette][] =
	[
		["neutral", Neutral, NEUTRAL],
		["light", Light, LIGHT],
		["dark", Dark, DARK],
	];

describe.each(PRESETS)("%s", (_name, Style, palette) => {
	it("references no class the schema rejects", async () => {
		const { warnings } = await render(<Style />);

		expect(warnings.filter((w) => w.code.startsWith("SCHEMA_"))).toEqual([]);
	});

	it("paints its road and water colours", async () => {
		const { svg } = await render(<Style />);

		expect(svg).toContain(palette.geometry.road);
		expect(svg).toContain(palette.geometry.water);
	});

	it("recolours one key without disturbing the rest", async () => {
		const { svg } = await render(
			<Style
				palette={{ geometry: { water: "#123456", waterway: "#123456" } }}
			/>,
		);

		expect(svg).toContain("#123456");
		expect(svg).not.toContain(palette.geometry.water);
		expect(svg).toContain(palette.geometry.road);
	});

	it("drops the place hierarchy when asked", async () => {
		const withLabels = await render(<Style />);
		const without = await render(<Style labels={false} />);

		expect(withLabels.svg).toContain("Hamburg");
		expect(without.svg).not.toContain("Hamburg");
		/* Attribution is structural, so one text element always survives. */
		expect(without.svg.match(/<text/g)).toHaveLength(1);
	});

	it("adopts the family the map declares", async () => {
		const { svg } = await render(<Style />, ["Whatever"]);

		expect(svg).toContain('font-family="Whatever"');
	});

	it("uses a named family when the map declares more than one", async () => {
		const { svg } = await render(<Style fontFamily="Second" />, [
			"First",
			"Second",
		]);

		expect(svg).toContain('font-family="Second"');
		expect(svg).not.toContain('font-family="First"');
	});
});
