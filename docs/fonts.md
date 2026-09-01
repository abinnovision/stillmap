# Fonts

stillmap passes font **file paths** to the rasteriser, never buffers. resvg's
musl build accepts a `fontBuffers` option and silently ignores it, so a buffer
API would be a documented lie. There is no buffer form and there will not be.

Declare each face inside the map:

```tsx
<Map ...>
	<Font family="Inter" weight={500} file={interMedium} />
	<Font family="Inter" weight={600} file={interSemiBold} />
</Map>
```

Every declared path is validated before the first tile is fetched:

| Problem                                     | Result                                            |
| ------------------------------------------- | ------------------------------------------------- |
| Unsupported format (`.woff`, `.woff2`)      | throws `FONT_FORMAT_UNSUPPORTED`                  |
| Path cannot be read                         | throws `FONT_NOT_FOUND`, naming the resolved path |
| A label is declared with no matching family | throws `FONT_MISSING_FOR_LABELS`                  |

None of these is a warning. A map that renders without its labels looks
finished and is not.

## Supported formats

`.ttf`, `.otf`, `.ttc`, `.otc`.

**Not `.woff` or `.woff2`.** This is the important one, because it fails in the
worst possible way: resvg loads a web font without raising anything and then
draws no text at all. Web font formats exist for browsers; this runs in Node.
stillmap rejects them up front rather than letting you discover it in a blank
map.

## Variable fonts

A variable font loads and renders, but resvg draws it at its **default
instance**. `font-weight` in the output does not select a position on the weight
axis, so a map declaring weight 500 and weight 600 labels will draw both at the
same weight.

If weight variation matters, ship separate static files, one per weight, and
declare each as its own `<Font>`. `examples/basic` uses a single variable Inter
and therefore has uniform label weight; that is a deliberate simplification, not
a bug in the label styles.

## Resolving the path

### Plain Node, tsx, and ts-node

```ts
import { fileURLToPath } from "node:url";

const interMedium = fileURLToPath(
  new URL("../assets/Inter-Medium.ttf", import.meta.url),
);
```

This is the supported strategy and the one `examples/basic` uses.

### Next.js with Turbopack

**The pattern above does not work.** Turbopack rewrites a computed
`new URL(..., import.meta.url)` asset reference to its own emitted copy, and
when the file name is computed rather than literal it collapses every such
reference to whichever asset it emitted first. The symptom is a map with no
labels, or with the wrong face.

Resolve against the working directory instead, and keep the directory intact in
the standalone output:

```ts
import { join } from "node:path";

const interMedium = join(process.cwd(), "src/assets/Inter-Medium.ttf");
```

```ts
// next.config.ts
export default {
  outputFileTracingIncludes: {
    "/api/**": ["./src/assets/**"],
  },
};
```

The working directory is the app root in every environment that runs a Next
server, including the standalone output and a container image.

### Bundlers generally

If a bundler may rewrite your asset paths, resolve at runtime from a directory
you control rather than from the module URL. Prefer a path stillmap can check
over one the bundler can move.

## Coverage

The OpenMapTiles adapter filters label text to the Latin ranges the usual
example fonts cover. Text outside them rasterises as empty boxes, which is worse
than an absent label, so it is dropped instead. Supplying a font with wider
coverage does not currently widen that filter; that belongs to the label engine
work deferred past v0.
