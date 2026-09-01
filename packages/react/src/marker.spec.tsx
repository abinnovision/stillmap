import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { Marker, Pin } from "./marker.js";
import { walk } from "./walk.js";

import type { MarkerDeclaration } from "@stillmap/core";
import type { ReactNode } from "react";

function markers(node: ReactNode): readonly MarkerDeclaration[] {
	return walk(node, createWarningCollector({})).markers;
}

describe("marker", () => {
	it("projects position, size, and anchor into a declaration", () => {
		const [marker] = markers(
			<Marker
				position={[9.9937, 53.5511]}
				anchor="bottom"
				size={[28, 36]}
				padding={8}
			>
				<circle cx="14" cy="13" r="4.5" fill="#fff" />
			</Marker>,
		);

		expect(marker).toMatchObject({
			kind: "marker",
			position: [9.9937, 53.5511],
			size: [28, 36],
			anchor: "bottom",
			padding: 8,
		});
	});

	it("accepts the object form of a coordinate", () => {
		expect(
			markers(
				<Marker position={{ lng: 1, lat: 2 }} size={[10, 10]}>
					<circle />
				</Marker>,
			)[0]?.position,
		).toEqual([1, 2]);
	});

	it("defaults the anchor to center", () => {
		expect(
			markers(
				<Marker position={[0, 0]} size={[10, 10]}>
					<circle />
				</Marker>,
			)[0]?.anchor,
		).toBe("center");
	});

	it("renders SVG children to markup once", () => {
		const [marker] = markers(
			<Marker position={[0, 0]} size={[28, 36]} anchor="bottom">
				<path d="M14 36" fill="#9DB59D" />
				<circle cx="14" cy="13" r="4.5" fill="#FFFFFF" />
			</Marker>,
		);

		expect(marker?.markup).toContain('d="M14 36"');
		expect(marker?.markup).toContain("<circle");
	});

	it("preserves document order across many markers", () => {
		const positions: readonly (readonly [number, number])[] = [
			[1, 1],
			[2, 2],
			[3, 3],
		];
		const declared = markers(
			<>
				{positions.map(([lng, lat]) => (
					<Marker key={lng} position={[lng, lat]} size={[10, 10]}>
						<circle />
					</Marker>
				))}
			</>,
		);

		expect(declared.map((m) => m.position)).toEqual(positions);
	});

	it("drops an HTML child and warns", () => {
		const warn = createWarningCollector({});

		walk(
			<Marker position={[0, 0]} size={[10, 10]}>
				<div>not svg</div>
			</Marker>,
			warn,
		);

		expect(warn.warnings.map((w) => w.code)).toContain(
			"MARKER_UNSUPPORTED_ELEMENT",
		);
	});

	it("warns about an image that is not a data uri", () => {
		const warn = createWarningCollector({});

		walk(
			<Marker position={[0, 0]} size={[10, 10]}>
				<image href="https://example.com/pin.png" />
			</Marker>,
			warn,
		);

		expect(warn.warnings.map((w) => w.code)).toContain(
			"MARKER_IMAGE_NOT_INLINE",
		);
	});

	it("accepts an inline data uri image", () => {
		const warn = createWarningCollector({});

		walk(
			<Marker position={[0, 0]} size={[10, 10]}>
				<image href="data:image/png;base64,iVBORw0KGgo=" />
			</Marker>,
			warn,
		);

		expect(warn.warnings).toEqual([]);
	});
});

describe("pin", () => {
	it("is a marker with a built-in glyph and sensible defaults", () => {
		const [pin] = markers(<Pin position={[9.9937, 53.5511]} fill="#9DB59D" />);

		expect(pin).toMatchObject({
			kind: "marker",
			position: [9.9937, 53.5511],
			size: [28, 36],
			anchor: "bottom",
		});
		expect(pin?.markup).toContain("#9DB59D");
	});

	it("scales its glyph to a custom size", () => {
		const [pin] = markers(<Pin position={[0, 0]} size={[14, 18]} />);

		expect(pin?.size).toEqual([14, 18]);
		expect(pin?.markup).toContain("scale(");
	});
});
