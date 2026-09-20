import { Headphones, Play } from 'lucide-react'
import type { SkeletonLayout } from './animated-skeleton'

function Author() {
  return <div className="flex h-9 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">AM</span><div className="flex flex-col gap-1"><span className="text-xs leading-3">Alex Morgan</span><span className="text-[10px] leading-3 text-muted-foreground">Design engineer</span></div></div>
}
function Lines() {
  return <p className="text-xs leading-[22px] text-muted-foreground">A little care in the details makes every interaction feel more considered.</p>
}
function Artwork({ video = false }: { video?: boolean }) {
  return <div className={video ? 'relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-muted' : 'relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted'} aria-hidden="true"><div className="size-28 rotate-[-25deg] rounded-[30%] border border-foreground/15 bg-background shadow-xl" /><div className="absolute size-20 rotate-12 rounded-[30%] border border-foreground/20 bg-card shadow-xl" />{video && <span className="absolute flex size-10 items-center justify-center rounded-full border border-border bg-background/80"><Play className="ml-0.5 size-4 fill-current" /></span>}</div>
}
export function ExampleContent({ layout }: { layout: SkeletonLayout }) {
  return <div className="flex w-full max-w-64 flex-col gap-5">
    {layout === 'profile' && <><Author /><Lines /></>}
    {layout === 'text' && <Lines />}
    {layout === 'card' && <><div className="flex h-20 items-center justify-center rounded-md border border-border bg-muted text-xs tracking-widest text-muted-foreground">MADE WITH CARE.</div><Author /><Lines /></>}
    {layout === 'product' && <>
      <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-muted"><Headphones strokeWidth={1} className="size-22 text-foreground/80" aria-hidden="true" /></div>
      <div className="flex flex-col gap-3"><span className="text-[8px] leading-2 tracking-widest text-muted-foreground">THE STUDIO COLLECTION</span><h4 className="text-xs leading-3 font-medium">Studio headphones</h4><div className="mt-1 flex items-center justify-between"><span className="text-sm leading-4">$149.00</span><div className="flex gap-1.5" aria-label="Available in three colors"><span className="size-3 rounded-full border border-foreground/30 bg-muted" /><span className="size-3 rounded-full bg-muted-foreground" /><span className="size-3 rounded-full bg-foreground" /></div></div></div>
      <div className="flex h-8 items-center justify-center rounded-md bg-primary text-[10px] font-medium text-primary-foreground">Studio edition</div>
    </>}
    {layout === 'article' && <>
      <div className="flex h-5 items-center justify-between text-[9px] text-muted-foreground"><span className="rounded-full border border-border px-2 py-0.5">DESIGN</span><span>5 min read</span></div>
      <h4 className="text-sm leading-[21px] font-medium">The quiet craft of<br />building better interfaces</h4><Artwork /><Lines /><Author />
    </>}
    {layout === 'video' && <><Artwork video /><Author /><h4 className="text-xs leading-[17px] font-medium">Designing the moments<br />between the moments.</h4><div className="flex gap-3 text-[9px] leading-2 text-muted-foreground"><span>12.4k views</span><span>2 days ago</span></div></>}
    {layout === 'stats' && <>
      <div className="flex h-7 items-center justify-between"><span className="text-xs text-muted-foreground">Total visitors</span><span className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground">↗</span></div>
      <div className="flex items-end gap-3"><span className="text-[28px] leading-8 tracking-tight tabular-nums">24,892</span><span className="rounded-full bg-muted px-2 py-1 text-[9px] leading-3">+18.6%</span></div><span className="text-[9px] leading-2 text-muted-foreground">Compared to last month</span>
      <div className="flex h-24 items-end gap-2 border-b border-border pb-2" role="img" aria-label="Visitor trend rising over the last month">{[35,58,43,72,54,86,68,100,81,92].map((h,i)=><span key={i} className="min-w-0 flex-1 rounded-sm bg-foreground/60" style={{height:`${h}%`}} />)}</div>
      <div className="flex justify-between text-[9px] leading-2 text-muted-foreground"><span>Sep 1</span><span>Sep 15</span><span>Sep 30</span></div>
    </>}
  </div>
}
