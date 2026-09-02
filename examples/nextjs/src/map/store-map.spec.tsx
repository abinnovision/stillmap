import { renderMap } from "@stillmap/react";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { STORES } from "../stores";
import { StoreMap } from "./store-map";
import { createFixtureSource } from "../../test/support/fixture-source";

import type { Store } from "../stores";

const source = createFixtureSource();
const store = STORES[0] as Store;

function goldenPath(name: string): string {
	return fileURLToPath(
		new URL(`../../test/golden/${name}.svg`, import.meta.url),
	);
}

/** Rewrites the golden only when asked, so the tests stay branch-free. */
function maybeUpdate(name: string, svg: string): void {
	if (process.env["UPDATE_GOLDEN"] === "1") {
		writeFileSync(goldenPath(name), svg);
	}
}

function readGolden(name: string): string {
	return readFileSync(goldenPath(name), "utf8");
}

describe("store map", () => {
	it("renders at the requested size with no schema gaps", async () => {
		const result = await renderMap(
			<StoreMap store={store} width={600} height={300} source={source} />,
		);

		/*
		 * A schema warning means a binding or a canonical class is wrong, which
		 * is a real defect. LABEL_DROPPED is not: a dense city centre always
		 * produces some.
		 */
		expect(result.warnings.filter((w) => w.code.startsWith("SCHEMA_"))).toEqual(
			[],
		);
		expect(result.width).toBe(600);
		expect(result.height).toBe(300);
	});

	it("carries attribution, the pin, and place labels", async () => {
		const { svg } = await renderMap(
			<StoreMap store={store} width={600} height={300} source={source} />,
		);

		expect(svg).toContain("OpenFreeMap");
		expect(svg).toContain("#9DB59D");
		expect(svg).toContain("<text");
	});

	it("matches its golden", async () => {
		const { svg } = await renderMap(
			<StoreMap store={store} width={600} height={300} source={source} />,
		);

		maybeUpdate("store-map", svg);

		expect(svg).toBe(readGolden("store-map"));
	});
});
