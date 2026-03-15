# png2snes

CLI for turning indexed PNGs into SNES-ready assets.

Portuguese version: [README.md](README.md)

## What the tool does

`png2snes` converts indexed images into files commonly used in SNES BG and sprite workflows:

- `.chr` tile data in SNES format
- `.map` files for backgrounds and scenes
- `.pal` palettes in BGR555
- `.gpl` palette previews
- `*-tileset.png` visual previews for BG tilesets

It also centralizes the helper tasks around that pipeline:

- frame sequence conversion
- background part combining
- PNG sheet splitting
- BG priority map generation
- hex color conversion to SNES
- `.map` analysis

## When to use it

Use `png2snes` when you need to:

- convert an indexed PNG into BG or sprite assets
- generate assets from a frame-by-frame animation
- assemble a large scene from multiple parts
- review VRAM layout suggestions for BG1/BG2
- run helper tasks without remembering separate scripts

## Installation

```bash
npm install
```

To test locally inside the repository:

```bash
node bin/png2snes.js
```

To use `png2snes` directly from your shell:

```bash
npm link
```

## Quick start

With no arguments, the CLI opens an interactive menu:

```bash
node bin/png2snes.js
```

This is the simplest mode for manual use. It asks for natural inputs such as:

- a PNG file
- a MAP file
- a folder
- a hex color

Whenever possible, the CLI tries to infer:

- directory
- stem/base name
- frame sequence
- related parts
- associated files for priority and analysis

## Main subcommands

### Convert a PNG to SNES assets

```bash
png2snes convert to-convert/tomb-bg2-final.png
```

### Convert a frame sequence

```bash
png2snes sequence to-convert/tomb-anim-01.png
```

### Combine scene parts

```bash
png2snes combine to-convert/tomb-bg2-part1.png
```

### Split a PNG into multiple frames

```bash
png2snes split to-convert/tomb-anim-sheet.png --name tomb-anim --sepIndex 0
```

### Apply BG priority

```bash
png2snes priority to-convert/converted/tomb-bg2-final.png
```

### Convert a color to SNES

```bash
png2snes color ad1808
```

### Analyze a MAP file

```bash
png2snes analyze-map to-convert/converted/tomb-bg2-final.map
```

### Show examples

```bash
png2snes examples
```

## Interactive mode

The interactive menu covers these flows:

1. Convert PNG to SNES
2. Convert animation from a frame sequence
3. Combine parts of a PNG/scene
4. Split a PNG into multiple frames
5. Apply BG priority
6. Convert color to SNES
7. Analyze MAP file
8. Show command examples
9. Exit

During those flows, the hub tries to:

- validate basic inputs before execution
- show previews when it detects multiple files
- print a short summary before running
- print the equivalent command at the end

## Conversion options

These options apply to `convert`, `sequence`, and the legacy root flow:

- `--tipo bg|sprite`
- `--bpp 2|4|8`
- `--modo 1|3|7`
- `--tile-size 8x8|16x16`
- `--sprite-sizes <sizes>`
- `--dedupe none|simple|h|v|full`
- `--bg-pal-base 0..7`
- `--paleta <file>`
- `--debug-map`
- `--out-dir <dir>`
- `--no-interactive`
- `--no-print-vram-layout`

## Compatibility

Legacy commands are still supported:

```bash
png2snes to-convert/tomb-bg2-final.png
node bin/png2snes.js --sequence --dir to-convert --stem tomb-anim
npm run color2snes -- ad1808
npm run bg-priority -- --dir to-convert/converted --stem tomb-bg2-final
npm run png-combine -- to-convert/tomb-bg2-part*.png
npm run png-split -- --dir to-convert --stem tomb-anim --name tomb-anim --sepIndex 0
```

Helper scripts are still available through `npm run`:

```bash
npm run analyze-map -- <file.map>
npm run bg-priority -- --dir <dir> --stem <stem>
npm run png-combine -- <arquivos...>
npm run png-split -- --dir <dir> --stem <stem> --sepIndex 0
npm run color2snes -- ad1808
```

## Output and notes

- Main conversion writes output into `converted/`
- For 4bpp BG, provide `--bg-pal-base`
- For sprites, the flow forces `dedupe none`
- For BG files named with `bg1` and `bg2`, the helper prints a suggested VRAM layout

## Structure

- `bin/png2snes.js`: main CLI entry point
- `src/`: conversion core and orchestration
- `tools/`: legacy helper tools
- `scripts/`: simple support scripts
