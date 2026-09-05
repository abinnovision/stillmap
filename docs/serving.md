# Serving over HTTP

`@stillmap/serve` turns a map into a route. It handles the caching, keying and
headers; you supply the templates and decide where rendered bytes live.

It depends on no web framework, because it does not need one. A handler is Web
`Request` in, `Response` out, which is already the shape of a Next route
handler, a Hono route, a Bun server and a Deno server.

## The whole wiring

```ts
// app/api/map/route.ts        (Next)
export const GET = maps.fetch;
```

```ts
// Hono
app.get("/api/map", (context) => maps.fetch(context.req.raw));

// Bun
Bun.serve({ fetch: maps.fetch });

// Deno
Deno.serve(maps.fetch);
```

Express and Fastify predate the Fetch API, so they need the usual
`Request`/`Response` bridge; nothing in this package is involved in that.

`examples/nextjs` is a complete application built this way.

## Templates

A template is a named map you are willing to render. It reads the query itself:
there is no schema to declare and nothing to keep in step with your pages.

```tsx
defineTemplate({
  version: (query) => lookup(query).updatedAt,
  render: ({ query, source, fonts }) => (
    <Map
      source={source}
      center={[readNumber(query, "lng"), readNumber(query, "lat")]}
      width={readNumber(query, "w", { min: 1, max: 1600 })}
      height={readNumber(query, "h", { min: 1, max: 900 })}
      zoom={13}
    >
      {fonts.map((font) => (
        <Font key={font.family} {...font} />
      ))}
      <Neutral />
    </Map>
  ),
});
```

| Field     | Purpose                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `render`  | The element. Receives the query, and the server's shared source and fonts. |
| `version` | Your data's own version. What makes an immutable response honest.          |
| `format`  | `"png"` (default) or `"svg"`.                                              |
| `scale`   | Device pixel ratio. Default 2.                                             |

That is the whole contract. Dimensions, ids, colours and anything else are
ordinary query parameters that `render` reads.

`render` is handed the server's `source` and `fonts` rather than reaching for
its own. That is what keeps one memoised tile source shared across every
template, and it is why a template is testable by calling `renderMap` on the
same element with a fixture source.

### Reading the query

Throwing is how a template rejects. `invalidParams()` gives a 400 and
`notFound()` a 404, and both messages reach the client, so write them for the
caller.

```ts
readString(query, "id"); // required, or a 400
readNumber(query, "w", { min: 1, max: 1600, integer: true }); // clamped
readViewport(query, { maxWidth: 1200, maxZoom: 17 }); // lng, lat, zoom, width, height
clamp(value, low, high);
```

**Bound anything that decides how much work the server does.** A signature
proves who minted a URL, not that the code minting it was right: a bug that puts
user input into `maps.url()` signs the attack faithfully. `readNumber` takes
bounds and `readViewport` applies them for the whole viewport, so the bounded
call is the short one. An unbounded `w` is an unbounded rasterisation.

### `version` is the one thing that cannot live in `render`

The comparison has to happen before anything is rendered, so that a URL claiming
a stale version gets a redirect instead of current pixels under an immutable
URL. A render function cannot express that, because by the time it runs the
decision is already made.

Two obligations come with it. It must be a **pure function of the parameters it
is given** — which never include `t`, `v`, `e` or `sig` — because minting and
checking both call it and a disagreement means a redirect loop. And it runs on
**every request, ahead of the ETag check**, so if your data lives in a database
this should be a cache lookup rather than a query.

It is also the natural place to look your data up, which makes it the cheapest
place to reject:

```ts
version: (query) => {
	const store = findStore(readString(query, "id"));

	if (store === undefined) {
		throw notFound("Unknown store");
	}

	return store.updatedAt;
},
```

## Signing

Every URL is signed. A template reads the query directly, so nothing else
validates it: the signature is what makes "these parameters came from my own
code" true.

```ts
signing: { secret: process.env["STILLMAP_SECRET"] ?? "" },
```

`createMapServer` throws at construction on an empty secret rather than signing
with it and looking like it worked.

### Rotating the secret

Pass several. The first signs, any of them verifies, so a new secret can be
deployed everywhere before the old one is dropped:

```ts
signing: { secret: [process.env["STILLMAP_SECRET_NEW"], process.env["STILLMAP_SECRET"]] },
```

Without the overlap, rotating rejects every URL already sitting in a rendered
page, an email or a CDN, all at once. Render keys are unaffected either way: the
signature is excluded from the canonical query.

### What this replaces

An endpoint that reads `center`, `zoom`, `width` and `height` off the query
string without a signature is an open render proxy:

- Arbitrary dimensions let anyone decide how much CPU your server spends. resvg
  rasterising 8000x8000 is not a small request.
- An arbitrary viewport makes the cache key space unbounded, so the hit rate
  collapses and every request is a cold render.
- Anyone who finds the URL can point an `<img>` at it and drain your tile quota.
  See [tile sources](./tile-sources.md) on why that matters for a free provider.

