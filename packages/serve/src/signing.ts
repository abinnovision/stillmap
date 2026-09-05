import { createHmac, timingSafeEqual } from "node:crypto";

import { canonicalQuery, SIGNATURE_PARAM } from "./query.js";

/**
 * One secret, or several during a rotation.
 *
 * With several, the first signs and any of them verifies, so a new secret can
 * be deployed everywhere before the old one is dropped. Without that, rotating
 * rejects every URL already sitting in a rendered page, an email or a CDN, all
 * at once.
 */
export type Secret = string | readonly string[];

function toList(secret: Secret): readonly string[] {
	return typeof secret === "string" ? [secret] : secret;
}

function hmac(secret: string, canonical: string): string {
	return createHmac("sha256", secret)
		.update(canonical)
		.digest("base64url")
		.slice(0, 22);
}

/**
 * The signature over a map URL's parameters.
 *
 * base64url, so it survives a query string without escaping. Truncated to 128
 * bits, which is far beyond what forging one is worth here and keeps URLs
 * short. Signs with the first secret when several are configured.
 */
export function signQuery(secret: Secret, query: URLSearchParams): string {
	const [first] = toList(secret);

	if (first === undefined || first === "") {
		throw new Error("No signing secret configured.");
	}

	return hmac(first, canonicalQuery(query));
}

/**
 * Whether the query carries a signature one of these secrets would produce.
 *
 * Exactly one `sig` is required. Accepting more would be a hole: the canonical
 * form drops every `sig`, so a second one changes the URL without changing what
 * was signed, which is an unbounded supply of distinct URLs for one render and
 * a way to flood a shared cache.
 *
 * The comparison is timing-safe, and every candidate secret is checked even
 * after one matches, so the time taken does not reveal which one it was.
 */
export function verifyQuery(secret: Secret, query: URLSearchParams): boolean {
	const presented = query.getAll(SIGNATURE_PARAM);

	if (presented.length !== 1) {
		return false;
	}

	/*
	 * Compared as bytes, not as characters. A string length check would pass a
	 * 22-character non-ASCII signature whose UTF-8 encoding is longer, and
	 * `timingSafeEqual` throws on a byte-length mismatch, which would turn a bad
	 * signature into a 500.
	 */
	const offered = Buffer.from(presented[0] ?? "", "utf8");
	const canonical = canonicalQuery(query);
	let matched = false;

	for (const candidate of toList(secret)) {
		const expected = Buffer.from(hmac(candidate, canonical), "utf8");

		if (
			offered.length === expected.length &&
			timingSafeEqual(offered, expected)
		) {
			matched = true;
		}
	}

	return matched;
}
