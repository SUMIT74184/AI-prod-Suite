import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { severityTone, StatusDot } from './kit'

// ─── Live pipeline tracker (same vocabulary as the landing-page pipeline) ───
export function PipelineTracker({
  steps,
  currentStep,
  message,
}: {
  steps: { id: string; label: string }[]
  currentStep: string
  message: string
}) {
  const isComplete = currentStep === 'complete'
  const curIdx = isComplete ? steps.length : steps.findIndex(s => s.id === currentStep || currentStep.includes(s.id))
  const progress = isComplete ? 1 : Math.max(0, (curIdx + 0.5) / steps.length)

  return (
    <div className="border-b border-white/[0.06] px-6 py-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot tone={isComplete ? 'done' : 'live'} />
          <p className="truncate text-[13.5px] text-white">{message}</p>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">
          node · <span className="text-[#ffc285]">{currentStep || 'starting'}</span>
        </span>
      </div>
      <div className="mb-3 h-px w-full overflow-hidden bg-white/[0.08]">
        <div
          className="h-full origin-left bg-gradient-to-r from-[#ffc285] via-[#ff7a17] to-[#c4b5fd] transition-transform duration-700 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((step, idx) => {
          const state = isComplete || idx < curIdx ? 'done' : idx === curIdx ? 'run' : 'wait'
          return (
            <span
              key={step.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] transition-all duration-500',
                state === 'run' && 'border-[#ff7a17]/50 bg-[#ff7a17]/[0.08] text-white',
                state === 'done' && 'border-white/10 bg-white/[0.03] text-gray-400',
                state === 'wait' && 'border-white/[0.05] text-gray-600'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', state === 'run' ? 'bg-[#ff7a17] shadow-[0_0_8px_#ff7a17]' : state === 'done' ? 'bg-emerald-400/80' : 'bg-white/15')} />
              {step.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Health score ring ───
export function HealthGauge({ score }: { score: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const color = score > 80 ? '#34d399' : score > 50 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-2 pl-2 pr-4">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] tabular-nums text-white">{score}</span>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">Health score</p>
        <p className="text-[13px]" style={{ color }}>
          {score > 80 ? 'Healthy' : score > 50 ? 'Needs attention' : 'At risk'}
        </p>
      </div>
    </div>
  )
}

// ─── Severity counter strip ───
export function SeverityStrip({ breakdown }: { breakdown?: { critical: number; high: number; medium: number; low: number } }) {
  if (!breakdown) return null
  const entries = (['critical', 'high', 'medium', 'low'] as const).filter(k => breakdown[k] > 0)
  if (entries.length === 0) return <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-600">No severity flags</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(k => {
        const tone = severityTone(k)
        return (
          <span key={k} className={cn('rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', tone.ring, tone.text)}>
            {breakdown[k]} {k}
          </span>
        )
      })}
    </div>
  )
}

// ─── KPI tile ───
export function KpiTile({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all',
        active ? 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
      )}
    >
      {active && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff7a17] to-transparent" />}
      <div className="mb-3 flex items-center justify-between">
        <Icon className={cn('h-4 w-4 transition-colors', active ? 'text-[#ffc285]' : 'text-gray-500 group-hover:text-gray-300')} strokeWidth={1.75} />
        <span className="text-[22px] leading-none tracking-tight tabular-nums text-white">{value}</span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">{label}</p>
    </button>
  )
}

// ─── Segmented tabs ───
export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.02] p-0.5">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-full px-3 py-1 text-[12.5px] transition-colors',
            value === t.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Finding card ───
export function FindingCard({
  severity,
  category,
  lineRef,
  description,
  agent,
}: {
  severity?: string
  category?: string
  lineRef?: string
  description: string
  agent?: string
}) {
  const tone = severityTone(severity)
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 pl-5 transition-colors hover:border-white/15">
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', tone.bar)} />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider', tone.ring, tone.text)}>{severity || 'n/a'}</span>
        {category && <span className="font-mono text-[11px] text-gray-400">{category}</span>}
        {agent && <span className="font-mono text-[11px] text-[#ffc285]/80">agent_{agent}</span>}
        {lineRef && <span className="ml-auto rounded-md border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10.5px] text-gray-400">{lineRef}</span>}
      </div>
      <p className="text-[13.5px] leading-relaxed text-gray-300">{description}</p>
    </div>
  )
}

// ─── Section heading inside the report body ───
export function ReportSection({ icon: Icon, title, count, children }: { icon: LucideIcon; title: string; count?: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2.5 text-[14px] tracking-tight text-white">
        <Icon className="h-4 w-4 text-[#ffc285]" strokeWidth={1.75} />
        {title}
        {typeof count === 'number' && <span className="font-mono text-[11px] text-gray-500">{count}</span>}
      </h3>
      {children}
    </section>
  )
}

// ─── Placeholder for an empty / still-running section ───
export function ReportPlaceholder({ streaming, streamingText, idleText, icon: Icon }: { streaming: boolean; streamingText: string; idleText: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center">
      {streaming ? (
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-[#ffc285]" />
      ) : (
        Icon && <Icon className="mb-3 h-6 w-6 text-emerald-400/60" strokeWidth={1.5} />
      )}
      <p className="text-[13.5px] text-gray-500">{streaming ? streamingText : idleText}</p>
    </div>
  )
}
