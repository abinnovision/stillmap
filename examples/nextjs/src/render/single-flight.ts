const inflight = new Map<string, Promise<unknown>>();

/**
 * Collapses concurrent work on the same key into one call.
 *
 * A store list page asks for every map at once, so on a cold cache N requests
 * would otherwise start N renders, each opening its own set of tile
 * connections. This is not a cache: the entry is dropped as soon as the promise
 * settles, including on rejection, so a transient failure is never replayed.
 *
 * Per process. Several server instances still render several times.
 */
export async function coalesce<T>(
	key: string,
	produce: () => Promise<T>,
): Promise<T> {
	const existing = inflight.get(key);

	if (existing !== undefined) {
		return (await existing) as T;
	}

	const promise = produce().finally(() => {
		inflight.delete(key);
	});

	inflight.set(key, promise);

	return await promise;
}
