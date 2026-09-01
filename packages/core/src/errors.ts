export type StillmapErrorCode =
	| "FONT_NOT_FOUND"
	| "FONT_FORMAT_UNSUPPORTED"
	| "FONT_MISSING_FOR_LABELS"
	| "PNG_BACKEND_MISSING"
	| "ROOT_ELEMENT_NOT_MAP"
	| "FIT_WITHOUT_MARKERS"
	| "TILE_BUDGET_EXCEEDED"
	| "STRICT_WARNING";

/**
 * Every failure this library raises. The code is stable across releases; the
 * message is not, so branch on the code.
 */
export class StillmapError extends Error {
	public readonly code: StillmapErrorCode;
	public readonly detail: Readonly<Record<string, unknown>> | undefined;

	public constructor(
		code: StillmapErrorCode,
		message: string,
		detail?: Readonly<Record<string, unknown>>,
	) {
		super(message);
		this.name = "StillmapError";
		this.code = code;
		this.detail = detail;
	}
}
