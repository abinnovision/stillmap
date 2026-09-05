/** The query parameter holding the signature. Never part of what is signed. */
export const SIGNATURE_PARAM = "sig";

/**
 * A deterministic string for a set of query parameters.
 *
 * Both the render key and the signature are computed from this, so the two can
 * never disagree about which parameters identify a map. Pairs are sorted and
 * percent-encoded, which keeps the delimiters unambiguous: without encoding, a
 * value containing `&` could impersonate a second parameter.
 */
export function canonicalQuery(query: URLSearchParams): string {
	const pairs: string[] = [];

	for (const [name, value] of query) {
		if (name === SIGNATURE_PARAM) {
			continue;
		}

		pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
	}

	return pairs.sort().join("&");
}
