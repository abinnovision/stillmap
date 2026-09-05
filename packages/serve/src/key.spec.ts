import { describe, expect, it } from "vitest";

import { renderKey } from "./key.js";

const EPOCH = "1";

const key = (search: string, epoch = EPOCH): string =>
	renderKey({
		epoch,
		query: new URLSearchParams(search),
		format: "png",
		scale: 2,
	});

describe("renderKey", () => {
	it("is 32 hex characters", () => {
		expect(key("t=store&id=42")).toMatch(/^[0-9a-f]{32}$/);
	});

	it("does not depend on query parameter order", () => {
		expect(key("id=42&t=store")).toBe(key("t=store&id=42"));
	});

	it("changes with the epoch", () => {
		expect(key("t=store&id=42", "2")).not.toBe(key("t=store&id=42"));
	});

	/*
	 * Both decide the bytes without appearing in the query. Leaving them out let
	 * a template switch format and still answer the old ETag with a 304.
	 */
	it("changes with the format", () => {
		expect(
			renderKey({
				epoch: EPOCH,
				query: new URLSearchParams("t=store"),
				format: "svg",
				scale: 2,
			}),
		).not.toBe(
			renderKey({
				epoch: EPOCH,
				query: new URLSearchParams("t=store"),
				format: "png",
				scale: 2,
			}),
		);
	});

	it("changes with the scale", () => {
		expect(
			renderKey({
				epoch: EPOCH,
				query: new URLSearchParams("t=store"),
				format: "png",
				scale: 1,
			}),
		).not.toBe(
			renderKey({
				epoch: EPOCH,
				query: new URLSearchParams("t=store"),
				format: "png",
				scale: 2,
			}),
		);
	});

	it.each([
		["a different template", "t=other&id=42"],
		["a different parameter", "t=store&id=43"],
		["an added parameter", "t=store&id=42&width=600"],
		["a removed parameter", "t=store"],
	])("changes with %s", (_label, search) => {
		expect(key(search)).not.toBe(key("t=store&id=42"));
	});

	it("ignores the signature, which is not part of the map's identity", () => {
		expect(key("t=store&id=42&sig=x")).toBe(key("t=store&id=42"));
	});

	it("survives secret rotation, because the signature is excluded", () => {
		expect(key("t=store&id=42&sig=old")).toBe(key("t=store&id=42&sig=new"));
	});

	it("does not confuse a delimiter in a value for another parameter", () => {
		const a = renderKey({
			epoch: EPOCH,
			format: "png",
			scale: 2,
			query: new URLSearchParams([["id", "a&b=c"]]),
		});
		const b = renderKey({
			epoch: EPOCH,
			format: "png",
			scale: 2,
			query: new URLSearchParams([
				["id", "a"],
				["b", "c"],
			]),
		});

		expect(a).not.toBe(b);
	});
});
