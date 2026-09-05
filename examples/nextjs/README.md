# stillmap in Next.js

A store finder. Four shops, one map each, rendered on the server and served as
PNGs from a route handler.

The maps are the easy part. What this example is actually about is everything
around them: a render costs real CPU and a burst of tile downloads, so putting
one behind HTTP traffic without a cache in front is how you end up rate-limited
by a tile provider funded on donations.

That work lives in [`@stillmap/serve`](../../docs/serving.md). This example is
what is left once you are using it, which is not much.

```sh
yarn build                                   # from the repository root, first
yarn workspace @stillmap-examples/nextjs dev
```

Then open <http://localhost:3000/stores>.

## The shape

```
src/    plain TypeScript. Nothing here imports `next`.
app/    thin adapters. `route.ts` is one line.
```

That split is deliberate. Every caching, keying and header decision is ordinary
code, so the tests run under vitest without touching Next's compiler, and the
golden test exercises the same component the route does.

```ts
// app/api/map/route.ts
export const GET = maps.fetch;
```

That is the entire route. A Next route handler is Web `Request` in, `Response`
out, and so is `maps.fetch`, so there is nothing to adapt and no Next adapter
package to install. The same `maps` object moves to Fastify or Hono unchanged.

## What this application still owns

`src/maps.tsx` is the only interesting file, and it is one `createMapServer`
call:

- **`version`.** The store's own `updatedAt`. Moving a store changes its URL,
  which is what makes an immutable response safe. It is also where the store is
  looked up, so a URL minted before a store was deleted is a 404 that never
  reaches a render.
- **`render`.** Reads `id`, `w` and `h` off the query. There is no size list,
  because there is nothing to protect: every URL is signed, so the dimensions
  only ever came from the two call sites in `app/`.
- **`signing`.** A fixed secret, because an example is not a deployment.
  Anywhere real this comes from the environment and a missing value should stop
  the process.
- **`epoch`.** Bumped by hand when `src/map/style.tsx` or the label declarations
  in `src/map/store-map.tsx` change. The render key is the URL and map URLs are
  immutable, so nothing decided in code will ever invalidate itself. Forget it
  and every visitor keeps the old map indefinitely.
- **The store.** `fileStore` under `.cache/maps`, which is right for a container
  and wrong for serverless. One line to swap; see
  [serving over HTTP](../../docs/serving.md).

The pages call `maps.url("store", { id, w, h })` and put the result in an
`<img>`. They render no maps themselves, which is what keeps the map work out of
the page's critical path and out of `next build`.

## What `@stillmap/serve` handles

Summarised here; [the documentation](../../docs/serving.md) explains what each
layer is worth.

- Signing, so a template can read the query directly without a parameter schema
  in front of it.
- A versioned URL served `immutable`, and a 308 rather than current pixels when
  the version is stale.
- An ETag derived from the request, so a conditional request is answered with a
  304 before anything is rendered.
- The output store, and in-flight coalescing so eight concurrent requests for
  one cold map produce one render and seven waiters.
- `memoizedSource`, so `openFreeMap()` does not resolve its TileJSON on the
  critical path of every cold render.

`@stillmap/core` also keeps a process-wide 150-entry LRU of tiles, which is
useful on a long-lived server and close to worthless on serverless where every
cold instance starts empty.

## What this example deliberately does not use

No Next caching primitive at all. The handler stays dynamic and sets its own
headers.

| Not used                   | Why                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unstable_cache`           | Replaced by `use cache` in Next 16, and it serializes through the incremental cache, so a `Buffer` round-trips as `{"type":"Buffer","data":[…]}`. The large map here is 430 KB; JSON-encoded that approaches Vercel's 2 MB item limit, above which entries are silently not cached. |
| `"use cache"`              | Needs `cacheComponents: true`, a whole-app opt-in that would turn this into a Cache Components tutorial. Its default handler is an in-memory LRU that Next's own docs say typically does not persist across serverless requests.                                                    |
| `dynamic = "force-static"` | Makes `headers()` return empty, so there is no `If-None-Match` and no 304s, and Next then owns the `Cache-Control` we chose on purpose.                                                                                                                                             |
| `revalidate`               | Only affects Next's instrumented `fetch`. The cost here is resvg and tiles fetched through core's own fetcher.                                                                                                                                                                      |
| `next/image`               | Would route an already-cached URL through the image optimizer, adding a second cache with its own TTL and re-encoding pixels that are already correct. Two caches disagreeing about one image is a support ticket.                                                                  |
| inline SVG                 | An SVG map is around 450 KB. Four inline is a 1.8 MB HTML document that cannot be lazy-loaded or cached apart from the page. Inline SVG earns its place for one map above the fold with `embedFonts: true`; see `docs/fonts.md`.                                                    |

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
and depending on them would make `yarn check` require a build first.

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

The keying, coalescing and response tests live in `@stillmap/serve`, where the
code does.

`vitest.config.ts` has to override the JSX setting, because Vite reads it from
`tsconfig.json` and Next requires `preserve` there.

## Checking the caching by hand

Every URL is signed, so there is no typing one out. Take one from the page:

```sh
rm -rf examples/nextjs/.cache

BASE=localhost:3000
URL="$BASE$(curl -s $BASE/stores |
  grep -o '/api/map?[^"]*' | head -1 | sed 's/&amp;/\&/g')"

# Eight at once on a cold cache: one render, seven waiters.
for i in $(seq 1 8); do curl -s -o /dev/null "$URL" & done; wait

# immutable, and an ETag that answers the next conditional request.
curl -sI "$URL"

# The same ETag back: 304, with nothing rendered.
curl -sI -H 'If-None-Match: "<paste the etag>"' "$URL"

# One character of the signature changed: 403, before the template sees it.
curl -so /dev/null -w '%{http_code}\n' "${URL%?}x"

# A tampered parameter is the same 403, which is what replaces validating it.
curl -so /dev/null -w '%{http_code}\n' "${URL/w=600/w=8000}"
```

The server logs one line per render and nothing per cache hit, so a quiet log is
a cache that is working.
