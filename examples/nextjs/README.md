# stillmap in Next.js

A store finder. Four shops, one map each, rendered on the server and served as
PNGs from a route handler.

The maps are the easy part. What this example is actually about is everything
around them: a render costs real CPU and a burst of tile downloads, so putting
one behind HTTP traffic without a cache in front is how you end up rate-limited
by a tile provider funded on donations.

```sh
yarn build                                   # from the repository root, first
yarn workspace @stillmap-examples/nextjs dev
```

Then open <http://localhost:3000/stores>.

## The shape

```
src/    plain TypeScript. Nothing here imports `next`.
app/    thin adapters. `route.ts` is twenty lines of params in, Response out.
```

That split is deliberate. Every caching, keying and header decision is ordinary
code, so the tests run under vitest without touching Next's compiler, and the
golden test exercises the same component the route does. It also means the whole
caching layer moves to Fastify or Hono unchanged.

## What gets cached, and what each layer is worth

### The URL carries a version

`/api/store-map/[storeId]/[version].png`, where the version is the style version
and the store's own timestamp.

```
Cache-Control: public, max-age=31536000, immutable
ETag: "<the render key>"
```

Because the URL changes when the map changes, the response never has to expire.
Browsers, CDNs and proxies all hit without revalidating.

The cost is real: you own `STYLE_VERSION` in `src/render/key.ts` and have to bump
it when you edit `src/map/style.tsx`. Forget, and every visitor keeps the old map
indefinitely. Requesting an outdated version redirects to the current URL rather
than answering with current pixels, because an immutable response that lies is
worse than a redirect.

If your URLs cannot carry a version, swap the header in
`src/http/image-response.ts` for:

```
public, max-age=0, s-maxage=86400, stale-while-revalidate=604800
```

A shared cache then serves for a day and revalidates in the background instead of
making somebody wait.

**The ETag comes from the render key, not from the bytes.** That is the single
most useful line in this example: the key is known before anything is rendered,
so a conditional request is answered with a `304` without calling `renderMap` at
all.

### An output store

`src/render/store.ts` is an interface with two methods, and `fileMapStore` writes
PNGs under `.cache/maps` with a write-then-rename so a reader never sees half a
file.

It is an interface rather than an inline `writeFile` because the filesystem is
the wrong answer half the time. It works on a long-lived server or in a
container. It does not work on serverless, where the disk is ephemeral and
per-instance. Swap in Redis, S3 or a blob store and nothing else changes.

### In-flight coalescing

`src/render/single-flight.ts`, about a dozen lines. The store list asks for four
maps at once, and a deploy that drops the CDN makes four cold keys land together.
Without it, N concurrent requests for one map start N renders, each opening its
own six tile connections.

Measured on this example, eight concurrent requests for one cold map produce one
render and seven waiters. It is not a cache: the entry is dropped as soon as the
promise settles, including on rejection, so a transient failure is never
replayed. It is also per-process, so several instances still render several
times. It turns a stampede into a trickle; it does not replace the store.

### Opening the source is not free

`openFreeMap()` resolves its TileJSON over HTTP, and the engine opens the source
once per render. Uncached, that is a network round trip in front of every cold
render. `src/render/source.ts` memoizes the opened handle for an hour and leaves
tile fetching alone. The TTL is what keeps the provider's URL rotation working as
cache invalidation: short next to a rotation, long next to a request.

### The tile cache you get for free

`@stillmap/core` keeps a process-wide 150-entry LRU of tiles. On a long-lived
server that is genuinely useful and costs nothing; consecutive maps of one city
share almost every tile. On serverless it is close to worthless, because every
cold instance starts empty.

It never survives a restart, and you cannot size it, clear it or scope it, because
`renderMap()` does not take a cache. If you need tiles cached across processes,
wrap `fetchTile` in your own `TileSource` via `defineTileSource`. This example
does not: with the output cached, tiles are only fetched on a cold key, and cold
keys are rare by construction.

## What this example deliberately does not use

