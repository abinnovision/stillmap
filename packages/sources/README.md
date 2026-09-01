# @stillmap/sources

Tile sources and schema adapters for
[stillmap](https://github.com/abinnovision/stillmap).

A source is tiles plus a schema plus required attribution. The schema is what
lets one style work across providers: roads are `transportation` in
OpenMapTiles, `streets` in Shortbread, and `roads` in Protomaps, with no overlap
in layer names, property names, or value vocabularies.

```ts
import { httpTileSource, openFreeMap, openMapTiles } from "@stillmap/sources";

// Planet-wide OpenMapTiles vector tiles, free and without an API key.
const source = openFreeMap();
```

See [tile sources](../../docs/tile-sources.md) for writing your own adapter and
for rate-limit etiquette.

## License

Apache-2.0
