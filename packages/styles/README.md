# @stillmap/styles

Three ready-made styles for stillmap, each with a palette you can recolour.

```tsx
import { Neutral, NEUTRAL } from "@stillmap/styles";

<Map background={NEUTRAL.chrome.background} {...rest}>
  <Font family="Inter" file={inter} />
  <Neutral />
  <Pin position={position} fill={NEUTRAL.chrome.marker} />
  <Attribution placement="bottom-right" />
</Map>;
```

`Neutral` is a quiet warm grey that stays out of the way of an overlay. `Light`
and `Dark` share an inverted-contrast structure where the road network is
painted lighter than the ground and reads as negative space.

A style draws layers and place labels, and nothing else. The background beneath
the tiles and the colour of your markers are not its to draw, so it publishes
them on its palette under `chrome` and you wire them up. It also never names a
font family, which lets the labels adopt whichever font the map declares.

Every style takes a partial `palette`; anything you leave out keeps the
preset's value.

```tsx
<Light palette={{ geometry: { water: "#CFE3F0" } }} />
```

A style is still just a component. If none of the three fits, write your own;
see [styles](../../docs/styles.md).

## Documentation

- [Styles](../../docs/styles.md)
- [Fonts](../../docs/fonts.md)

## License

Apache-2.0
