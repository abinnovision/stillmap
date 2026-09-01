# stillmap

Command line tools for [stillmap](https://github.com/abinnovision/stillmap).

`stillmap dev` watches a directory of map templates and renders them in the
browser, re-rendering on save.

## Install

```sh
yarn add --dev stillmap
```

`@stillmap/react`, `react` and `react-dom` are peer dependencies, so the
previewer renders with the same copies your own code does.

## Usage

```sh
stillmap dev [dir]
```

| Argument or option | Meaning                                           |
| ------------------ | ------------------------------------------------- |
| `dir`              | Directory holding the templates. Default `./maps` |
| `--port <number>`  | Port to listen on. Default `3000`                 |
| `--open`           | Open the preview in the default browser           |
| `-h`, `--help`     | Show usage                                        |
| `-v`, `--version`  | Show the version                                  |

The port steps forward if the one you asked for is taken.

## Templates

A template is a `.tsx` or `.jsx` file whose default export is a component, with
an optional `PreviewProps` supplying its props. Nested directories are found
too, and their templates are listed by path. Dotfiles, `node_modules`, and files
named `*.spec.*` or `*.test.*` are skipped.

The preview rasterises through resvg, so what you see is the PNG the renderer
actually produces. A toggle switches to SVG for reading geometry. Beside the map
it reports the size, the render time, the resolved centre and zoom, and every
warning the render produced.

See [previewing maps](../../docs/preview.md) for how to write a template, what
the panel reports, and where the previewer's limits are.

## License

Apache-2.0
