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

There is no reconciler, so hooks, context, and async components do not work.

## Documentation

- [Styles](../../docs/styles.md), the three shipped styles and how to
  recolour them
- [Fonts](../../docs/fonts.md), including the Turbopack path caveat, why
  `.woff2` is rejected, and how variable fonts behave
- [Tile sources](../../docs/tile-sources.md), including attribution and
  rate-limit etiquette

## License

Apache-2.0
