import { buildImageResponse } from "../../../../../src/http/image-response";
import { mapVersion } from "../../../../../src/render/key";
import {
	renderStoreMap,
	storeMapKey,
} from "../../../../../src/render/render-store-map";
import { findStore } from "../../../../../src/stores";

/*
 * Node runtime, necessarily. resvg is a native addon and fonts are read from
 * disk by path, neither of which an edge isolate can do. Node is the Next
 * default, so there is nothing to declare.
 *
 * No Next caching primitive is used here either. The handler is dynamic and
 * sets its own headers; see the README for why the alternatives lose.
 */

const SIZES = {
	default: { width: 600, height: 300 },
	large: { width: 1200, height: 600 },
} as const;

interface RouteContext {
	readonly params: Promise<{ storeId: string; version: string }>;
}

export async function GET(
	request: Request,
	context: RouteContext,
): Promise<Response> {
	const { storeId, version } = await context.params;
	const store = findStore(storeId);

	if (store === undefined) {
		return new Response("Unknown store", { status: 404 });
	}

	/*
	 * The URL is served immutable, so an outdated version must not be answered
	 * with current pixels. Redirect to the live URL instead of lying.
	 */
	if (version !== `${mapVersion(store)}.png`) {
		return Response.redirect(
			new URL(
				`/api/store-map/${store.id}/${mapVersion(store)}.png`,
				request.url,
			),
			308,
		);
	}

	const size =
		new URL(request.url).searchParams.get("size") === "large"
			? SIZES.large
			: SIZES.default;

	const args = { store, ...size };

	/*
	 * The key is derived from the request, not from the image, so a conditional
	 * request is answered before any rendering happens.
	 */
	const key = storeMapKey(args);
	const ifNoneMatch = request.headers.get("if-none-match");

	if (ifNoneMatch !== null) {
		const conditional = buildImageResponse({
			bytes: new Uint8Array(),
			etag: key,
			ifNoneMatch,
		});

		if (conditional.status === 304) {
			return conditional;
		}
	}

	const { bytes, rendered } = await renderStoreMap(args);

	process.stdout.write(
		`${rendered ? "rendered" : "cached  "} ${store.id} ${String(size.width)}x${String(size.height)} ${key}\n`,
	);

	return buildImageResponse({ bytes, etag: key, ifNoneMatch: null });
}
