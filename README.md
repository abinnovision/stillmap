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

## Packages

| Package             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `@stillmap/core`    | Rendering engine. No React, no native dependency. |
| `@stillmap/sources` | Tile sources and schema adapters.                 |
| `@stillmap/react`   | JSX declaration API and `renderMap()`.            |
| `stillmap`          | CLI. Reserved; not yet implemented.               |

## Status

Pre-release. The API is not stable.

## Licence

MIT
