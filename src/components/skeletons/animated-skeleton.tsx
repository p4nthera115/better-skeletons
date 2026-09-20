import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ComponentProps, CSSProperties, ReactNode, RefObject } from 'react'
import { cn } from '@/lib/utils'
import './skeleton.css'

export type SkeletonVariant = 'shimmer' | 'pulse' | 'dither' | 'pixel' | 'wave' | 'scanline' | 'ascii'
export type SkeletonDensity = 'fine' | 'medium' | 'coarse'
export type DitherDensity = SkeletonDensity
type CellVariant = 'dither' | 'pixel' | 'scanline' | 'ascii'
const CELL_VARIANTS: CellVariant[] = ['dither', 'pixel', 'scanline', 'ascii']
const CELL_SIZE: Record<SkeletonDensity, number> = { fine: 2, medium: 3, coarse: 6 }
// A glyph has to stay readable as a glyph, so the ascii grid is coarser than a grid of squares,
// and its cells are taller than they are wide, the proportions a monospace character occupies.
const ASCII_CELL_SIZE: Record<SkeletonDensity, number> = { fine: 3, medium: 5, coarse: 8 }
const ASCII_CELL_RATIO = 1.75
const isCellVariant = (variant: SkeletonVariant): variant is CellVariant => (CELL_VARIANTS as SkeletonVariant[]).includes(variant)
// Pixel reads as squares rather than as tone, so it wants the big grid unless asked otherwise.
const densityFor = (variant: SkeletonVariant, density?: SkeletonDensity) => density ?? (variant === 'pixel' ? 'coarse' : 'medium')

export type AnimatedSkeletonProps = ComponentProps<'div'> & {
  variant?: SkeletonVariant
  duration?: number
  density?: DitherDensity
  paused?: boolean
}

// Ordered thresholds, normalized at the center of each of the 16 levels.
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
// The 8x8 matrix resolves four times as many steps, so a ramp quantized with it reads as a
// gradient rather than as bands.
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]
const CELL_PALETTE = ['', '#292929', '#6e6e6e', '#fcfcfc']
/** One set of glyphs per level, ordered by how much ink they put on the cell. A cell keeps its
 * column in the ramp for as long as it lives, so brightening moves it up the set it already sits
 * in rather than reshuffling the characters under a passing wave. */
const ASCII_RAMP = ['', ".':,", '+=*ox', '#%@&']
const ASCII_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const glyphAt = (x: number, y: number, level: number) => {
  const set = ASCII_RAMP[level]
  return set[Math.min(set.length - 1, Math.floor(hashAt(x, y, 3) * set.length))]
}
const bayer = (x: number, y: number) => (BAYER_4[(y % 4) * 4 + (x % 4)] + .5) / 16
const bayer8 = (x: number, y: number) => (BAYER_8[(y % 8) * 8 + (x % 8)] + .5) / 64
/** A cell's fixed place in the scatter, spread evenly over 0..1 and free of the rows, columns and
 * diagonals a small modulus leaves behind. The seed keeps separate uses apart: clearing has to be
 * independent of what the loop lights up, or the cells on screen are the first to go and the
 * skeleton empties in a blink. */
