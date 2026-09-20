import { useState } from 'react'
import { Check, Code2, Copy, Eye, EyeOff, Layers2, Pause, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SkeletonCard, SkeletonReveal, type SkeletonDensity, type SkeletonLayout, type SkeletonVariant } from '@/components/skeletons/animated-skeleton'
import { ExampleContent } from '@/components/skeletons/example-content'
import source from '@/components/skeletons/animated-skeleton.tsx?raw'
import styles from '@/components/skeletons/skeleton.css?raw'
import { cn } from '@/lib/utils'

const variants: { id: SkeletonVariant; title: string }[] = [
  { id: 'shimmer', title: 'Shimmer' },
  { id: 'pulse', title: 'Pulse' },
  { id: 'dither', title: 'Dither' },
  { id: 'pixel', title: 'Pixel' },
  { id: 'wave', title: 'Wave' },
  { id: 'scanline', title: 'Scanline' },
  { id: 'ascii', title: 'ASCII' },
]
const layouts: { id: SkeletonLayout; label: string }[] = [
  { id: 'product', label: 'Product' },
  { id: 'article', label: 'Article' },
  { id: 'video', label: 'Video' },
  { id: 'stats', label: 'Stats' },
  { id: 'card', label: 'Social' },
  { id: 'profile', label: 'Profile' },
  { id: 'text', label: 'Text' },
]
const textured = (variant: SkeletonVariant) => ['dither', 'pixel', 'scanline', 'ascii'].includes(variant)

type CardSettings = { variant: SkeletonVariant; layout: SkeletonLayout; speed: number; density: SkeletonDensity }

function Select({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="min-w-0">
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}
      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground">{children}</select>
  </label>
}

function VariantCard({ variant, title, onShowCode }: { variant: SkeletonVariant; title: string; onShowCode: (settings: CardSettings) => void }) {
  const [layout, setLayout] = useState<SkeletonLayout>('product')
  const [speed, setSpeed] = useState(1)
  const [density, setDensity] = useState<SkeletonDensity>(variant === 'pixel' ? 'coarse' : 'medium')
  const [paused, setPaused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const compact = layout === 'profile' || layout === 'text'
  return <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
    <div className={cn('preview-stage flex items-center justify-center px-10', compact ? 'h-55' : 'h-100')}>
      <SkeletonReveal loading={!revealed} className="w-full max-w-64" aria-label={`${title} ${layout} preview`}
        duration={0.7 / speed}
        skeleton={<SkeletonCard variant={variant} layout={layout} density={density} duration={2.4 / speed} paused={paused} />}>
        <ExampleContent layout={layout} />
      </SkeletonReveal>
    </div>
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-pressed={paused} aria-label={paused ? 'Play animation' : 'Pause animation'} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>
          <Button variant="ghost" size="icon-sm" aria-pressed={revealed} aria-label={revealed ? 'Show skeleton' : 'Reveal content'} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff /> : <Eye />}</Button>
          <Button variant="ghost" size="icon-sm" aria-label={`View ${title} code`} onClick={() => onShowCode({ variant, layout, speed, density })}><Code2 /></Button>
        </div>
      </div>
      <div className={cn('grid gap-2', textured(variant) ? 'grid-cols-3' : 'grid-cols-2')}>
        <Select label={`${title} layout`} value={layout} onChange={value => setLayout(value as SkeletonLayout)}>
          {layouts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Select label={`${title} speed`} value={speed} onChange={value => setSpeed(Number(value))}>
          {[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
        </Select>
        {textured(variant) && <Select label={`${title} texture density`} value={density} onChange={value => setDensity(value as SkeletonDensity)}>
          <option value="fine">Fine</option><option value="medium">Medium</option><option value="coarse">Coarse</option>
        </Select>}
      </div>
    </div>
  </article>
}

function usageFor({ variant, layout, speed, density }: CardSettings) {
  return `import { SkeletonCard, SkeletonReveal } from '@/components/skeletons/animated-skeleton'

<SkeletonReveal
  loading={loading}
  aria-label="${layout}"
  className="w-full max-w-64"
  duration={${(0.7 / speed).toFixed(2)}}
  skeleton={
    <SkeletonCard
      layout="${layout}"
      variant="${variant}"
      duration={${(2.4 / speed).toFixed(1)}}${textured(variant) ? `\n      density="${density}"` : ''}
    />
  }
>
  <YourLoadedContent />
</SkeletonReveal>`
}

export default function App() {
  const [code, setCode] = useState<CardSettings | null>(null)
  const [tab, setTab] = useState('usage')
  const [copyState, setCopyState] = useState('Copy code')
  const snippet = code === null ? '' : tab === 'source' ? source : tab === 'css' ? styles : usageFor(code)
  async function copyCode() {
    try { await navigator.clipboard.writeText(snippet); setCopyState('Copied') }
    catch { setCopyState('Select the code to copy manually') }
  }
  return <>
    <main className="mx-auto max-w-6xl px-6 pb-20 lg:px-10">
      <h1 className="pt-20 pb-11 text-[42px] leading-none font-medium tracking-[-.055em] sm:text-[54px]">better skeletons</h1>
      <div className="mb-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-border py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><Layers2 className="size-3.5" aria-hidden="true" /> React + Tailwind</span>
        <span className="flex items-center gap-2"><Check className="size-3.5" aria-hidden="true" /> shadcn/ui compatible</span>
        <span className="flex items-center gap-2"><Sparkles className="size-3.5" aria-hidden="true" /> CSS + canvas motion</span>
        <span className="md:ml-auto">No animation dependencies</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {variants.map(item => <VariantCard key={item.id} variant={item.id} title={item.title}
          onShowCode={settings => { setCode(settings); setTab('usage'); setCopyState('Copy code') }} />)}
      </div>
    </main>
    <Dialog open={code !== null} onOpenChange={open => { if (!open) setCode(null) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{code?.variant} · {layouts.find(item => item.id === code?.layout)?.label}</DialogTitle>
          <DialogDescription>Copy the component and stylesheet into your project, then use the example.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup type="single" value={tab} onValueChange={value => { if (value) { setTab(value); setCopyState('Copy code') } }} aria-label="Code file">
            {['usage', 'source', 'css'].map(item => <ToggleGroupItem key={item} value={item} className="capitalize">{item}</ToggleGroupItem>)}
          </ToggleGroup>
          <Button variant="outline" onClick={copyCode}>{copyState === 'Copied' ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copyState}</Button>
        </div>
        <pre tabIndex={0} className="max-h-[50vh] overflow-auto rounded-lg border border-border bg-background p-5 text-xs leading-6"><code>{snippet}</code></pre>
        <p className="sr-only" role="status">{copyState}</p>
      </DialogContent>
    </Dialog>
  </>
}
