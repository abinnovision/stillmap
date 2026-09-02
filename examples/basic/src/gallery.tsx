import { renderMap } from "@stillmap/react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { codeToHtml } from "shiki";

import { Brussels } from "./brussels.tsx";
import { page } from "./gallery-page.ts";
import { Locator } from "./locator.tsx";
import { Offices } from "./offices.tsx";

import type { GallerySection } from "./gallery-page.ts";
import type { Office } from "./offices.tsx";
import type { LngLat } from "@stillmap/core";
import type { ReactElement } from "react";

const OUT = new URL("../out/site/", import.meta.url);
const ROOT = new URL("../", import.meta.url);

const SANDBOX =
	"https://codesandbox.io/p/devbox/github/abinnovision/stillmap/tree/main/demo";

const HAMBURG: LngLat = [9.9937, 53.5511];
const OFFICES: readonly Office[] = [
	{ id: "a", position: [9.98, 53.545] },
	{ id: "b", position: [10.005, 53.558] },
	{ id: "c", position: [9.995, 53.552] },
];

interface Entry {
	readonly id: string;
	readonly title: string;
	readonly blurb: string;
	readonly element: ReactElement;
	/** The component that produced the image, relative to the package root. */
	readonly source: string;
	/** The matching template in `demo/`, where one exists. */
	readonly sandboxFile: string | undefined;
}

const ENTRIES: readonly Entry[] = [
	{
		id: "locator",
		title: "Locator",
		blurb:
			"One place, one marker, a wide crop. Three tiers of place label, each " +
			"with its own count and priority, so the densest tier drops first when " +
			"the labels collide.",
		element: <Locator position={HAMBURG} />,
		source: "src/locator.tsx",
		sandboxFile: "/maps/locator.tsx",
	},
	{
		id: "offices",
		title: "Fitted markers",
		blurb:
			"The viewport is derived from the markers rather than declared. Marker " +
			"artwork is plain SVG, and anything the rasteriser cannot draw is " +
			"dropped with a warning rather than silently.",
		element: <Offices offices={OFFICES} />,
		source: "src/offices.tsx",
		sandboxFile: "/maps/offices.tsx",
	},
	{
		id: "brussels",
		title: "A reconstructed style",
		blurb:
			"Mapbox light-v11, rebuilt as components over OpenFreeMap tiles. The " +
			"style it pulls in lives in src/mapbox-light.tsx: a style is just a " +
			"component, so there is no style-packaging API because none is needed.",
		element: <Brussels />,
		source: "src/brussels.tsx",
		sandboxFile: undefined,
	},
];

async function highlight(file: string): Promise<string> {
	const code = await readFile(new URL(file, ROOT), "utf8");

	return await codeToHtml(code.trimEnd(), {
		lang: "tsx",
		theme: "github-light",
	});
}

/**
 * Renders every example against the live OpenFreeMap endpoint and writes a
 * static page showing each map beside its source. Reaches the network, so it
 * runs in CI rather than in the test suite.
 */
async function main(): Promise<void> {
	await mkdir(OUT, { recursive: true });

	const sections: GallerySection[] = [];
	const warnings: string[] = [];

	/*
	 * Serial on purpose. Renders share the process-level tile cache, and these
	 * viewports overlap, so rendering in parallel would refetch from
	 * OpenFreeMap what the previous render already holds.
	 */
	for (const entry of ENTRIES) {
		// eslint-disable-next-line no-await-in-loop
		const result = await renderMap(entry.element, {
			format: "png",
			scale: 2,
		});

		// eslint-disable-next-line no-await-in-loop
		await writeFile(new URL(`${entry.id}.png`, OUT), result.png);

		for (const warning of result.warnings) {
			warnings.push(`${entry.id}: ${warning.code}: ${warning.message}`);
		}

		sections.push({
			id: entry.id,
			title: entry.title,
			blurb: entry.blurb,
			width: result.width,
			height: result.height,
			// eslint-disable-next-line no-await-in-loop
			code: await highlight(entry.source),
			sourcePath: entry.source,
			sandboxUrl:
				entry.sandboxFile === undefined
					? undefined
					: `${SANDBOX}?file=${entry.sandboxFile}`,
		});

		process.stdout.write(
			`rendered ${entry.id} (${String(result.width)}x${String(result.height)})\n`,
		);
	}

	await writeFile(new URL("index.html", OUT), page(sections, SANDBOX));

	for (const warning of warnings) {
		process.stdout.write(`warning ${warning}\n`);
	}

	process.stdout.write(
		`wrote ${String(ENTRIES.length + 1)} files to ${OUT.pathname}\n`,
	);
}

await main();
