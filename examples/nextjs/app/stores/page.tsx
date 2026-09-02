import Link from "next/link";

import { mapVersion } from "../../src/render/key";
import { STORES } from "../../src/stores";

import type { ReactNode } from "react";

/*
 * Server Component, but it renders no maps. It emits URLs and lets the browser
 * fetch them, which is what keeps the map work out of the page's critical path
 * and out of `next build`.
 */
const StoresPage = (): ReactNode => (
	<main>
		<h1>Store finder</h1>
		<p className="lede">
			Four maps, each rendered once and then served from cache.
		</p>

		<ul className="stores">
			{STORES.map((store) => (
				<li key={store.id}>
					<img
						src={`/api/store-map/${store.id}/${mapVersion(store)}.png`}
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

export default StoresPage;
