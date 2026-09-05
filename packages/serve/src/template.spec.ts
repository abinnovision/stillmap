import { describe, expect, it } from "vitest";

import {
	clamp,
	InvalidParamsError,
	notFound,
	readNumber,
	readString,
	readViewport,
} from "./template.js";

const query = (search: string): URLSearchParams => new URLSearchParams(search);

describe("readString", () => {
	it("returns the value", () => {
		expect(readString(query("id=42"), "id")).toBe("42");
	});

	it.each(["", "id="])("rejects a missing value (%s)", (search) => {
		expect(() => readString(query(search), "id")).toThrow(InvalidParamsError);
	});

	it("names the parameter in the message, because the client sees it", () => {
		expect(() => readString(query(""), "id")).toThrow('"id" is required');
	});
});

describe("readNumber", () => {
	it("parses a number", () => {
		expect(readNumber(query("zoom=13.5"), "zoom")).toBe(13.5);
	});

	it.each(["zoom=abc", "zoom=", ""])("rejects %s", (search) => {
		expect(() => readNumber(query(search), "zoom")).toThrow(InvalidParamsError);
	});
});

describe("readNumber bounds", () => {
	it("clamps to the range", () => {
		const q = query("w=9999");

		expect(readNumber(q, "w", { min: 1, max: 1200 })).toBe(1200);
		expect(readNumber(query("w=-5"), "w", { min: 1, max: 1200 })).toBe(1);
	});

	it("rounds when asked, so a pixel count is whole", () => {
		expect(readNumber(query("w=10.6"), "w", { integer: true })).toBe(11);
	});

	it("is unbounded when no bounds are given", () => {
		expect(readNumber(query("w=1e9"), "w")).toBe(1e9);
	});
});

describe("clamp", () => {
	it.each([
		[5, 0, 10, 5],
		[-1, 0, 10, 0],
		[11, 0, 10, 10],
	])("clamp(%i, %i, %i) is %i", (value, low, high, expected) => {
		expect(clamp(value, low, high)).toBe(expected);
	});
});

describe("readViewport", () => {
	const full = "lng=9.99&lat=53.55&zoom=13&width=600&height=300";

	it("reads the viewport", () => {
		expect(readViewport(query(full))).toEqual({
			center: [9.99, 53.55],
			zoom: 13,
			width: 600,
			height: 300,
		});
	});

	it("clamps the centre to the projection", () => {
		const viewport = readViewport(
			query("lng=400&lat=90&zoom=5&width=10&height=10"),
		);

		expect(viewport.center).toEqual([180, 85.0511]);
	});

	it("clamps zoom to its bounds", () => {
		const at = (zoom: string): number =>
			readViewport(query(`lng=0&lat=0&zoom=${zoom}&width=10&height=10`), {
				minZoom: 4,
				maxZoom: 12,
			}).zoom;

		expect([at("1"), at("20")]).toEqual([4, 12]);
	});

	it("clamps and rounds the size", () => {
		const viewport = readViewport(
			query("lng=0&lat=0&zoom=5&width=9999&height=10.4"),
			{ maxWidth: 800, maxHeight: 400 },
		);

		expect([viewport.width, viewport.height]).toEqual([800, 10]);
	});

	it("never produces a zero-sized map", () => {
		const viewport = readViewport(
			query("lng=0&lat=0&zoom=5&width=0&height=-5"),
		);

		expect([viewport.width, viewport.height]).toEqual([1, 1]);
	});

	it.each(["", "lng=abc&lat=0&zoom=5&width=10&height=10"])(
		"rejects non-numeric parameters (%s)",
		(search) => {
			expect(() => readViewport(query(search))).toThrow(InvalidParamsError);
		},
	);
});

describe("notFound", () => {
	it("carries a 404", () => {
		expect(notFound("gone").status).toBe(404);
	});
});
