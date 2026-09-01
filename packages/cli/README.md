# stillmap

Command line tools for [stillmap](https://github.com/abinnovision/stillmap).

`stillmap dev` watches a directory of map templates and previews them in the
browser, re-rendering on save.

## Install

```sh
yarn add --dev stillmap
```

`@stillmap/react`, `react` and `react-dom` are peer dependencies, so the
previewer renders with the same copies your own code does.

## Usage

```sh
stillmap dev [dir]
```

| Argument or option | Meaning                                           |
| ------------------ | ------------------------------------------------- |
| `dir`              | Directory holding the templates. Default `./maps` |
| `--port <number>`  | Port to listen on. Default `3000`                 |
| `--open`           | Open the preview in the default browser           |
| `-h`, `--help`     | Show usage                                        |
| `-v`, `--version`  | Show the version                                  |

The port steps forward if the one you asked for is taken.

## Templates

A template is a `.tsx` or `.jsx` file whose default export is a component, or an
element. Optional `PreviewProps` supplies the props.

```tsx
import { Map, Pin, Roads } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";

import type { LngLat } from "@stillmap/core";

const Locator = ({ position }: { position: LngLat }) => (
  <Map
    source={openFreeMap()}
    center={position}
    zoom={13}
    width={600}
    height={400}
  >
    <Roads />
    <Pin position={position} />
  </Map>
);

Locator.PreviewProps = { position: [9.9937, 53.5511] satisfies LngLat };

export default Locator;
```

`PreviewProps` is read only by the previewer, never by `renderMap`, so it is
safe to leave on a component you also render in production. Nested directories
are found too, and their templates are listed by path.

Files named `*.spec.*` and `*.test.*` are skipped, as are dotfiles and
`node_modules`.

## Output format

The preview rasterises through resvg by default, so what you see is the PNG the
renderer actually produces, fonts included. A toggle switches to SVG for reading
geometry.

The SVG view inlines your font files as `@font-face` rules, so it shows the
right typeface too. It is still the second choice, because it cannot show the
rasteriser's own font failures: a `.woff2` or a variable font that a browser
draws correctly may render blank or at the wrong weight in the PNG.

Without the optional `@resvg/resvg-js` peer the preview falls back to SVG and
says so in the panel.

## What the preview shows

Beside the map itself: its size in CSS pixels, the render time, and the resolved
centre and zoom. The last of those is the point of the panel under `fit="markers"`,
where the viewport is derived from the tree rather than declared and is
otherwise invisible.

Every `RenderWarning` from the render is listed below the map with its code, so
a dropped label or an unmapped class is visible while you work rather than at
the end. A template that throws shows its message and a stack trace pointing at
your source, and the server keeps running.

## How templates are loaded

Node cannot execute JSX, so each template is bundled with esbuild before it is
imported. Three consequences are worth knowing:

- The JSX runtime is fixed to `react-jsx`. Your own `tsconfig.json` is not
  consulted, so a project that sets `jsx` to `preserve` for its bundler still
  previews correctly. The cost is that TypeScript path aliases do not apply
  inside templates. Use relative imports there.
- `import.meta.url`, `import.meta.dirname` and `import.meta.filename` keep
  pointing at the file that wrote them, so a font path derived from them
  resolves as it would outside the previewer.
- Bundles are written to `node_modules/.cache/stillmap` and cleared at startup.
  The previewer needs an installed `node_modules` above the templates
  directory.

Templates reach the network for tiles. The first render of an area is slower;
the tile cache is shared across renders, so later ones are not.

## Markers and labels

A marker claims its box against label collision, so a place label underneath one
is dropped and reported as `LABEL_DROPPED`. That is usually what you want: a pin
marks its subject, and the label under it would be unreadable.

When you would rather keep every label and let the marker sit over them, opt the
marker out:

```tsx
<Pin position={position} reserve={false} />
```

There is no label displacement, so those are the two options.
