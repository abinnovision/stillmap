import { PresetCard } from "../src/presets.tsx";

import type { PresetName } from "../src/presets.tsx";
import type { LngLat } from "@stillmap/core";
import type { ReactNode } from "react";

const HAMBURG: LngLat = [9.9937, 53.5511];

interface PresetsPreviewProps {
	readonly preset: PresetName;
}

/** One shipped style at a time, switchable from the preview. */
const PresetsPreview = ({ preset }: PresetsPreviewProps): ReactNode => (
	<PresetCard preset={preset} position={HAMBURG} />
);

PresetsPreview.PreviewProps = { preset: "light" };

export default PresetsPreview;
