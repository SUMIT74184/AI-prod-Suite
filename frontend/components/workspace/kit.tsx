import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Shared class recipes (same language as the marketing site) ───
export const ui = {
  btnPrimary:
    'group inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-[13.5px] text-black shadow-[0_0_32px_-10px_rgba(255,194,133,0.7)] transition-all hover:bg-[#ffc285] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-gray-500 disabled:shadow-none',
  btnOutline:
    'inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] px-4 py-1.5 text-[13px] text-gray-300 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40',
  btnDanger:
    'inline-flex items-center justify-center gap-2 rounded-full border border-red-400/20 px-4 py-1.5 text-[13px] text-red-300/90 transition-colors hover:border-red-400/40 hover:bg-red-500/10 disabled:opacity-40',
  iconBtn:
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40',
  mono: 'font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-500',
  card: 'rounded-2xl border border-white/[0.07] bg-white/[0.02]',
  chip: 'inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-gray-400',
}

// Severity palette — matches the CLI terminal on the landing page
export const SEVERITY_TONE: Record<string, { text: string; ring: string; bar: string }> = {
  critical: { text: 'text-[#c4b5fd]', ring: 'border-[#c4b5fd]/30 bg-[#7c3aed]/10', bar: 'bg-[#c4b5fd]' },
  high: { text: 'text-red-300', ring: 'border-red-400/30 bg-red-500/10', bar: 'bg-red-400' },
  medium: { text: 'text-amber-300', ring: 'border-amber-400/30 bg-amber-500/10', bar: 'bg-amber-400' },
  low: { text: 'text-sky-300', ring: 'border-sky-400/30 bg-sky-500/10', bar: 'bg-sky-400' },
}
export const severityTone = (s?: string) =>
  SEVERITY_TONE[s?.toLowerCase() || ''] || { text: 'text-gray-400', ring: 'border-white/10 bg-white/[0.03]', bar: 'bg-gray-500' }

// ─── Mono eyebrow label ───
export function MonoLabel({ index, children, className }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', ui.mono, className)}>
      {index && <span className="text-[#ff7a17]">{index}</span>}
      {index && <span className="h-px w-5 bg-white/15" />}
      {children}
    </div>
  )
}

// ─── Module header bar ───
export function ModuleHeader({
  index,
  section,
  title,
  accent,
  description,
  actions,
  leading,
}: {
  index: string
  section: string
  title: string
  accent?: string
  description?: ReactNode
  actions?: ReactNode
  leading?: ReactNode
}) {
  return (
    <header className="relative shrink-0 overflow-hidden border-b border-white/[0.06]">
      <div className="lab-grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(90deg,#000,transparent_65%)]" />
      <div className="pointer-events-none absolute -left-24 -top-28 h-56 w-96 rounded-full bg-[#ff7a17]/[0.07] blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="min-w-0">
            <MonoLabel index={index}>{section}</MonoLabel>
            <h1 className="mt-1.5 truncate text-[21px] leading-tight tracking-[-0.02em] text-white">
              {title}
              {accent && <span className="lab-serif pl-1.5 text-[1.08em] text-[#ffc285]">{accent}</span>}
            </h1>
            {description && <p className="mt-1 truncate text-[13px] text-gray-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

// ─── Empty state with orbiting rings (echoes the hero agent stage) ───
export function EmptyState({
  icon: Icon,
  title,
  accent,
  body,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  accent?: string
  body?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative flex h-full flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-[70%] rounded-full bg-[#ff7a17]/[0.06] blur-3xl" />
      <div className="relative mb-7 h-28 w-28">
        <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full" aria-hidden>
          <g className="lab-spin-slow">
            <circle cx="56" cy="56" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 6" />
            <circle cx="56" cy="2" r="2.5" fill="#ff7a17" />
          </g>
          <g className="lab-spin-rev">
            <circle cx="56" cy="56" r="40" fill="none" stroke="rgba(255,194,133,0.18)" strokeDasharray="1 5" />
            <circle cx="96" cy="56" r="2" fill="#c4b5fd" />
          </g>
        </svg>
        <div className="absolute inset-[30px] flex items-center justify-center rounded-2xl border border-white/10 bg-black/70 shadow-[0_0_40px_-8px_rgba(255,122,23,0.45)]">
          <Icon className="h-5 w-5 text-[#ffc285]" strokeWidth={1.5} />
        </div>
      </div>
      <h2 className="relative text-[22px] tracking-[-0.02em] text-white">
        {title}
        {accent && <span className="lab-serif pl-1.5 text-[1.08em] text-gray-400">{accent}</span>}
      </h2>
      {body && <p className="relative mt-2.5 max-w-md text-[14px] leading-relaxed text-gray-500">{body}</p>}
      {children && <div className="relative mt-6">{children}</div>}
    </div>
  )
}

// ─── Pulsing status dot ───
export function StatusDot({ tone = 'idle' }: { tone?: 'idle' | 'live' | 'done' | 'error' }) {
  if (tone === 'live')
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff7a17] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff7a17]" />
      </span>
    )
  return (
    <span
      className={cn(
        'inline-flex h-2 w-2 rounded-full',
        tone === 'done' && 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        tone === 'error' && 'bg-red-400 shadow-[0_0_8px_#f87171]',
        tone === 'idle' && 'bg-white/20'
      )}
    />
  )
}

// ─── Keyboard hint ───
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">{children}</kbd>
}
