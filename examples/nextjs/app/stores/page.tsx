import Link from "next/link";

import { maps } from "../../src/maps";
import { STORES } from "../../src/stores";

import type { ReactNode } from "react";

/*
 * Server Component, but it renders no maps. It emits URLs and lets the browser
 * fetch them, which is what keeps the map work out of the page's critical path
 * and out of `next build`.
 *
 * `maps.url` is asynchronous because a template's version may have to look its
 * data up. Here it does not, but the shape is the same either way.
 */
const StoresPage = async (): Promise<ReactNode> => {
	const cards = await Promise.all(
		STORES.map(async (store) => ({
			store,
			src: await maps.url("store", { id: store.id, w: 600, h: 300 }),
		})),
	);

	return (
		<main>
			<h1>Store finder</h1>
			<p className="lede">
				Four maps, each rendered once and then served from cache.
			</p>

			<ul className="stores">
				{cards.map(({ store, src }) => (
					<li key={store.id}>
						<img
							src={src}
							width={600}
							height={300}
							alt={`Map showing ${store.name}`}
							loading="lazy"
							decoding="async"
						/>
						<h2>
							<Link href={`/stores/${store.id}`}>{store.name}</Link>
						</h2>
						<address>{store.address}</address>
					</li>
				))}
			</ul>
		</main>
	);
};

export default StoresPage;
