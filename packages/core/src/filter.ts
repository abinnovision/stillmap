export type PropertyValue = string | number | boolean;

/**
 * Properties decoded from a vector tile feature. Access with an index
 * expression: `noPropertyAccessFromIndexSignature` rejects dot access.
 */
export type FeatureProperties = Readonly<Record<string, PropertyValue>>;

/** Any CSS colour string. */
export type Color = string;

/**
 * Every key must match. An array value matches when the property equals any of
 * its members.
 */
export type FilterObject = Readonly<
	Record<string, PropertyValue | readonly PropertyValue[]>
>;

export type Filter =
	FilterObject | ((properties: FeatureProperties) => boolean);

export function matchesFilter(
	filter: Filter | undefined,
	properties: FeatureProperties,
): boolean {
	if (filter === undefined) {
		return true;
	}

	if (typeof filter === "function") {
		return filter(properties);
	}

	for (const [key, expected] of Object.entries(filter)) {
		const actual = properties[key];

		if (actual === undefined) {
			return false;
		}

		const matched =
			expected instanceof Array
				? expected.includes(actual)
				: expected === actual;

		if (!matched) {
			return false;
		}
	}

	return true;
}
