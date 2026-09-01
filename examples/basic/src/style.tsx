import {
	Boundary,
	Building,
	Landcover,
	Park,
	Path,
	Rail,
	Road,
	Water,
	Waterway,
} from "@stillmap/react";

import type { ReactNode } from "react";

/**
 * Neutral palette, reproducing the thirteen rules of the reference locator
 * style. Ordered back to front: document order is paint order.
 *
 * A style is just a component. There is no style-packaging API because none is
 * needed.
 */
export const Neutral = (): ReactNode => (
	<>
		<Landcover
			classes={["wood", "grass", "scrub", "farmland"]}
			fill="#EDEFEB"
			minZoom={10}
		/>
		<Park fill="#EBEEE9" minZoom={11} />
		<Water fill="#E1E4E7" />
		<Waterway classes="river" stroke="#E1E4E7" width={1.6} minZoom={11} />
		<Waterway
			classes={["canal", "stream"]}
			stroke="#E1E4E7"
			width={0.9}
			minZoom={13}
		/>
		<Building fill="#E8E7E4" minZoom={15} />
		<Boundary
			classes={["country", "region"]}
			stroke="#D6D6D1"
			width={1}
			dash={[4, 3]}
		/>
		<Path
			classes={["path", "track"]}
			stroke="#E4E3E0"
			width={0.7}
			dash={[2, 2]}
			minZoom={15}
		/>
		<Rail stroke="#DCDBD7" width={0.9} dash={[5, 4]} minZoom={13} />
		<Road
			classes={["minor", "service"]}
			stroke="#FFFFFF"
			width={(z) => (z < 15 ? 1 : 1.8)}
			minZoom={14}
		/>
		<Road
			classes={["secondary", "tertiary"]}
			stroke="#FFFFFF"
			width={(z) => (z < 13 ? 1.4 : z < 15 ? 2 : 2.8)}
			minZoom={11}
		/>
		<Road
			classes="primary"
			stroke="#FFFFFF"
			width={(z) => (z < 13 ? 1.8 : z < 15 ? 2.6 : 3.6)}
			minZoom={9}
		/>
		<Road
			classes={["motorway", "trunk"]}
			stroke="#FCFBF9"
			width={(z) => (z < 13 ? 2.2 : z < 15 ? 3.2 : 4.6)}
		/>
	</>
);
