/**
 * Failures the preview server raises itself, as opposed to the ones that come
 * out of a render. The code is stable; the message is not, so branch on the
 * code.
 */
export type PreviewErrorCode =
	| "TEMPLATE_NOT_FOUND"
	| "TEMPLATE_NO_DEFAULT_EXPORT"
	| "TEMPLATE_NOT_RENDERABLE"
	| "TEMPLATE_BUILD_FAILED"
	| "TEMPLATES_DIRECTORY_MISSING"
	| "DEPENDENCIES_NOT_INSTALLED";

export class PreviewError extends Error {
	public readonly code: PreviewErrorCode;
	/** A hint aimed at the person editing the template, shown in the UI. */
	public readonly hint: string | undefined;

	public constructor(code: PreviewErrorCode, message: string, hint?: string) {
		super(message);
		this.name = "PreviewError";
		this.code = code;
		this.hint = hint;
	}
}
