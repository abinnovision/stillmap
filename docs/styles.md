# Styles

A style in stillmap is a component that returns layer and label elements.
`@stillmap/styles` packages three of them, so a map can look finished before
you have picked a single colour.

```sh
yarn add @stillmap/styles
```

## The three

| Export    | Palette   | Reads as                                                 |
| --------- | --------- | -------------------------------------------------------- |
| `Neutral` | `NEUTRAL` | A quiet warm grey. Nothing competes with your overlay.   |
| `Light`   | `LIGHT`   | Pale ground, white roads. The network is negative space. |
| `Dark`    | `DARK`    | The same structure on a near-black ground.               |

```tsx
import { Attribution, Font, Map, Pin, renderMap } from "@stillmap/react";
import { openFreeMap } from "@stillmap/sources";
import { Neutral, NEUTRAL } from "@stillmap/styles";

const { png } = await renderMap(
  <Map
    source={openFreeMap()}
    center={[9.9937, 53.5511]}
    zoom={13}
    width={1200}
    height={300}
    background={NEUTRAL.chrome.background}
  >
    <Font family="Inter" file="./Inter.ttf" />
    <Neutral />
    <Pin position={[9.9937, 53.5511]} fill={NEUTRAL.chrome.marker} />
    <Attribution placement="bottom-right" />
  </Map>,
  { format: "png" },
);
```

## What a style draws, and what it does not

A style draws layers and place labels. It never emits `<Map>`, `<Font>`,
`<Marker>`, `<Pin>` or `<Attribution>`, because none of those are paint: the
first two are the render itself, markers are your data, and attribution is
structural and has to stay where it cannot be detached.

That leaves three colours a style has an opinion about but cannot apply itself.
They live on the palette under `chrome`, and you wire them up:

```tsx
background={DARK.chrome.background}
fill={DARK.chrome.marker}
stroke={DARK.chrome.markerStroke}
```

## Fonts

A style never declares a font, because fonts are file paths and only you know
where yours is. It also does not name a family by default, so the labels adopt
the first `<Font>` the map declares. Pass `fontFamily` only when the map
declares more than one and the labels should use a different one.

PNG output still requires at least one font. See [fonts](./fonts.md).

## Recolouring

Every style takes a partial `palette`. Anything you leave out keeps the
preset's value.

```tsx
<Neutral
  palette={{ geometry: { water: "#CFE3F0" }, chrome: { marker: "#B4533F" } }}
/>
```

The palette has four parts: `name`, `geometry` (what gets painted), `label`
(three tiers, primary is the city and tertiary the neighbourhood) and `chrome`
(the three colours above). `mergePalette` from `@stillmap/core` does the same
merge if you need it yourself.

Two things a recolour cannot change: which layers a style draws, and at which
zooms. `Neutral` draws paths and no road casings; `Light` and `Dark` draw
casings and no paths. If you need different structure, write your own style:

```tsx
const Mine = () => (
  <>
    <Water fill="#DDE6EC" />
    <Road classes="motorway" stroke="#FFFFFF" width={4} />
  </>
);
```

## Turning the labels off

```tsx
<Light labels={false} />
```

The paint stays, the place hierarchy goes. Useful when you want to place your
own labels, or when the map is small enough that any text is noise.
