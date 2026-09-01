# @stillmap/sources

Tile sources and schema adapters for
[stillmap](https://github.com/abinnovision/stillmap).

A source is tiles plus a schema plus required attribution. The schema is what
lets one style work across providers: roads are `transportation` in
OpenMapTiles, `streets` in Shortbread, and `roads` in Protomaps, with no overlap
in layer names, property names, or value vocabularies.

```ts
import { openFreeMap, openMapTiles, httpTileSource } from "@stillmap/sources";

// Free planet-wide OpenMapTiles vector tiles, no API key.
const source = openFreeMap();
```

See [docs/tile-sources.md](../../docs/tile-sources.md) for writing your own
adapter and for rate-limit etiquette.

## Licence

MIT
