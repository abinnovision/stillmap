# Tile fixtures

Vector tiles captured from OpenFreeMap covering central Hamburg, committed so
the test suite never touches the network. OpenFreeMap offers no SLA, and a test
suite that depends on a free public endpoint is a test suite that fails for
reasons unrelated to the code.

These three tiles are exactly the cover for the reference viewport: centre
`[9.9937, 53.5511]`, zoom 13, 1200x300. They were computed from the tile cover,
not guessed. Changing the reference viewport almost certainly changes which
tiles are needed.

| File                            | Tile          |
| ------------------------------- | ------------- |
| `openfreemap-z13-4322-2647.mvt` | z13/4322/2647 |
| `openfreemap-z13-4323-2647.mvt` | z13/4323/2647 |
| `openfreemap-z13-4324-2647.mvt` | z13/4324/2647 |

The centre tile carries 51 water features, 2244 transportation features, and 29
places including Hamburg itself. Note that at this zoom and location the
`transportation` layer contains **no `motorway` or `trunk`** class: the classes
present are `primary`, `secondary`, `tertiary`, `minor`, `service`, `rail`,
`path`, `pier`, `ferry`, and `transit`. Tests that need a visible road must use
a class that is actually there.

Schema is OpenMapTiles. Data is (c) OpenStreetMap contributors, ODbL.

## Refreshing

These are the exact cover for the reference viewport, computed rather than
guessed. Recompute before downloading anything:

```bash
node -e "
const TILE=512;
const c=(lng,lat,z)=>{const s=TILE*2**z,r=lat*Math.PI/180;
  return {x:((lng+180)/360)*s,y:((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2)*s};};
const p=c(9.9937,53.5511,13), w=1200, h=300;
for(let y=Math.floor((p.y-h/2)/TILE);y<=Math.floor((p.y+h/2-1e-9)/TILE);y++)
  for(let x=Math.floor((p.x-w/2)/TILE);x<=Math.floor((p.x+w/2-1e-9)/TILE);x++)
    console.log('13/'+x+'/'+y);
"
```

Then fetch each one, resolving the template from TileJSON because OpenFreeMap
rotates its tile URL:

```bash
TEMPLATE=$(curl -fsSL https://tiles.openfreemap.org/planet \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).tiles[0]))")
for COORD in "13/4322/2647" "13/4323/2647" "13/4324/2647"; do
  Z=${COORD%%/*}; REST=${COORD#*/}; X=${REST%%/*}; Y=${REST##*/}
  URL=$(printf '%s' "$TEMPLATE" | sed "s|{z}|$Z|; s|{x}|$X|; s|{y}|$Y|")
  curl -fsSL "$URL" -o "openfreemap-z$Z-$X-$Y.mvt"
done
```

Getting the coordinates wrong does not fail loudly: the fixture source returns
`null` for an unknown tile exactly as an ocean tile would, so every test still
passes and the goldens silently render as an empty background.

Refreshing invalidates the golden SVGs. Regenerate them with
`UPDATE_GOLDEN=1 yarn test-unit`, then **rasterise and look at them**. Reading
the markup is not enough: an empty render is a few hundred bytes of valid SVG
and looks fine in a diff.
