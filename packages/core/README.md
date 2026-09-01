# @stillmap/core

Rendering engine for [stillmap](https://github.com/abinnovision/stillmap):
vector tile decoding, Web Mercator projection, style resolution, label
placement, and SVG serialisation.

No React. No native dependencies. PNG output is available through the optional
`@resvg/resvg-js` peer dependency; without it, SVG output still works.

Core defines the declaration format the JSX layer produces, so the engine is
fully usable by hand-writing declarations:

```ts
import { openFreeMap } from "@stillmap/sources";
import { renderScene } from "@stillmap/core";

const { svg } = await renderScene({
  source: openFreeMap(),
  center: [9.9937, 53.5511],
  zoom: 13,
  width: 1200,
  height: 300,
  declarations: [
    {
      kind: "fill",
      target: { mode: "canonical", kind: "water" },
      fill: "#E1E4E7",
    },
  ],
  labelDeclarations: [],
  markers: [],
  fonts: [],
});
```

Most consumers want [`@stillmap/react`](../react) instead.

## Licence

MIT
