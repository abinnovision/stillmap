export type Coalescer = <T>(
	key: string,
	produce: () => Promise<T>,
) => Promise<T>;

/**
 * Collapses concurrent work on the same key into one call.
 *
 * A page listing many maps asks for all of them at once, so on a cold cache N
 * requests would otherwise start N renders, each opening its own set of tile
 * connections. This is not a cache: the entry is dropped as soon as the promise
 * settles, including on rejection, so a transient failure is never replayed.
 *
 * A factory rather than a module-level map, because the key that reaches it
 * identifies a render but not the server that asked for it. Two servers in one
 * process sharing one map would answer each other's requests.
 *
 * Per process. Several server instances still render several times.
 */
export function createCoalescer(): Coalescer {
	const inflight = new Map<string, Promise<unknown>>();

	return async <T>(key: string, produce: () => Promise<T>): Promise<T> => {
		const existing = inflight.get(key);

		if (existing !== undefined) {
			return (await existing) as T;
		}

		const promise = produce().finally(() => {
			inflight.delete(key);
		});

		inflight.set(key, promise);

		return await promise;
	};
}
