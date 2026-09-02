# stillmap

Server-side map rendering for TypeScript with a React-shaped API.

The design and its rationale live in `.superpowers/specs/`, which is deliberately
not committed: it records how the code came to be, not how to use it. If you have
a copy locally, read it before changing any public type. If you do not, the rules
below are the parts that must hold regardless.

## Layout

| Path                | Contents                                                        |
| ------------------- | --------------------------------------------------------------- |
| `packages/core`     | Engine. No React, no native dependency. Owns every shared type. |
| `packages/sources`  | Tile sources and schema adapters.                               |
| `packages/react`    | JSX declaration API and `renderMap()`.                          |
| `packages/styles`   | Ready-made styles and their palettes. JSX only.                 |
| `packages/cli`      | `stillmap dev`, the preview server. Bundles with esbuild.       |
| `packages/tsconfig` | Private shared TypeScript base. Never published.                |
| `examples/basic`    | Runnable example and golden-image regression suite.             |
| `examples/nextjs`   | Next.js app serving cached renders over HTTP.                   |

Dependencies run one way only. `cli` and `styles` both sit on top of
`react`, which sits on `sources`, which sits on `core`. Nothing below ever
imports something above it, and `cli` and `styles` never import each other.

## Commands

| Command                                       | Effect                             |
| --------------------------------------------- | ---------------------------------- |
| `yarn install`                                | Install. Never use npm or pnpm.    |
| `yarn build`                                  | Build every package through turbo. |
| `yarn check`                                  | Format, lint, and typecheck.       |
| `yarn fix`                                    | Auto-fix formatting and lint.      |
| `yarn test-unit`                              | Every unit test, with coverage.    |
| `yarn workspace @stillmap/core run test-unit` | One package only.                  |

Requires corepack (`corepack enable`) so `yarn` resolves to the 4.18.0 pinned in
`packageManager`.

## Rules

- ESM only. Every package sets `"type": "module"`.
- Relative imports inside `packages/*` carry a `.js` extension, because `module`
  is `nodenext`. `examples/*` is the exception: it runs straight from source
  under Node's type stripping, which resolves specifiers literally, so it sets
  `allowImportingTsExtensions` and imports `.ts`. `examples/nextjs` is a further
  exception in the other direction: it runs under a bundler rather than type
  stripping, so it uses `moduleResolution: "bundler"`, `jsx: "preserve"`, and
  extensionless imports. Every strictness flag in the shared base still applies.
- The shared base sets `"types": ["node"]` explicitly. TypeScript 6 does not
  auto-discover `@types` hoisted to the workspace root, and naming the types
  keeps the ambient surface deterministic. Every package lists `@types/node`.
- Tabs, 80 columns. Prettier is authoritative; run `yarn fix` rather than
  arguing with it.
- Conventional Commits. Never add `Co-Authored-By` trailers or mention tooling in
  commit messages or pull request bodies. Note that
  `@abinnovision/commitlint-config` enforces `type-enum` but not `type-empty` or
  `subject-empty`, so a message with no type at all passes locally.
- Public types are `readonly` throughout and live in `@stillmap/core`.
  Discriminated unions use a `kind` field.
- No enums. `isolatedModules` is on and enums do not tree-shake.
- Attribution is structural. There is no way to disable it, and no API should
  ever add one.
- Fonts are passed as file paths, never buffers: resvg's musl build accepts
  `fontBuffers` and silently ignores them.
- Never add a network call to a unit test. Tile fixtures live in
  `packages/core/test/fixtures/`.
- `.yarnrc.yml` pins the `abinnovision` scope to npmjs.org. That entry is about
  consuming the shared config packages, not publishing; removing it breaks
  `yarn install` for anyone whose global yarnrc routes the scope elsewhere.