function hashAt(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const noiseAt = (x: number, y: number) => hashAt(x, y, 1)
const clearNoise = (x: number, y: number) => hashAt(x, y, 2)
const drawnSize = (variant: SkeletonVariant, cell: number) => variant === 'pixel' ? Math.max(1, cell - Math.max(1, Math.round(cell / 6))) : cell

function loopLevel(variant: CellVariant, x: number, y: number, cols: number, rows: number, phase: number) {
  if (variant === 'dither') {
    // Quantize a continuous field with ordered Bayer thresholds.
    const tone = .5 + .48 * Math.cos(2 * Math.PI * (x / cols * .65 + y / rows * .35 - phase))
    const scaled = tone * 3
    const lower = Math.floor(scaled)
    return Math.min(3, lower + (scaled - lower > bayer(x, y) ? 1 : 0))
  }
  if (variant === 'pixel') {
    // Fixed pixel locations switch on/off as a stepped wave passes.
    const steppedPhase = Math.floor(phase * 20) / 20
    const wave = .5 + .5 * Math.cos(2 * Math.PI * (x / cols - steppedPhase + y / rows * .18))
    // Thresholds stay under the crest, so every cell lights once per pass and none sit dead.
    // Brightness is how far past its own threshold a cell is, which keeps the crest speckled
    // rather than filling it in as one solid block.
    const strength = wave - (noiseAt(x, y) * .82 + .1)
    return strength <= 0 ? 0 : strength > .42 ? 3 : strength > .18 ? 2 : 1
  }
  if (variant === 'ascii') {
    // A swell crossing the grid, read straight off the glyph ramp. The per-cell jitter is what
    // keeps it from banding into clean stripes of one character, the way hand-set ascii art
    // mixes weights along an edge; the trough drops cells out entirely, so the field breathes.
    const tone = .5 + .5 * Math.cos(2 * Math.PI * (x / cols * .55 + y / rows * .45 - phase))
    return Math.max(0, Math.min(3, Math.round(tone * 3.4 - .35 + (noiseAt(x, y) - .5) * .7)))
  }
  // A scan head lights discrete rows, with a short decaying trail.
  if (y % 2 !== 0) return 0
  const distance = (phase - y / rows + 1) % 1
  const signal = Math.max(0, 1 - distance / .3)
  return signal > .8 ? 3 : signal > .4 ? 2 : signal > .1 || noiseAt(x * 13, y * 7) > .8 ? 1 : 0
}

/** A reveal in progress, read once per frame by the textures inside it. `progress` is 0 while
 * every cell is kept and 1 once they have all cleared. The object never changes identity, so
 * starting one re-renders nothing and rebuilds no observers; textures listen instead. */
type RevealState = { progress: { current: number }; running: { current: boolean }; listeners: Set<() => void> }
const Reveal = createContext<RefObject<RevealState> | null>(null)

/** The order cells leave in, each texture clearing itself the way it animates: dither in an
 * ordered pattern, pixel scattered, scanline row by row, ascii in reading order. Nothing is ever
 * added. */
function clearOrder(variant: CellVariant, x: number, y: number, cols: number, rows: number) {
  if (variant === 'dither') return bayer8(x + 5, y + 3) * .85 + clearNoise(x, y) * .15
  if (variant === 'pixel') return clearNoise(x, y)
  // Glyphs go the way they would be read, left to right and line by line, so the reveal looks
  // like text being deleted. The noise only roughens the edge of that sweep.
  if (variant === 'ascii') return ((y * cols + x) / (rows * cols)) * .92 + clearNoise(x, y) * .08
  return y / rows * .3 + clearNoise(x, y) * .7
}

function TextureCanvas({ duration, paused, density, variant }: { duration: number; paused: boolean; density: SkeletonDensity; variant: CellVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(0)
  const revealRef = useContext(Reveal)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return
    const reveal = revealRef?.current
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let last = 0
    let lastPaint = 0
    let visible = true
    let width = 0
    let height = 0
    let cell = 3
    let cellHeight = 3
    const paint = () => {
      context.clearRect(0, 0, width, height)
      // Squares can run off the edge half-drawn and still read as texture; half a glyph reads as
      // a mistake. So ascii rounds to whole characters and spaces them across the block, and the
      // grid gets a little wider or tighter per block rather than clipping the last one.
      const fitted = variant === 'ascii'
      const cols = Math.max(1, fitted ? Math.round(width / cell) : Math.ceil(width / cell))
      const rows = Math.max(1, fitted ? Math.round(height / cellHeight) : Math.ceil(height / cellHeight))
      const stepX = fitted ? width / cols : cell
      const stepY = fitted ? height / rows : cellHeight
      const size = drawnSize(variant, cell)
      const cleared = reveal?.progress.current ?? 0
      if (variant === 'ascii') {
        // Setting the canvas size resets the context, so the font is restated with every paint.
        context.font = `${(cell / .6).toFixed(2)}px ${ASCII_FONT}`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let level = loopLevel(variant, x, y, cols, rows, phaseRef.current)
          if (level === 0) continue
          if (cleared > 0) {
            const order = clearOrder(variant, x, y, cols, rows)
            if (order < cleared) continue
            // The cells about to go lift a step, so the edge of the reveal stays legible.
            if (order - cleared < .06) level = Math.min(3, level + 1)
          }
          context.fillStyle = CELL_PALETTE[level]
          if (fitted) context.fillText(glyphAt(x, y, level), x * stepX + stepX / 2, y * stepY + stepY / 2)
          else context.fillRect(x * stepX, y * stepY, size, size)
        }
      }
    }
    const tick = (now: number) => {
      // The loop holds still for a reveal. Left running it lights cells that had gone dark, which
      // reads as the skeleton coming back before it clears; a held field only ever loses cells.
      const held = paused || reveal?.running.current || (reveal?.progress.current ?? 0) > 0
      if (last && !held) phaseRef.current = (phaseRef.current + (now - last) / (duration * 1000)) % 1
      last = now
      if (reveal?.running.current || now - lastPaint >= 1000 / 24) { paint(); lastPaint = now }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      last = 0
      paint()
      // A running reveal keeps painting even while paused; a finished one has nothing left to draw.
      const looping = !paused && !motion.matches && visible && !document.hidden && (reveal?.progress.current ?? 0) === 0
      if (reveal?.running.current || looping) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      width = Math.round(canvas.clientWidth * ratio)
      height = Math.round(canvas.clientHeight * ratio)
      cell = Math.max(1, Math.round((variant === 'ascii' ? ASCII_CELL_SIZE : CELL_SIZE)[density] * ratio))
      cellHeight = variant === 'ascii' ? Math.max(1, Math.round(cell * ASCII_CELL_RATIO)) : cell
      canvas.width = width
      canvas.height = height
      context.imageSmoothingEnabled = false
      paint()
    }
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    reveal?.listeners.add(sync)
    resize()
    sync()
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      motion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      reveal?.listeners.delete(sync)
    }
  }, [duration, paused, density, variant, revealRef])
  return <canvas ref={canvasRef} className="still-texture-canvas" aria-hidden="true" />
}

