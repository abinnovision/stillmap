import {
	createMapServer,
	defineTemplate,
	fileStore,
	memoizedSource,
	notFound,
	readNumber,
	readString,
} from "@stillmap/serve";
import { openFreeMap } from "@stillmap/sources";
import { join } from "node:path";

import { INTER } from "./assets";
import { StoreMap } from "./map/store-map";
import { findStore } from "./stores";

import type { Store } from "./stores";

/**
 * Bump when anything that changes a render changes: `src/map/style.tsx`, the
 * label declarations in `src/map/store-map.tsx`, or a stillmap upgrade that
 * alters placement. It goes into every minted URL, so bumping it is what
 * reaches a browser or a CDN holding an immutable response; nothing else can.
 */
const STYLE_EPOCH = "5";

/**
 * A fixed value is fine here because this example is not a deployment. Anywhere
 * real this comes from the environment, and a missing value should stop the
 * process rather than fall back to a secret that is public knowledge.
 */
const SECRET =
	process.env["STILLMAP_SECRET"] ?? "stillmap-example-development-secret";

/** Shared floor for both dimensions. resvg will happily rasterise 20000px. */
const PIXELS = { min: 1, integer: true } as const;

/** The query names a store; not finding one is a 404, wherever it is noticed. */
function storeFrom(query: URLSearchParams): Store {
	const store = findStore(readString(query, "id"));

	if (store === undefined) {
		throw notFound("Unknown store");
	}

	return store;
}

/**
 * Everything this application needs to serve maps.
 *
 * The store is the filesystem, which is right here and for any container, and
 * wrong for serverless, where the disk is ephemeral and per-instance. It is one
 * line to swap: see `docs/serving.md`.
 */
export const maps = createMapServer({
	source: memoizedSource(openFreeMap()),
	store: fileStore(join(process.cwd(), ".cache/maps")),
	fonts: [{ family: "Inter", file: INTER }],
	signing: { secret: SECRET },
	basePath: "/api/map",
	epoch: STYLE_EPOCH,

	templates: {
		store: defineTemplate({
			/*
			 * Moving a store changes its URL, which is what makes an immutable
			 * response safe. The lookup happens here too, so a URL minted before
			 * a store was deleted is rejected before any render.
			 */
			version: (query) => storeFrom(query).updatedAt,

			/*
			 * Dimensions are ordinary parameters, so there is no size list to
			 * keep in step with the pages. Bounded anyway: the signature proves
			 * these came from `app/`, not that `app/` was right to send them, and
			 * an unbounded width is an unbounded rasterisation.
			 */
			render: ({ query, source, fonts }) => (
				<StoreMap
					store={storeFrom(query)}
					width={readNumber(query, "w", { ...PIXELS, max: 1600 })}
					height={readNumber(query, "h", { ...PIXELS, max: 900 })}
					source={source}
					fonts={fonts}
				/>
			),
		}),
	},

	onWarning: (warning) => {
		process.stdout.write(`stillmap ${warning.code}: ${warning.message}\n`);
	},

	/* Only misses are reported, so a quiet log is a cache that is working. */
	onRender: (info) => {
		process.stdout.write(
			`rendered ${info.key} in ${info.durationMs.toFixed(0)}ms\n`,
		);
	},
});
