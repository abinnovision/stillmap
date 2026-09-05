import { describe, expect, it } from "vitest";

import { SIGNATURE_PARAM } from "./query.js";
import { signQuery, verifyQuery } from "./signing.js";

const SECRET = "correct horse battery staple";

function signed(search: string): URLSearchParams {
	const query = new URLSearchParams(search);

	query.set(SIGNATURE_PARAM, signQuery(SECRET, query));

	return query;
}

describe("signQuery", () => {
	it("does not depend on parameter order", () => {
		expect(signQuery(SECRET, new URLSearchParams("a=1&b=2"))).toBe(
			signQuery(SECRET, new URLSearchParams("b=2&a=1")),
		);
	});

	it("differs by secret", () => {
		const query = new URLSearchParams("a=1");

		expect(signQuery(SECRET, query)).not.toBe(signQuery("other", query));
	});

	it("is url-safe", () => {
		expect(signQuery(SECRET, new URLSearchParams("a=1"))).toMatch(
			/^[A-Za-z0-9_-]+$/,
		);
	});
});

describe("verifyQuery", () => {
	it("accepts what it signed", () => {
		expect(verifyQuery(SECRET, signed("t=store&id=42"))).toBe(true);
	});

	it("rejects a tampered parameter", () => {
		const query = signed("t=store&id=42");

		query.set("id", "43");

		expect(verifyQuery(SECRET, query)).toBe(false);
	});

	it("rejects an added parameter", () => {
		const query = signed("t=store&id=42");

		query.set("width", "4000");

		expect(verifyQuery(SECRET, query)).toBe(false);
	});

	it("rejects a truncated signature", () => {
		const query = signed("t=store&id=42");

		query.set(SIGNATURE_PARAM, (query.get(SIGNATURE_PARAM) ?? "").slice(0, -1));

		expect(verifyQuery(SECRET, query)).toBe(false);
	});

	it("rejects a missing signature", () => {
		expect(verifyQuery(SECRET, new URLSearchParams("t=store&id=42"))).toBe(
			false,
		);
	});

	it("rejects the wrong secret", () => {
		expect(verifyQuery("other", signed("t=store&id=42"))).toBe(false);
	});

	/*
	 * The canonical form drops every `sig`, so a second one changes the URL
	 * without changing what was signed: an unlimited supply of distinct URLs
	 * for one render, and a way to flood a shared cache.
	 */
	it("rejects a second signature", () => {
		const query = signed("t=store&id=42");

		query.append(SIGNATURE_PARAM, "junk");

		expect(verifyQuery(SECRET, query)).toBe(false);
	});

	it("rejects a second signature even when it is also valid", () => {
		const query = signed("t=store&id=42");

		query.append(SIGNATURE_PARAM, query.get(SIGNATURE_PARAM) ?? "");

		expect(verifyQuery(SECRET, query)).toBe(false);
	});

	/*
	 * 22 characters, 44 bytes. A string-length check would pass this through to
	 * `timingSafeEqual`, which throws on a byte-length mismatch and turns a bad
	 * signature into a 500.
	 */
	it("rejects a non-ASCII signature rather than throwing", () => {
		const query = new URLSearchParams("t=store&id=42");

		query.set(SIGNATURE_PARAM, "é".repeat(22));

		expect(() => verifyQuery(SECRET, query)).not.toThrow();
		expect(verifyQuery(SECRET, query)).toBe(false);
	});
});

describe("rotation", () => {
	const OLD = "old-secret";
	const NEW = "new-secret";

	it("signs with the first secret", () => {
		expect(signQuery([NEW, OLD], new URLSearchParams("a=1"))).toBe(
			signQuery(NEW, new URLSearchParams("a=1")),
		);
	});

	it("accepts a URL signed by either, so a rotation is not a cutover", () => {
		const minted = new URLSearchParams("t=store&id=42");

		minted.set(SIGNATURE_PARAM, signQuery(OLD, minted));

		expect(verifyQuery([NEW, OLD], minted)).toBe(true);
	});

	it("rejects a secret that has been dropped", () => {
		const minted = new URLSearchParams("t=store&id=42");

		minted.set(SIGNATURE_PARAM, signQuery(OLD, minted));

		expect(verifyQuery([NEW], minted)).toBe(false);
	});

	it("refuses to sign with nothing", () => {
		expect(() => signQuery([], new URLSearchParams("a=1"))).toThrow(
			/No signing secret/,
		);
	});
});
