# stillmap

Server-side map rendering for TypeScript, with a React-shaped API.

Describe a map as JSX, get back an SVG string or a PNG buffer. No browser, no
canvas, no native map library, and no API key.

```tsx
const { png } = await renderMap(
  <Map
    source={openFreeMap()}
    center={[9.9937, 53.5511]}
    zoom={13}
    width={1200}
    height={300}
  >
    <Font family="Inter" weight={500} file={interMedium} />
    <Water fill="#E1E4E7" />
    <Road classes={["motorway", "trunk"]} stroke="#FCFBF9" width={3.2} />
    <Pin position={[9.9937, 53.5511]} fill="#9DB59D" />
  </Map>,
  { format: "png", scale: 2 },
);
```

## Why this exists

Putting a static map on a page usually means pointing an `<img>` at a provider's
CDN. Every visitor then makes a request to that provider, which in some
countries turns a piece of decoration into a consent question, and which ties
the page to an API key and to a bill that grows with your traffic rather than
with the number of maps you actually have.

The data stopped being the obstacle a long time ago. OpenStreetMap is free to
use commercially, and several providers serve vector tiles built from it. What
was left was the rendering, and doing that yourself meant driving a headless
browser or binding a native map library. That is a lot of machinery for a map in
a footer.

stillmap renders in plain Node. Call it per request behind your own domain, or
call it once in a build step and keep the image for reuse. Either way the
browser only ever talks to you.

## Packages

| Package             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `@stillmap/core`    | Rendering engine. No React, no native dependency.    |
| `@stillmap/sources` | Tile sources and schema adapters.                    |
| `@stillmap/react`   | JSX declaration API and `renderMap()`.               |
| `stillmap`          | CLI. `stillmap dev` previews templates in a browser. |

## Documentation

- [Fonts](./docs/fonts.md)
- [Tile sources](./docs/tile-sources.md)
- [Previewing maps](./docs/preview.md)

## Status

Pre-release. The API is not stable.

## License

Apache-2.0
