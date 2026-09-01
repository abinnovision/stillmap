import { Offices } from "../src/offices.tsx";

import type { Office } from "../src/offices.tsx";
import type { ReactNode } from "react";

interface OfficesPreviewProps {
	readonly offices: readonly Office[];
}

/** Three markers and a fitted viewport, which the preview reports as text. */
const OfficesPreview = ({ offices }: OfficesPreviewProps): ReactNode => (
	<Offices offices={offices} />
);

OfficesPreview.PreviewProps = {
	offices: [
		{ id: "a", position: [9.98, 53.545] },
		{ id: "b", position: [10.005, 53.558] },
		{ id: "c", position: [9.995, 53.552] },
	] as readonly Office[],
};

export default OfficesPreview;
