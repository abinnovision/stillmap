# Fonts

`Inter.ttf` is the variable Inter from Google Fonts (`ofl/inter`), SIL Open Font
License 1.1. The licence text is in `Inter-LICENSE.txt`.

Two things to know before swapping it:

- **It is a variable font, and resvg renders it at its default instance.**
  `font-weight` in the SVG does not select a position on the weight axis, so the
  example's label weights all draw the same. Real weight variation needs
  separate static font files, one per weight.
- **Do not substitute a `.woff2`.** resvg accepts a web font path without
  erroring and then draws no text at all. `assertFontsExist` rejects those
  formats for exactly this reason.