| Not used                   | Why                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unstable_cache`           | Replaced by `use cache` in Next 16, and it serializes through the incremental cache, so a `Buffer` round-trips as `{"type":"Buffer","data":[…]}`. The large map here is 430 KB; JSON-encoded that approaches Vercel's 2 MB item limit, above which entries are silently not cached. |
| `"use cache"`              | Needs `cacheComponents: true`, a whole-app opt-in that would turn this into a Cache Components tutorial. Its default handler is an in-memory LRU that Next's own docs say typically does not persist across serverless requests.                                                    |
| `dynamic = "force-static"` | Makes `headers()` return empty, so there is no `If-None-Match` and no 304s, and Next then owns the `Cache-Control` we chose on purpose.                                                                                                                                             |
| `revalidate`               | Only affects Next's instrumented `fetch`. The cost here is resvg and tiles fetched through core's own fetcher.                                                                                                                                                                      |
| `next/image`               | Would route an already-cached URL through the image optimizer, adding a second cache with its own TTL and re-encoding pixels that are already correct. Two caches disagreeing about one image is a support ticket.                                                                  |
| inline SVG                 | An SVG map is around 450 KB. Four inline is a 1.8 MB HTML document that cannot be lazy-loaded or cached apart from the page. Inline SVG earns its place for one map above the fold with `embedFonts: true`; see `docs/fonts.md`.                                                    |

So: no Next caching primitive at all. The handler stays dynamic, sets its own
headers, and keeps the memoization in `src/` where it is testable offline.

## Configuration that is not optional

### `serverExternalPackages`

```ts
serverExternalPackages: ["@resvg/resvg-js"],
```

resvg is a native `.node` addon that selects a per-platform package through a
runtime require, which does not survive bundling. The failure is disguised: core
catches the import error and reports `PNG_BACKEND_MISSING`, which reads as
"install `@resvg/resvg-js`" even though you have. **If you see
`PNG_BACKEND_MISSING` on a deployed Next app, this is why.**

The stillmap packages themselves need no configuration.

### Fonts and tracing

```ts
outputFileTracingRoot: join(import.meta.dirname, "../.."),
outputFileTracingIncludes: { "/api/**": ["./src/assets/**"] },
```

Fonts are resolved from `process.cwd()`, not from `import.meta.url`. Turbopack
rewrites a computed `new URL(..., import.meta.url)` to its own emitted asset and
collapses every such reference to whichever one it emitted first, which shows up
as a map with no labels. `docs/fonts.md` covers this in full.

The tracing root is the workspace root because yarn hoists `@resvg/*` out of this
directory.

### Node runtime

Nothing declares `export const runtime`, because `nodejs` is the Next 16 default
and it is the only option: a native addon cannot load in an edge isolate, and
fonts are read from disk by path.

### tsconfig

This example uses `moduleResolution: "bundler"`, `jsx: "preserve"` and
extensionless imports, unlike `examples/basic`. The repository convention of
importing with explicit extensions exists because examples run under Node's type
stripping, which resolves specifiers literally. This one runs under Turbopack,
where that reason does not apply. Every strictness flag from the shared base is
still inherited and still enforced.

`.next/types` is deliberately not part of `typecheck`: those generated types are
not written against `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`,
and depending on them would make `yarn check` require a build first. The route
handler types its own params instead.

## Building from this repository

Turbopack resolves `@stillmap/*` to the built `dist`, so run `yarn build` at the
repository root before `yarn dev`. Editing `packages/react/src` will not
hot-reload into this app; rebuild instead.

`yarn build:next` produces a production build, and `yarn start` serves it. Both
work from a plain checkout.

## Tests

```sh
yarn test-unit
```

Nothing touches the network. `src/map/store-map.spec.tsx` renders the real
component against the tile fixtures committed under
`packages/core/test/fixtures/` and compares the SVG to a golden; refresh it with
`UPDATE_GOLDEN=1` after an intentional change and read the diff before committing
it. The store positions are all in Hamburg because that is the area the fixtures
cover.

The other three specs need neither tiles nor rendering: the render key is stable
and order-independent, coalescing runs once for concurrent callers and does not
memoize failures, and the image response returns `304` for a matching validator
and `200` otherwise.

`vitest.config.ts` has to override the JSX setting, because Vite reads it from
`tsconfig.json` and Next requires `preserve` there.

## Checking the caching by hand

```sh
rm -rf examples/nextjs/.cache

# Eight at once on a cold cache: one render, seven waiters.
for i in $(seq 1 8); do
  curl -s -o /dev/null localhost:3000/api/store-map/hamburg-mitte/v1-2026-01-14.png &
done; wait

# immutable, and an ETag that answers the next conditional request.
curl -sI localhost:3000/api/store-map/hamburg-mitte/v1-2026-01-14.png
```

The server logs one line per request saying whether it rendered or read from the
store.
