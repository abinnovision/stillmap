# Previewing maps

`stillmap dev` renders a directory of map templates in the browser and
re-renders them when you save. It is a development tool: nothing about it is
required to use the library.

```sh
yarn add --dev stillmap
yarn stillmap dev maps
```

## Writing a template

A template default-exports a component. `PreviewProps` supplies its props and is
ignored everywhere except the previewer.

```tsx
// maps/locator.tsx
import { Attribution, Font, Map, Pin, Road } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { fileURLToPath } from "node:url";

import type { LngLat } from "@stillmap/core";

const INTER = fileURLToPath(new URL("./Inter.ttf", import.meta.url));

const Locator = ({ position }: { position: LngLat }) => (
  <Map
    source={openFreeMap()}
    center={position}
    zoom={13}
    width={600}
    height={400}
  >
    <Font family="Inter" file={INTER} />
    <Road stroke="#C9C9C4" width={2} />
    <Pin position={position} />
    <Attribution />
  </Map>
);

Locator.PreviewProps = { position: [9.9937, 53.5511] satisfies LngLat };

export default Locator;
```

The font is not decoration. Every scene carries attribution, and the rasteriser
loads no system fonts, so a PNG with no font declared would lose it silently;
`renderMap` refuses that render instead. The road colour is likewise deliberate:
an unstyled layer paints black at one pixel, and the default background is
white.

Because the export is an ordinary component, the same file can back the map you
render in production. Point `renderMap` at it directly and pass real props.

## Reading the panel

The header reports the size in CSS pixels, the render time, and the resolved
centre and zoom.

That last pair matters most with `fit="markers"`. The viewport is then computed
from the markers in the tree, and nothing in your source says what it came out
as. The previewer prints it, which turns tuning `padding` and `maxZoom` into a
loop you can see.

Below the map is every warning the render produced, by code. `LABEL_DROPPED`
means a label lost its place, usually to a marker. `SCHEMA_CLASS_UNMAPPED` means
you asked for a class the source has no data for, which renders as nothing at
all and is easy to miss otherwise.

## Limits

The previewer fixes the JSX runtime to `react-jsx` rather than reading your
`tsconfig.json`, so it works in projects configured for a bundler. TypeScript
path aliases therefore do not apply inside templates; use relative imports.

Templates are bundled with esbuild before they are imported, into
`node_modules/.cache/stillmap`, which is cleared at startup. There has to be an
installed `node_modules` above the templates directory. `import.meta.url`,
`import.meta.dirname` and `import.meta.filename` are rewritten to point at the
file that wrote them, so a font path derived from one resolves as it would
outside the previewer.

Tiles come over the network. The first render of an area is slow; the tile cache
is shared across renders, so later ones are not.

There are no pan or zoom controls. The template is the source of truth, and a
control that does not write back to it would only mislead.

## Why the preview rasterises

The preview shows PNG by default, and the toggle for SVG is there for reading
geometry rather than for judging the result.

The reason is fonts. A rendered SVG names its family and nothing else, so a
browser resolves it against whatever it has installed rather than against the
file the render was given. The preview works around that by requesting
[`embedFonts`](./fonts.md#embedding-fonts-in-svg-output) for the SVG view, which
inlines the real files, so both views now show the right typeface.

What embedding cannot fix is the failures specific to the rasteriser, both
documented in [fonts](./fonts.md): a `.woff2` renders blank, and a variable font
renders only at its default instance. A browser handles both correctly. The SVG
view will therefore still look right in exactly the cases where your PNG is
broken, which is why PNG is the default.

The preview rasterises at 2x, so it is not softer than the output it stands for.
For a 1200x300 map with the tiles already cached, that costs about 88ms on top
of a 61ms render, and bundling the template adds another 25ms. Call it 170ms a
save, against 85ms for the SVG path.

Neither payload is small: roughly 830KB of base64 PNG, or 1.6MB of SVG once the
876KB of Inter is inlined. On a local dev server that is not worth optimising
for, and the encoded font is cached so only the first render pays for it.

Without the optional `@resvg/resvg-js` peer the preview falls back to SVG and
says so.
