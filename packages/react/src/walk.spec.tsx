import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { defineComponent } from "./registry.js";
import { walk } from "./walk.js";

import type { LayerDeclaration } from "@stillmap/core";
import type { ReactNode } from "react";

const Probe = defineComponent<{ readonly tag: string }>(
	"Probe",
	"layer",
	(props): LayerDeclaration => ({
		kind: "fill",
		target: { mode: "raw", sourceLayer: props.tag },
	}),
);

function layersOf(node: ReactNode): readonly string[] {
	const result = walk(node, createWarningCollector({}));

	return result.layers.map((layer) =>
		layer.target.mode === "raw" ? layer.target.sourceLayer : layer.target.kind,
	);
}

describe("walk", () => {
	it("collects a single declaration", () => {
		expect(layersOf(<Probe tag="water" />)).toEqual(["water"]);
	});

	it("preserves document order", () => {
		expect(
			layersOf(
				<>
					<Probe tag="a" />
					<Probe tag="b" />
					<Probe tag="c" />
				</>,
			),
		).toEqual(["a", "b", "c"]);
	});

	it("descends through fragments and arrays", () => {
		const items = ["x", "y"].map((tag) => <Probe key={tag} tag={tag} />);

		expect(layersOf(<>{items}</>)).toEqual(["x", "y"]);
	});

	it("ignores null, undefined, false, and true", () => {
		expect(
			layersOf(
				<>
					{null}
					{undefined}
					{false}
					{true}
					<Probe tag="only" />
				</>,
			),
		).toEqual(["only"]);
	});

	it("calls a user function component and walks its output", () => {
		const Style = (): ReactNode => (
			<>
				<Probe tag="from" />
				<Probe tag="component" />
			</>
		);

		expect(layersOf(<Style />)).toEqual(["from", "component"]);
	});

	it("supports composition several levels deep", () => {
		const Inner = (): ReactNode => <Probe tag="inner" />;
		const Outer = (): ReactNode => (
			<>
				<Inner />
				<Probe tag="outer" />
			</>
		);

		expect(layersOf(<Outer />)).toEqual(["inner", "outer"]);
	});

	it("passes props through a user component", () => {
		const Named = ({ name }: { readonly name: string }): ReactNode => (
			<Probe tag={name} />
		);

		expect(layersOf(<Named name="passed" />)).toEqual(["passed"]);
	});

	it("warns about a host element it cannot interpret", () => {
		const warn = createWarningCollector({});

		walk(<div />, warn);

		expect(warn.warnings.map((w) => w.code)).toEqual(["UNKNOWN_ELEMENT"]);
	});

	it("warns about stray text", () => {
		const warn = createWarningCollector({});

		walk(<>hello</>, warn);

		expect(warn.warnings.map((w) => w.code)).toEqual(["UNKNOWN_ELEMENT"]);
	});
});