/** Decorative placeholder. Give its loading container aria-busy and a status label. */
export function AnimatedSkeleton({ variant = 'shimmer', duration = 2.4, paused = false, density, className, style, ...props }: AnimatedSkeletonProps) {
  const cells = densityFor(variant, density)
  return <div {...props} aria-hidden="true" data-variant={variant} data-paused={paused} data-density={isCellVariant(variant) ? cells : undefined}
    className={cn('still-skeleton', className)}
    style={{ '--skeleton-duration': `${Math.max(0.4, duration)}s`, ...style } as CSSProperties}>
    {isCellVariant(variant) && <TextureCanvas variant={variant} density={cells} duration={Math.max(0.4, duration)} paused={paused} />}
  </div>
}

export type SkeletonLayout = 'profile' | 'card' | 'text' | 'product' | 'article' | 'video' | 'stats'
export type SkeletonCardProps = Omit<AnimatedSkeletonProps, 'children'> & { layout?: SkeletonLayout }

/** A complete decorative layout; announce loading on the surrounding region. */
export function SkeletonCard({ layout = 'product', variant = 'shimmer', duration = 2.4, paused = false, density, className, ...props }: SkeletonCardProps) {
  const block = (classes: string) => <AnimatedSkeleton density={density} variant={variant} duration={duration} paused={paused} className={classes} />
  const author = <div className="flex items-center gap-3">{block('size-9 shrink-0 rounded-full')}<div className="flex flex-1 flex-col gap-2">{block('h-2.5 w-24')}{block('h-2 w-16')}</div></div>
  const lines = <div className="flex flex-col gap-3">{block('h-2.5 w-full')}{block('h-2.5 w-[85%]')}{block('h-2.5 w-[58%]')}</div>
  return <div {...props} aria-hidden="true" data-layout={layout} className={cn('flex w-full max-w-64 flex-col gap-5', className)}>
    {layout === 'profile' && <>{author}{lines}</>}
    {layout === 'text' && lines}
    {layout === 'card' && <>{block('h-20 w-full')}{author}{lines}</>}
    {layout === 'product' && <>
      {block('h-32 w-full rounded-lg')}
      <div className="flex flex-col gap-3">{block('h-2 w-16')}{block('h-3 w-4/5')}<div className="mt-1 flex items-center justify-between">{block('h-4 w-16')}<div className="flex gap-1.5">{block('size-3 rounded-full')}{block('size-3 rounded-full')}{block('size-3 rounded-full')}</div></div></div>
      {block('h-8 w-full rounded-md')}
    </>}
    {layout === 'article' && <>
      <div className="flex items-center justify-between">{block('h-5 w-16 rounded-full')}{block('h-2 w-12')}</div>
      <div className="flex flex-col gap-2.5">{block('h-4 w-full')}{block('h-4 w-3/4')}</div>
      {block('h-24 w-full rounded-lg')}{lines}{author}
    </>}
    {layout === 'video' && <>
      <div className="relative">{block('aspect-video w-full rounded-lg')}<span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/60"><span className="ml-1 size-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-muted-foreground/50" /></span><span className="absolute right-2 bottom-2">{block('h-3 w-7 rounded-sm')}</span></div>
      {author}<div className="flex flex-col gap-2.5">{block('h-3 w-full')}{block('h-3 w-2/3')}</div><div className="flex gap-3">{block('h-2 w-16')}{block('h-2 w-12')}</div>
    </>}
    {layout === 'stats' && <>
      <div className="flex items-center justify-between">{block('h-2.5 w-24')}{block('size-7 rounded-md')}</div>
      <div className="flex items-end gap-3">{block('h-8 w-28')}{block('h-5 w-14 rounded-full')}</div>{block('h-2 w-36')}
      <div className="flex h-24 items-end gap-2 border-b border-border pb-2">{[35, 58, 43, 72, 54, 86, 68, 100, 81, 92].map((height, i) => <AnimatedSkeleton density={density} key={i} variant={variant} duration={duration} paused={paused} className="min-w-0 flex-1 rounded-sm" style={{ height: `${height}%` }} />)}</div>
      <div className="flex justify-between">{block('h-2 w-10')}{block('h-2 w-10')}{block('h-2 w-10')}</div>
    </>}
  </div>
}

