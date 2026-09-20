# Skeleton component library

A React + TypeScript playground for expressive skeleton loading components.

## Development

```sh
nvm use
npm install
npm run dev
```

Node 24 is selected by `.nvmrc`. Vite requires Node 22.12+ or a supported newer release.

```sh
npm run build
npm run lint
npm run preview
```

## Components

Tailwind CSS v4 uses the Vite plugin. shadcn/ui is initialized with the Radix Nova style, neutral CSS theme variables, and `@/*` imports resolving to `src/*`.

```sh
npx shadcn@latest add dialog
```

- `src/components/ui/`: shadcn components (Button, Card, Skeleton).
- `src/lib/utils.ts`: `cn()` for merging Tailwind classes.
- `src/index.css`: Tailwind imports and theme tokens.
- `src/App.tsx`: interactive gallery and code/documentation dialogs.
- `src/components/skeletons/animated-skeleton.tsx`: reusable typed component with variant, duration, paused, className, and style props.
- `src/components/skeletons/skeleton.css`: animations, CSS color overrides, and reduced-motion support.

The dark Still gallery includes shimmer, pulse, dither, pixel, wave, scanline, and ascii animations. Filter styles, switch between product, article, video, stats, social card, profile, and text layouts, change speed, pause motion, and copy component source and CSS. Wave is a CSS shader-inspired effect, not WebGL. This is a development app, not yet a published npm package or shadcn registry.

## Project skills

Installed for Codex in `.agents/skills/`, with sources tracked in `skills-lock.json`:

- emil-design-eng
- make-interfaces-feel-better
- 12-principles-of-animation
- fixing-accessibility
- shadcn

## Setup references

- https://ui.shadcn.com/docs/installation/vite
- https://tailwindcss.com/docs/installation/using-vite

## Content transitions

Wrap your skeleton and resolved content in `SkeletonReveal`, driven by your loading state. Both layers share a CSS grid cell to reserve space. Revealing clears the skeleton itself instead of crossing one layer over another: every skeleton element animates over its own whole area, in the character of its variant, and uncovers the content waiting underneath. Dither, pixel, scanline, and ascii drop the cells they are already animating — ordered, scattered, row by row, and in reading order — with no new cells drawn: their loop holds still for the length of the reveal, so cells only ever leave, and the reverse only ever returns them; shimmer wipes along the diagonal its highlight travels, wave clears on the turn of its conic sweep, and pulse dims and settles back. The reveal runs over `duration` seconds, 0.7 by default, on a curve that answers the click at once and then carries the middle, since a thinning field of cells reads as nearly empty well before the last of them goes. Textures paint every frame while a reveal runs instead of at the stepped 24fps of their idle loop, and starting one rebuilds nothing, so the motion does not hitch. Match content dimensions to the skeleton for stable layout when real data arrives. Hidden content is inert and excluded from accessibility navigation. Reduced-motion users get an immediate swap. The gallery’s Reveal content button demonstrates all seven layouts.

Dither uses a Canvas 2D renderer with a Bayer 4×4 ordered threshold matrix and a four-level palette (transparent, #292929, #6e6e6e, #fcfcfc). A moving tonal field changes individual square cells at 24fps; no opacity mask or sliding dot texture is used. Rendering pauses offscreen, in hidden tabs, when revealed, and for reduced motion.

Cell density is configurable on `AnimatedSkeleton` and `SkeletonCard`: `density="fine"` (2px cells), `"medium"` (3px), or `"coarse"` (6px). Left unset, Pixel takes coarse — it reads as squares rather than as tone — and the rest take medium. Ascii keeps the same three names on its own, coarser scale (3px, 5px, and 8px wide, each cell 1.75× as tall as it is wide), since a glyph has to stay readable as a glyph. The gallery control updates every preview and the copied usage example.

Pixel, Scanline, and Ascii now share the cell renderer with Dither. Pixel uses a stepped wave to switch individual cells, each lighting once per pass with a brightness set by how far past its own threshold it is, so none sit dead and the crest stays speckled; Scanline lights discrete rows with a trailing signal. Ascii fills each cell with a monospace glyph instead of a square, reading a diagonal swell straight off a four-level ramp (` `, `.':,`, `+=*ox`, `#%@&`) with per-cell jitter so edges mix weights rather than banding into stripes of one character; a cell keeps its column in the ramp for as long as it lives, so brightening moves it up the set it already sits in. Its grid rounds to whole characters and spaces them across the block — a half-drawn square still reads as texture, half a glyph reads as a mistake — and it clears in reading order, left to right and line by line, like text being deleted. All four support fine/medium/coarse density, transparent gaps, pause, speed, reduced motion, and offscreen suspension. Shimmer, Pulse, and Wave intentionally remain smooth CSS effects.
