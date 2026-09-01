# @stillmap/core

Rendering engine for [stillmap](https://github.com/abinnovision/stillmap):
vector tile decoding, Web Mercator projection, style resolution, label
placement, and SVG serialisation.

No React, no native dependencies. PNG output comes from the optional
`@resvg/resvg-js` peer dependency. Without it, SVG output still works.

Core owns the declaration format the JSX layer produces, so the engine is usable
on its own:

```ts
import { renderScene } from "@stillmap/core";
import { openFreeMap } from "@stillmap/sources";

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

## License

Apache-2.0
