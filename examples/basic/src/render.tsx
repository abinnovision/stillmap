import { renderMap } from "@stillmap/react";
import { mkdir, writeFile } from "node:fs/promises";

import { Brussels } from "./brussels.tsx";
import { Locator } from "./locator.tsx";
import { Offices } from "./offices.tsx";
import { PRESET_NAMES, PresetCard } from "./presets.tsx";

import type { Office } from "./offices.tsx";
import type { LngLat } from "@stillmap/core";

const OUT = new URL("../out/", import.meta.url);

const HAMBURG: LngLat = [9.9937, 53.5511];
const OFFICES: readonly Office[] = [
	{ id: "a", position: [9.98, 53.545] },
	{ id: "b", position: [10.005, 53.558] },
	{ id: "c", position: [9.995, 53.552] },
];

/**
 * Renders every example against the live OpenFreeMap endpoint and writes them
 * to `out/`. The test suite renders the same components against committed
 * fixtures instead, so it never touches the network.
 *
 * Exported without being called: `main()` reaches the network, so importing
 * this module must not run it.
 */
export async function main(): Promise<void> {
	await mkdir(OUT, { recursive: true });

	const locator = await renderMap(<Locator position={HAMBURG} />, {
		format: "png",
		scale: 2,
	});
	const offices = await renderMap(<Offices offices={OFFICES} />, {
		format: "png",
		scale: 2,
	});
	const brussels = await renderMap(<Brussels />, { format: "png", scale: 2 });
	const presets = await Promise.all(
		PRESET_NAMES.map(async (preset) => ({
			preset,
			result: await renderMap(
				<PresetCard preset={preset} position={HAMBURG} />,
				{ format: "png", scale: 2 },
			),
		})),
	);
	/* The map half of the repository header; see `assets/README.md`. */
	const banner = await renderMap(
		<Locator position={HAMBURG} width={660} height={420} />,
		{ format: "png", scale: 2 },
	);

	const files: readonly (readonly [string, Buffer | string])[] = [
		["locator.png", locator.png],
		["locator.svg", locator.svg],
		["offices.png", offices.png],
		["offices.svg", offices.svg],
		["brussels.png", brussels.png],
		["brussels.svg", brussels.svg],
		["banner.png", banner.png],
		...presets.flatMap(({ preset, result }) => [
			[`preset-${preset}.png`, result.png] as const,
			[`preset-${preset}.svg`, result.svg] as const,
		]),
	];

	await Promise.all(
		files.map(([name, data]) => writeFile(new URL(name, OUT), data)),
	);

	for (const warning of [
		...locator.warnings,
		...offices.warnings,
		...brussels.warnings,
		...banner.warnings,
		...presets.flatMap(({ result }) => result.warnings),
	]) {
		process.stdout.write(`warning ${warning.code}: ${warning.message}\n`);
	}

	process.stdout.write(
		`wrote ${String(files.length)} files to ${OUT.pathname}\n`,
	);
}
