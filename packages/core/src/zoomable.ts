/**
 * A value that may vary with zoom. Rendering happens at one fixed zoom, so this
 * collapses to a literal exactly once per render.
 */
export type Zoomable<T> = T | ((zoom: number) => T);

export function resolveZoomable<T>(value: Zoomable<T>, zoom: number): T {
	/*
	 * The cast is unavoidable: TypeScript cannot narrow `T | ((zoom) => T)` by
	 * `typeof` when `T` is unconstrained and could itself be a function type.
	 */
	return typeof value === "function"
		? (value as (zoom: number) => T)(zoom)
		: value;
}
