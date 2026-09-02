# stillmap demo

A runnable playground. It installs the published `@stillmap/*` packages from
npm rather than the workspace in this repository, so it shows exactly what you
get from `npm install`.

```sh
npm install
npm run dev
```

That serves the preview on <http://localhost:3000>. Edit a file under `maps/`
and the browser re-renders on save. The watcher only sees `maps/`, so a change
to the shared palette in `src/` needs a manual refresh.

## Layout

| Path            | Contents                                                |
| --------------- | ------------------------------------------------------- |
| `maps/`         | One map per file. Each default-exports a component.     |
| `src/style.tsx` | The shared palette. A style is just a component.        |
| `src/assets.ts` | Resolves the font path. Fonts are paths, never buffers. |
| `assets/`       | Inter, under the SIL Open Font License.                 |

Anything you add to `maps/` shows up in the sidebar. Files named `*.spec.tsx`
or `*.test.tsx` are skipped.

## Notes

- Tiles come live from OpenFreeMap. No API key, no account, and the first
  render of a new area is slow while tiles are fetched.
- Use relative imports inside `maps/`. The previewer pins its own JSX runtime
  and does not read TypeScript path aliases.
- PNG is the default view because a bare SVG resolves fonts against whatever
  the browser has installed, which hides exactly the failures worth seeing.

This folder is deliberately outside the Yarn workspace at the repository root,
and uses npm, so that it installs standalone.
