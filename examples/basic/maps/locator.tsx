import { Locator } from "../src/locator.tsx";

import type { LngLat } from "@stillmap/core";
import type { ReactNode } from "react";

const HAMBURG: LngLat = [9.9937, 53.5511];

/** The locator banner, as `stillmap dev` previews it. */
const LocatorPreview = (): ReactNode => <Locator position={HAMBURG} />;

export default LocatorPreview;
