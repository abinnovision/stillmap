import Link from "next/link";
import { notFound } from "next/navigation";

import { maps } from "../../../src/maps";
import { findStore } from "../../../src/stores";

import type { ReactNode } from "react";

interface StorePageProps {
	readonly params: Promise<{ storeId: string }>;
}

/*
 * The same store at twice the size. The dimensions are part of the cache key,
 * so this is a different render and a different cache entry from the one on the
 * list page, reached through the same URL shape.
 */
const StorePage = async ({ params }: StorePageProps): Promise<ReactNode> => {
	const { storeId } = await params;
	const store = findStore(storeId);

	if (store === undefined) {
		notFound();
	}

	const src = await maps.url("store", { id: store.id, w: 1200, h: 600 });

	return (
		<main>
			<figure>
				<img
					src={src}
					width={1200}
					height={600}
					alt={`Map showing ${store.name}`}
					decoding="async"
				/>
			</figure>
			<h1>{store.name}</h1>
			<address>{store.address}</address>
			<p className="lede">
				<Link href="/stores">All stores</Link>
			</p>
		</main>
	);
};

export default StorePage;
