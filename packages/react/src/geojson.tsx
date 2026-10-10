import { geoJsonPoints } from "@stillmap/core";

import { Fill, Line } from "./layers.js";
import { Pin } from "./marker.js";

import type { FillStyle, LayerProps, StrokeStyle } from "./layers.js";
import type { PinProps } from "./marker.js";
import type { Filter, GeoJsonInput } from "@stillmap/core";
import type { ReactNode } from "react";

export interface GeoJsonProps extends LayerProps, FillStyle, StrokeStyle {
	readonly data: GeoJsonInput;
	readonly filter?: Filter;
	/** Styling for the pins drawn at Point features, or `false` for none. */
	readonly pin?:
		false | Pick<PinProps, "fill" | "stroke" | "size" | "anchor" | "reserve">;
}

/**
 * Draws GeoJSON: polygons filled when `fill` is set, lines and outlines
 * stroked when `stroke` is set, and a pin at every point. The fill and the
 * stroke are two layers, because a paint rule is one or the other.
 */
export const GeoJson = (props: GeoJsonProps): ReactNode => {
	const {
		data,
		pin,
		fill,
		fillOpacity,
		stroke,
		width,
		dash,
		opacity,
		...bound
	} = props;

	return (
		<>
			{fill === undefined ? null : (
				<Fill
					data={data}
					{...bound}
					fill={fill}
					{...(fillOpacity === undefined ? {} : { fillOpacity })}
				/>
			)}
			{stroke === undefined ? null : (
				<Line
					data={data}
					{...bound}
					stroke={stroke}
					{...(width === undefined ? {} : { width })}
					{...(dash === undefined ? {} : { dash })}
					{...(opacity === undefined ? {} : { opacity })}
				/>
			)}
			{pin === false
				? null
				: geoJsonPoints(data).map((position) => (
						<Pin key={position.join()} position={position} {...pin} />
					))}
		</>
	);
};
