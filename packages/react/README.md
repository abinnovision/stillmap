# @stillmap/react

Declare a server-rendered map as JSX and render it to SVG or PNG.

```tsx
const { png } = await renderMap(
  <Map
    source={openFreeMap()}
    center={[9.9937, 53.5511]}
    zoom={13}
    width={1200}
    height={300}
  >
    <Font family="Inter" file={inter} />
    <Water fill="#E1E4E7" />
    <Road classes={["motorway", "trunk"]} stroke="#FCFBF9" width={3.2} />
    <Pin position={[9.9937, 53.5511]} fill="#9DB59D" />
  </Map>,
  { format: "png", scale: 2 },
);
```

The JSX tree is a declaration the engine reads, not markup it renders. Feature
geometry never becomes a React element, which is why a map with thousands of
features stays fast. `react-dom/server` is used only for marker artwork.

Because a user function component is simply called, a reusable style is just a
component:

```tsx
const Neutral = () => (
  <>
    <Water fill="#E1E4E7" />
    <Road classes="primary" stroke="#FFFFFF" width={2.6} />
  </>
);
```

`@stillmap/styles` is nothing more than three of these, packaged.

A marker reserves its box against label placement, so a label underneath it is
dropped rather than drawn beneath the pin. Pass `reserve={false}` to keep the
labels and let the marker sit over them.

## Overlays

`<Overlay>` pins a box to an image corner instead of a coordinate, so legends
and logos stay put under `fit`. It takes a `placement`, a pixel `size`, and an
optional `inset` (a number, or `[x, y]`). An overlay in the attribution's corner
moves inward to clear the attribution text. Overlays in one corner are not stacked;
separate them with `inset`. Like a marker, an overlay reserves its box against
labels unless `reserve={false}`.

`loadTextMeasurer` from `@stillmap/core` sizes a box around its text:

```tsx
const measure = await loadTextMeasurer([{ family: "Inter", file: inter }]);
const { width } = measure("Offices", {
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: 12,
  letterSpacing: 0,
});

<Overlay placement="top-right" size={[width + 24, 32]} inset={12}>
  <rect width={width + 24} height={32} rx={6} fill="#FFFFFF" />
  <text x={12} y={21} fontFamily="Inter" fontSize={12}>
    Offices
  </text>
</Overlay>;
```

## Your own geometry

`<GeoJson>` draws GeoJSON with the same paint rules as tile features. Polygons
fill, lines stroke, and points become pins. `below` paints any layer just
under the first layer of a canonical kind, and `fit="data"` fits the view to
it:

```tsx
<Map source={openFreeMap()} width={1200} height={630} fit="data" padding={40}>
  <Font family="Inter" file={inter} />
  <Water fill="#E1E4E7" />
  <Road stroke="#FFFFFF" width={2} />
  <GeoJson data={district} fill="#F2E3C6" below="road" />
</Map>
```

There is no reconciler, so hooks, context, and async components do not work.

## Documentation

- [Styles](../../docs/styles.md), the three shipped styles and how to
  recolour them
- [GeoJSON](../../docs/geojson.md), drawing your own geometry and placing it
  under the streets
- [Fonts](../../docs/fonts.md), including the Turbopack path caveat, why
  `.woff2` is rejected, and how variable fonts behave
- [Tile sources](../../docs/tile-sources.md), including attribution and
  rate-limit etiquette

## License

Apache-2.0
