# GeoJSON

Tiles are not the only thing a map can draw. Pass your own GeoJSON, such as a
district outline or a route, and stillmap paints it with the same rules as tile
features.

```tsx
import { Attribution, Font, GeoJson, Map, renderMap } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Light } from "@stillmap/styles";

const { png } = await renderMap(
  <Map source={openFreeMap()} width={1200} height={630} fit="data" padding={40}>
    <Font family="Inter" file="./Inter.ttf" />
    <Light
      belowRoads={
        <GeoJson
          data={cityCentre}
          fill="#F2E3C6"
          stroke="#C9A66B"
          width={1.5}
        />
      }
    />
    <Attribution />
  </Map>,
  { format: "png" },
);
```

`data` takes a `FeatureCollection`, a single `Feature`, or a bare geometry.
Objects typed with `@types/geojson` are accepted as they are.

## What gets drawn

`<GeoJson>` draws polygons filled when `fill` is set, and lines and polygon
outlines stroked when `stroke` is set. A paint rule is a fill or a line, never
both, so the two are separate layers. `filter`, `minZoom` and `maxZoom` apply to
both, and a filter sees each feature's string, number and boolean properties.

Point and MultiPoint features become pins. Style them with `pin`, or pass
`pin={false}` to draw none. Pins are markers, so like every marker they paint
above the map and reserve their box against labels.

The primitives work on their own too, when you only need one of the two:

```tsx
<Fill data={district} fill="#F2E3C6" />
<Line data={route} stroke="#B4533F" width={3} />
```

A feature that cannot be drawn, such as a ring with fewer than four positions or
a coordinate that is not a number, is skipped with a `GEOJSON_INVALID` warning.
Ring winding does not matter: holes are cut either way.

## Painting under the streets

Document order is paint order, and a ready-made style is one element, so
anything declared after it paints over its roads. There are two ways under.

The styles have slots. `belowRoads` paints just below the first road layer and
`belowBuildings` just below the buildings:

```tsx
<Neutral belowRoads={<GeoJson data={district} fill="#E9E1D3" />} />
```

Any layer, including one under a hand-written style, also takes `below`. It
names a canonical kind, and the layer moves to just before the first layer of
that kind, wherever it was declared:

```tsx
<MyStyle />
<GeoJson data={district} fill="#E9E1D3" below="road" />
```

Several layers on one anchor keep their document order. If no layer of that
kind exists, the layer stays where it is and a `LAYER_ANCHOR_MISSING` warning is
raised. Labels and markers always paint on top.

## Fitting the view

`fit="data"` fits every marker and every GeoJSON layer in the tree. It ignores
zoom ranges, because the zoom is what is being worked out. With nothing to fit
it throws `FIT_WITHOUT_DATA`.

## Caching

`@stillmap/serve` keys a render on its URL. GeoJSON that a template builds in
code is invisible to that key, so when the data changes, bump the `epoch` or
derive the data from the query. See [serving](./serving.md).