A parameter schema closes those by enumerating what is allowed. A signature
closes them by establishing who asked. The second is one mechanism instead of
one per template, and it does not have to be kept in step with your pages.

### What it costs

- `maps.url()` is the only way to produce a working URL. That is the point, but
  it does mean no hand-written URLs, in a browser bar or a test fixture.
- A secret in every environment, including local development.
- Rotating the secret without an overlap window 403s every URL already embedded
  in a page, an email or a CDN. Pass an array to avoid that. Render keys survive
  either way: the signature is excluded from `canonicalQuery`.
- A well-formed URL for something that does not exist cannot be minted at all,
  because `version` runs during `maps.url()`. The 404 moves forward in time, to
  the page that tried to link to it. The one that still reaches the handler is a
  URL signed while the thing existed and fetched after it was deleted.

## URLs

`maps.url()` is the other half of `maps.fetch`, sharing one configuration so the
two cannot drift, and the only way to produce a URL the handler will answer.

```tsx
<img src={await maps.url("store", { id: store.id, w: 600, h: 300 })} />
```

It is asynchronous because `version` may have to look your data up. Parameters
are sorted, so one map is always one URL string and never two entries in a CDN.
Pass `base` to get an absolute URL.

URLs are query-only: `?t=store&id=42&w=600&h=300&v=…&sig=…`. That is the direct
consequence of being framework-neutral, since the handler has to work at
whatever path you mounted it on without being told where that is.
`Cache-Control: immutable` is still correct, because the cache key is the whole
URL including its query string.

Three parameter names are reserved: `t` for the template, `v` for the version
and `sig` for the signature.

## What gets cached, and what each layer is worth

### The URL carries a version

```
Cache-Control: public, max-age=31536000, immutable
ETag: "<the render key>"
```

Because the URL changes when the map changes, the response never has to expire.
Browsers, CDNs and proxies hit without revalidating.

A request carrying an outdated version is answered with a **308 to the current
URL**, re-signed on the way out, rather than with current pixels. An immutable
response that lies is worse than a redirect.

A template with no `version` gets the honest fallback instead:

```
public, max-age=0, s-maxage=86400, stale-while-revalidate=604800
```

A shared cache then serves for a day and revalidates in the background. Tune it
with `maxAge`.

### The ETag comes from the render key

This is the single most useful thing in the package. The key is the URL, minus
the signature, so it is known before anything is rendered, which means a
conditional request is answered with a 304 without opening the store, calling
`renderMap` or fetching a tile.

Because the key is the URL and nothing else, anything a template decides in code
rather than reading from the query is invisible to it. That is what `epoch` is
for.

### An output store

Two methods. `get` returns bytes or `null`; `set` stores them. Keys arrive with
a file extension, so an implementation can infer a content type.

### In-flight coalescing, and a bound on the rest

Coalescing handles **many requests for one map**: eight concurrent requests for
one cold key produce one render and seven waiters. It is not a cache, the entry
is dropped as soon as the promise settles including on rejection, and it is
per-process.

It does nothing for **many requests for many maps**, which is what a CDN purge
or an epoch bump actually produces. Rasterising is a synchronous native call, so
each render blocks the event loop and holds a full pixmap; unbounded, a burst of
cold keys is an outage rather than a slow page. `maxConcurrentRenders` (default 4) bounds it, and requests above the bound wait rather than fail.

Signed URLs do not help here. They are in your page source, so anyone can
collect them; signing bounds which renders are _possible_, and only the cache
and this bound limit how much work is _done_. Note that `store` defaults to no
caching at all, which is fine for trying the package out and is an unbounded
render proxy in production.

### An incomplete map is never cached

A tile that cannot be fetched becomes a `TILE_FETCH_FAILED` warning and an empty
tile, not an error, so the render succeeds and produces a valid image of not
much. Caching that behind an immutable URL would make one transient 502
permanent. So a degraded render is served with `no-store` and not written to the
store, and `onRender` reports `degraded: true`.

For the same reason the render is not bound to the requesting client's
`AbortSignal`: the work is shared with every waiter on that key, so one browser
cancelling a lazily-loaded image must not fail the others, and hanging up
mid-render must not be a way to poison a cold key.

### Opening the source is not free

`openFreeMap()` resolves its TileJSON over HTTP, and the engine opens the source
once per render, so an uncached source puts a network round trip in front of
every cold render. `memoizedSource()` memoises the opened handle for an hour and
leaves tile fetching alone. The TTL is what keeps a provider's URL rotation
working as cache invalidation: short next to a rotation, long next to a request.

### The tile cache you get for free

`@stillmap/core` keeps a process-wide 150-entry LRU of tiles. On a long-lived
server that is genuinely useful and costs nothing. On serverless it is close to
worthless, because every cold instance starts empty. You cannot size, clear or
scope it. With the output cached, tiles are only fetched on a cold key.

### Bump the epoch when anything in code changes

`epoch` is the one piece of discipline the package cannot take from you. A
template's layers, its style and its fonts decide the bytes without appearing in
the URL, so they can never invalidate themselves.

