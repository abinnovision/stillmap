import type { LngLat } from "@stillmap/core";

export interface Store {
	readonly id: string;
	readonly name: string;
	readonly address: string;
	readonly position: LngLat;
	/** Bumped when the store moves. Part of the map URL, so a move busts caches. */
	readonly updatedAt: string;
}

/*
 * All four sit inside the three tiles committed under
 * packages/core/test/fixtures/, so the golden test renders the real component
 * without touching the network.
 */
export const STORES: readonly Store[] = [
	{
		id: "hamburg-mitte",
		name: "Hamburg Mitte",
		address: "Rathausmarkt 1, 20095 Hamburg",
		position: [9.9937, 53.5511],
		updatedAt: "2026-01-14",
	},
	{
		id: "hamburg-hafencity",
		name: "Hamburg HafenCity",
		address: "Am Kaiserkai 62, 20457 Hamburg",
		position: [9.9847, 53.5413],
		updatedAt: "2026-02-02",
	},
	{
		id: "hamburg-sternschanze",
		name: "Hamburg Sternschanze",
		address: "Schanzenstrasse 105, 20357 Hamburg",
		position: [9.9612, 53.5622],
		updatedAt: "2025-11-30",
	},
	{
		id: "hamburg-uhlenhorst",
		name: "Hamburg Uhlenhorst",
		address: "Schoene Aussicht 20, 22085 Hamburg",
		position: [10.0121, 53.5697],
		updatedAt: "2026-03-18",
	},
];

export function findStore(id: string): Store | undefined {
	return STORES.find((store) => store.id === id);
}
