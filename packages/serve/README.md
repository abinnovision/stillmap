# @stillmap/serve

Serve rendered maps over HTTP.

A render costs real CPU and a burst of tile downloads, so putting one behind
HTTP traffic without a cache in front is how you end up rate-limited by a tile
provider funded on donations. This package is the caching, keying and header
work that sits between a request and `renderMap()`.

It depends on no web framework. A handler is Web `Request` in, `Response` out,
which is what a Next route handler, a Hono route, a Bun server and a Deno server
all already are.

```sh
yarn add @stillmap/serve
```

## Usage

```tsx
import { openFreeMap } from "@stillmap/sources";
import {
  createMapServer,
  defineTemplate,
  fileStore,
  memoizedSource,
  notFound,
  readNumber,
  readString,
} from "@stillmap/serve";

export const maps = createMapServer({
  source: memoizedSource(openFreeMap()),
  store: fileStore(".cache/maps"),
  fonts: [{ family: "Inter", file: INTER }],
  signing: { secret: process.env.STILLMAP_SECRET },
  basePath: "/api/map",

  templates: {
    store: defineTemplate({
      version: (query) => lookup(query).updatedAt,
      render: ({ query, source, fonts }) => (
        <StoreMap
          store={lookup(query)}
          width={readNumber(query, "w", { min: 1, max: 1600 })}
          height={readNumber(query, "h", { min: 1, max: 900 })}
          source={source}
          fonts={fonts}
        />
      ),
    }),
  },
});
```

Mounting it is one line:

```ts
// app/api/map/route.ts
export const GET = maps.fetch;
```

And building a URL is the other half of the same object, so the two can never
disagree about what a map is called:

```tsx
<img src={await maps.url("store", { id: store.id, w: 600, h: 300 })} />
```

## Every URL is signed

A template reads the query itself. There is no schema, no parameter allowlist
and no size list, so the signature is the only thing standing between a URL and
a render: it is what makes "these parameters came from my own code" true.

That is a deliberate trade. Without it, an endpoint that reads dimensions off
the query string is an open render proxy: arbitrary dimensions let anyone decide
how much CPU you spend, an arbitrary viewport makes the cache key space
unbounded so the hit rate collapses, and anyone who finds the URL can point an
`<img>` at it and drain your tile quota. Signing closes all three at once,
without a schema to keep in step with your pages.

What it buys you, and what it costs:

- `maps.url()` becomes the only way to produce a working URL. Hand-written and
  tampered URLs get a 403 before the template sees them.
- A secret is required in every environment. `createMapServer` throws on an
  empty one rather than signing with it.
- Rotating the secret without an overlap 403s every URL already embedded in a
  page, an email or a CDN. `secret` accepts an array — the first signs, any
  verifies — so a rotation need not be a cutover. Render keys survive either
  way: the signature is excluded from the key.
- URLs are no longer hand-constructable, so debugging means copying one out of
  a page rather than typing it.

**Bound anything that decides how much work the server does.** `readNumber`
takes `{ min, max, integer }` and `readViewport` applies bounds across the whole
viewport, so the bounded call is the short one. A signature proves who minted a
URL, not that the code minting it was right: a bug that puts user input into
`maps.url()` signs the attack faithfully.

Signing also does not bound _how often_ a valid URL is fetched — the URLs are in
your page source. `maxConcurrentRenders` (default 4) is what stops a burst of
cold keys from blocking the event loop, and `store` is what stops the work
repeating. `store` defaults to no caching, which is fine for trying this out and
is an unbounded render proxy in production.

## What it caches

Four layers, in the only order that makes sense.

1. **The URL carries a version.** `version(query)` puts your data's own
   timestamp in the URL, so the response can be `immutable` and never
   revalidate. A request carrying a stale version is answered with a 308 to the
   current URL, not with current pixels: an immutable response that lies is
   worse than a redirect.
2. **The ETag comes from the render key, not the bytes.** The key is the URL, so
   it is known before anything is rendered and a conditional request is answered
   with a 304 without opening the store or touching a tile.
3. **An output store.** `fileStore` for a container, `cacheStore` for a Cache
   API runtime, or your own two-method object for Redis, S3 or a blob store.
4. **In-flight coalescing.** Eight concurrent requests for one cold map produce
   one render and seven waiters. Per process, and not a cache: the entry is
   dropped as soon as the promise settles, including on rejection.

Plus `memoizedSource()`, which keeps one opened tile source rather than
resolving TileJSON on the critical path of every cold render.

The render key is the URL and nothing else, so anything a template decides in
code, its layers, its `format`, its `scale`, is invisible to it. Set `epoch` and
bump it when you change any of them, or every visitor keeps the old map
indefinitely.

## What is public

`createMapServer` and `defineTemplate`; the query helpers `readString`,
`readNumber`, `readViewport` and `clamp`; the rejections `invalidParams` and
`notFound`; the stores `fileStore`, `cacheStore` and `nullStore` behind the
`OutputStore` interface; `memoizedSource`; `createCoalescer`; `signQuery` and
`verifyQuery`, for checking a URL somewhere ahead of the handler; and the four
reserved parameter names `TEMPLATE_PARAM`, `VERSION_PARAM`, `EPOCH_PARAM` and
`SIGNATURE_PARAM`.

The render key, the canonical query form and the response builders are not
exported. They are how the handler is built rather than how it is used, and
publishing them would freeze the internals of the request path as API.

Full documentation, including which store to choose per platform and the
Next.js configuration that is not optional, is in
[docs/serving.md](https://github.com/abinnovision/stillmap/blob/main/docs/serving.md).
