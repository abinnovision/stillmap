import { StillmapError } from "./errors.js";

export type RenderWarningCode =
	| "SCHEMA_KIND_UNSUPPORTED"
	| "SCHEMA_CLASS_UNMAPPED"
	| "TILE_FETCH_FAILED"
	| "ZOOM_CLAMPED"
	| "LABEL_DROPPED"
	| "MARKER_OFFSCREEN"
	| "MARKER_UNSUPPORTED_ELEMENT"
	| "MARKER_IMAGE_NOT_INLINE"
	| "UNKNOWN_ELEMENT";

export interface RenderWarning {
	readonly code: RenderWarningCode;
	readonly message: string;
	readonly detail?: Readonly<Record<string, unknown>>;
}

export interface WarningCollectorOptions {
	readonly onWarning?: (warning: RenderWarning) => void;
	/** Promote every warning to a throw. Intended for CI and golden tests. */
	readonly strict?: boolean;
}

export interface WarningCollector {
	warn: (
		code: RenderWarningCode,
		message: string,
		detail?: Readonly<Record<string, unknown>>,
	) => void;
	readonly warnings: readonly RenderWarning[];
}

export function createWarningCollector(
	options: WarningCollectorOptions,
): WarningCollector {
	const warnings: RenderWarning[] = [];

	return {
		warnings,
		warn(code, message, detail): void {
			/*
			 * `exactOptionalPropertyTypes` rejects an explicit `undefined`, so the
			 * key is only present when a detail was supplied.
			 */
			const warning: RenderWarning =
				detail === undefined ? { code, message } : { code, message, detail };

			if (options.strict === true) {
				throw new StillmapError(
					"STRICT_WARNING",
					`${code}: ${message}`,
					detail,
				);
			}

			warnings.push(warning);
			options.onWarning?.(warning);
		},
	};
}
