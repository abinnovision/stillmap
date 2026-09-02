# Tile sources

A source is tiles plus a schema plus attribution. It is not a URL: a template
cannot express PMTiles, and zoom limits belong to the endpoint rather than to a
constant in your code.

## Attribution

Attribution is a licence condition. `<Attribution />` takes its text from the
resolved source, has no `disabled` prop, and omitting the element places
attribution at a default corner rather than removing it. It is drawn into the
raster so it survives the file being copied, embedded, or re-hosted; the failure
mode of an HTML overlay is that the image gets separated from its markup.

## Rate limits and etiquette

OpenFreeMap offers no SLA and is funded by donation. stillmap already retries
with backoff and caches tiles in-process for the life of the process, but that
does not make batch rendering polite on its own.

If you are rendering more than a handful of maps:

- Render sequentially, or with a small bounded concurrency. Every render already
  fetches its own tiles with a concurrency of 6.
- Reuse one process so the tile cache is warm. Maps of the same city share
  almost all their tiles.
- Cache the **output**, not just the tiles. A locator banner for a fixed address
  changes only when your style changes. `examples/nextjs` does this behind an
  HTTP route.
- For sustained or commercial volume, self-host, use PMTiles, or pay a provider.
  MapTiler and Stadia both serve the same OpenMapTiles schema, so switching is a
  one-line source change and no style edits.

A tile that fails every retry is a `TILE_FETCH_FAILED` warning and renders as a
gap, not an exception. Pass `strict: true` to turn that into a throw when a
partial map is worse than no map.

## Writing an adapter

`httpTileSource` covers any `{z}/{x}/{y}` endpoint, with or without TileJSON:

```ts
import { httpTileSource, openMapTiles } from "@stillmap/sources";

export const myTiles = () =>
  httpTileSource({
    id: "my-tiles",
    schema: openMapTiles(),
    attribution: [{ text: "(c) My Data", url: "https://example.com" }],
    tilejson: "https://tiles.example.com/planet",
  });
```

TileJSON is re-resolved on every open, because providers rotate their tile URL
and a stale template returns 404 for the whole viewport rather than failing
loudly. The resolved path also becomes the tile cache version, so a rotation
invalidates the cache automatically.

Reach for `defineTileSource` directly when tiles do not come from one URL per
tile, such as PMTiles range requests or a local file.

## What a schema is for

Layer names do not overlap between providers. Roads are `transportation` in
OpenMapTiles, `streets` in Shortbread, and `roads` in Protomaps, and the
property names and value vocabularies differ too. The schema maps a canonical
kind onto whatever the provider actually publishes, which is what lets one style
work across sources.

A canonical class the schema cannot map is reported as
`SCHEMA_CLASS_UNMAPPED`, and a kind it has no layer for is
`SCHEMA_KIND_UNSUPPORTED`. Because the class vocabulary is an open union, those
warnings are the only thing standing between a typo and a silently empty layer,
so treat them as errors in CI with `strict: true`.