The epoch **is** in the URL, as `e`. That is the whole point of it: a bump
changes every minted URL, your pages emit the new ones, and the `immutable`
entries under the old URLs are simply never requested again. An epoch that lived
only in the render key would invalidate this server's own store and nothing
else, leaving every browser and CDN holding the old map for a year.

What it still cannot do is reach a URL that has already been delivered. Anything
served `immutable` is beyond recall; the bump changes what you hand out next.
(`format` and `scale` are the exception: they are folded into the render key
directly, so switching one does not need an epoch bump.)

## Choosing a store

| Runtime                      | Store                                    |
| ---------------------------- | ---------------------------------------- |
| Container, VM, long-lived    | `fileStore(dir)`                         |
| Vercel Node runtime, Lambda  | Your own, over Redis, S3 or a blob store |
| Deno Deploy                  | `cacheStore()`                           |
| Cloudflare Workers, SVG only | `cacheStore()`                           |
| Measuring what caching buys  | `nullStore()`                            |

`fileStore` writes with a rename, so a reader never sees half a file. It is
wrong for serverless, where the disk is ephemeral and per-instance.

**`cacheStore()` is narrower than it looks.** PNG output needs
`@resvg/resvg-js`, which is a native addon and cannot load in an edge isolate,
and edge isolates are most of what provides a `caches` global. So Cloudflare
Workers has the store but cannot render PNG; Vercel's Node runtime and a plain
Lambda can render PNG but have no `caches`. The combinations that work are Deno
Deploy, SVG-only rendering on a worker runtime, and any environment running a
Cache API shim over something durable. `cacheStore()` throws at construction
where there is no Cache API, rather than reporting a miss on every request for
the life of the process.

Anything else is two methods:

```ts
const redisStore = (client: Redis): OutputStore => ({
  get: async (key) => {
    const value = await client.getBuffer(key);

    return value === null ? null : new Uint8Array(value);
  },
  set: async (key, value) => {
    await client.set(key, Buffer.from(value), "EX", 60 * 60 * 24 * 30);
  },
});
```

## Next.js

Three things are not optional, and all three are about the native addon and the
fonts rather than about this package.

```ts
// next.config.ts
export default {
  /*
   * resvg is a native `.node` addon that selects a per-platform package
   * through a runtime require, which does not survive bundling. The failure is
   * disguised: core catches the import error and reports
   * PNG_BACKEND_MISSING, which reads as "install @resvg/resvg-js" even though
   * you have. If you see that on a deployed Next app, this is why.
   */
  serverExternalPackages: ["@resvg/resvg-js"],

  /* The workspace root, if a package manager hoists @resvg/* out of the app. */
  outputFileTracingRoot: join(import.meta.dirname, "../.."),

  /* Fonts are read from disk by path, so the files have to reach the server. */
  outputFileTracingIncludes: { "/api/**": ["./src/assets/**"] },
};
```

Fonts must be resolved from `process.cwd()`, not from `import.meta.url`:
Turbopack rewrites a computed `new URL(…, import.meta.url)` to its own emitted
asset and collapses every such reference to whichever one it emitted first,
which shows up as a map with no labels. [Fonts](./fonts.md) covers this in full.

The Node runtime is mandatory and implicit. Nothing declares
`export const runtime`, because `nodejs` is the default and it is the only
option: a native addon cannot load in an edge isolate and fonts are read from
disk by path.

No Next caching primitive is involved. The handler is dynamic and sets its own
headers, which is deliberate: `unstable_cache` and `"use cache"` serialise a
`Buffer` through the incremental cache, `dynamic = "force-static"` makes
`headers()` empty so there are no 304s, `revalidate` only affects Next's
instrumented `fetch`, and `next/image` would put a second cache with its own TTL
in front of an already-cached URL. `examples/nextjs` documents each in full.

## Observability

`onRender` fires only when a request actually rendered, which is what makes a
hit distinguishable from a miss:

```ts
onRender: (info) =>
	log.info({ key: info.key, ms: info.durationMs, degraded: info.degraded }, "rendered"),
```

`degraded` means a tile could not be fetched, so the map is incomplete and was
deliberately not cached. A steady trickle of it is a tile provider problem.

A quiet log is a cache that is working. `onWarning` receives every
`RenderWarning`, and `onError` every failure that becomes a 500; the response
body never carries the message.

## Status codes

| Code | When                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| 200  | Rendered, or served from the store.                                                        |
| 304  | `If-None-Match` matched, before any work.                                                  |
| 308  | The URL's `v` or `e` is stale. `Location` is relative and `no-store`.                      |
| 400  | A template threw `invalidParams()`.                                                        |
| 403  | The signature is missing, duplicated, or does not verify.                                  |
| 404  | Unknown template, or a template threw `notFound()`. Only reachable with a valid signature. |
| 405  | Not a `GET` or `HEAD`.                                                                     |
| 500  | The render failed. `onError` gets the cause; the client does not.                          |