export type SkeletonRevealProps = ComponentProps<'div'> & {
  loading: boolean
  skeleton: ReactNode
  duration?: number
}

/** Both layers reserve space, so revealing content never collapses the container.
 * Mount when fetching begins; use loading to reveal resolved content. The skeleton clears itself
 * over `duration` seconds - cell textures drop their own cells, the CSS variants wipe or fade -
 * uncovering the content underneath rather than crossing over it.
 */
/** A dense field of cells thins out faster than it clears: half of them gone already reads as
 * nearly empty. So the curve starts brisk enough to answer the click, holds back through the
 * range that carries the change, then runs out the sparse tail instead of lingering on it. */
function settleReveal(container: HTMLElement | null, reveal: RevealState, elapsed: number) {
  reveal.progress.current = elapsed * (.45 + .55 * elapsed)
  container?.style.setProperty('--reveal-progress', reveal.progress.current.toFixed(4))
}

export function SkeletonReveal({ loading, skeleton, duration = .7, children, className, ...props }: SkeletonRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef(loading ? 0 : 1)
  const reveal = useRef<RevealState>({ progress: { current: loading ? 0 : 1 }, running: { current: false }, listeners: new Set() })
  const [settled, setSettled] = useState(loading)
  const [running, setRunning] = useState(false)

  // A change of loading starts the reveal, unless motion is off: then the swap is immediate.
  if (settled !== loading) {
    setSettled(loading)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setRunning(true)
  }

  // Outside a reveal the skeleton is whole or gone, so reduced motion swaps the layers outright.
  useEffect(() => {
    if (running) return
    elapsedRef.current = loading ? 0 : 1
    settleReveal(containerRef.current, reveal.current, elapsedRef.current)
  }, [running, loading])

  useEffect(() => {
    if (!running) return
    const target = loading ? 0 : 1
    const span = Math.max(.2, duration) * 1000
    const announce = (state: boolean) => { reveal.current.running.current = state; reveal.current.listeners.forEach(listener => listener()) }
    let frame = 0
    let last = 0
    const step = (now: number) => {
      const delta = last ? (now - last) / span : 0
      last = now
      elapsedRef.current = target === 1 ? Math.min(1, elapsedRef.current + delta) : Math.max(0, elapsedRef.current - delta)
      settleReveal(containerRef.current, reveal.current, elapsedRef.current)
      if (elapsedRef.current === target) { announce(false); setRunning(false); return }
      frame = requestAnimationFrame(step)
    }
    announce(true)
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [running, loading, duration])

  return <div {...props} ref={containerRef} aria-busy={loading} data-loading={loading} data-transition={running} className={cn('still-reveal', className)}>
    <Reveal value={reveal}>
      <div className="still-reveal-layer still-reveal-placeholder" data-visible={loading} aria-hidden="true" inert>{skeleton}</div>
    </Reveal>
    <div className="still-reveal-layer still-reveal-content" data-visible={!loading} aria-hidden={loading} inert={loading}>{children}</div>
  </div>
}
