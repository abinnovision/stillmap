# Header assets

`header.png` is the image at the top of the root README. It is composed, not
drawn: the right half is a real stillmap render, and the left half is the API
that produces that kind of map.

| File             | What it is                                              |
| ---------------- | ------------------------------------------------------- |
| `header.html`    | The composition. 1200x420, captured at 2x.              |
| `header-map.png` | The map half, rendered by the example at 660x420.       |
| `header.png`     | The captured result. This is what the README points at. |

## Regenerating

The map comes from the example, against live tiles:

```sh
yarn workspace @stillmap-examples/basic run start
cp examples/basic/out/banner.png assets/header-map.png
```

The composition is captured with headless Chrome, which loads Inter and
JetBrains Mono from Google Fonts:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1200,420 \
  --virtual-time-budget=10000 \
  --screenshot="$PWD/assets/header.png" \
  "file://$PWD/assets/header.html"
```

Tiles come over the network, so a regeneration years from now will differ
slightly as the underlying OpenStreetMap data moves. The committed PNG is the
artifact; the source above is how it was made.

## Colours

Nothing in the composition is chosen separately from the renders. The ground is
the map background `#F5F5F3`, the prose grey is the label colour `#6E6E68`, and
the two syntax colours are the locator pin `#9DB59D` and the Brussels pin
`#668CAA`, each darkened enough to carry text at 4.5:1.
