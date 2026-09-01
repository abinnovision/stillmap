import { renderMap } from "@stillmap/react";
import { mkdir, writeFile } from "node:fs/promises";

import { Brussels } from "./brussels.tsx";
import { Locator } from "./locator.tsx";
import { Offices } from "./offices.tsx";

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
 * Renders both examples against the live OpenFreeMap endpoint and writes them
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
	/* The map half of the repository header; see `assets/README.md`. */
	const banner = await renderMap(
		<Locator position={HAMBURG} width={660} height={420} />,
		{ format: "png", scale: 2 },
	);

	await writeFile(new URL("locator.png", OUT), locator.png);
	await writeFile(new URL("locator.svg", OUT), locator.svg);
	await writeFile(new URL("offices.png", OUT), offices.png);
	await writeFile(new URL("offices.svg", OUT), offices.svg);
	await writeFile(new URL("brussels.png", OUT), brussels.png);
	await writeFile(new URL("brussels.svg", OUT), brussels.svg);
	await writeFile(new URL("banner.png", OUT), banner.png);

	for (const warning of [
		...locator.warnings,
		...offices.warnings,
		...brussels.warnings,
		...banner.warnings,
	]) {
		process.stdout.write(`warning ${warning.code}: ${warning.message}\n`);
	}

	process.stdout.write(`wrote 7 files to ${OUT.pathname}\n`);
}
