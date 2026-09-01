import { createWarningCollector } from "@stillmap/core";
import { describe, expect, it } from "vitest";

import { Font } from "./font.js";
import { PlaceLabels } from "./labels.js";
import { walk } from "./walk.js";

import type { WalkResult } from "./walk.js";
import type { ReactNode } from "react";

function result(node: ReactNode): WalkResult {
	return walk(node, createWarningCollector({}));
}

describe("placeLabels", () => {
	it("emits a labels declaration", () => {
		expect(
			result(<PlaceLabels classes="city" fontSize={15} />).labels[0],
		).toEqual({ kind: "labels", classes: ["city"], fontSize: 15 });
	});

	it("accepts an array of classes", () => {
		expect(
			result(<PlaceLabels classes={["suburb", "quarter"]} />).labels[0]
				?.classes,
		).toEqual(["suburb", "quarter"]);
	});

	it("keeps repeated elements separate so each carries its own style", () => {
		const labels = result(
			<>
				<PlaceLabels classes="city" fontSize={15} maxCount={3} priority={0} />
				<PlaceLabels
					classes="suburb"
					fontSize={11.5}
					maxCount={6}
					priority={3}
				/>
			</>,
		).labels;

		expect(labels).toHaveLength(2);
		expect(labels.map((l) => l.priority)).toEqual([0, 3]);
		expect(labels.map((l) => l.maxCount)).toEqual([3, 6]);
	});

	it("omits absent optional props", () => {
		const declaration = result(<PlaceLabels classes="city" />).labels[0];

		expect(declaration).not.toHaveProperty("halo");
		expect(declaration).not.toHaveProperty("fontSize");
	});
});

describe("font", () => {
	it("collects font faces separately from layers", () => {
		const walked = result(
			<>
				<Font family="Inter" weight={500} file="/fonts/Inter-Medium.ttf" />
				<Font family="Inter" weight={600} file="/fonts/Inter-SemiBold.ttf" />
			</>,
		);

		expect(walked.fonts).toEqual([
			{ family: "Inter", weight: 500, file: "/fonts/Inter-Medium.ttf" },
			{ family: "Inter", weight: 600, file: "/fonts/Inter-SemiBold.ttf" },
		]);
		expect(walked.layers).toEqual([]);
	});

	it("omits weight and style when not given", () => {
		expect(result(<Font family="Inter" file="/f.ttf" />).fonts[0]).toEqual({
			family: "Inter",
			file: "/f.ttf",
		});
	});
});
