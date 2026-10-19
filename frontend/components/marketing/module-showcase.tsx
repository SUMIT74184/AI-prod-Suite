'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Brain, Code2, Lightbulb, Search, Workflow, ArrowRight, Check, Loader2, FileText, PlaySquare, Globe, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from './motion'

type Module = { id: string; name: string; icon: LucideIcon; href: string; tagline: string; points: string[]; panel: () => ReactNode }

const DURATION = 7000

// ─── Panels ───
function ReviewPanel() {
  const diff: [string, string][] = [
    [' ', 'async def get_user(db, user_id: str):'],
    ['-', '    q = f"SELECT * FROM users WHERE id = {user_id}"'],
    ['-', '    return await db.fetch(q)'],
    ['+', '    q = "SELECT * FROM users WHERE id = $1"'],
    ['+', '    return await db.fetch(q, user_id)'],
    [' ', ''],
    [' ', 'for order in orders:'],
    [' ', '    order.items = await load_items(order.id)'],
  ]
  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr]">
      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-4 font-mono text-[11.5px] leading-6 overflow-hidden">
        <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-gray-500">app/repositories/users.py</div>
        {diff.map(([sign, code], i) => (
          <div
            key={i}
            className={cn('lab-line-in -mx-4 px-4 whitespace-pre', sign === '-' && 'bg-red-500/10 text-red-300/90', sign === '+' && 'bg-emerald-500/10 text-emerald-300/90', sign === ' ' && 'text-gray-400')}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="mr-3 select-none text-gray-600">{sign}</span>
            {code}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[
          { agent: 'agent_security', sev: 'high', tone: 'text-red-300 border-red-400/30 bg-red-500/10', body: 'User input interpolated into SQL. Use parameterised queries.' },
          { agent: 'agent_performance', sev: 'medium', tone: 'text-amber-300 border-amber-400/30 bg-amber-500/10', body: 'N+1 query inside loop. Batch with a single IN (...) fetch.' },
          { agent: 'generate_tests', sev: 'info', tone: 'text-sky-300 border-sky-400/30 bg-sky-500/10', body: 'Added regression test for injection payload "1 OR 1=1".' },
        ].map((f, i) => (
          <div key={f.agent} className="lab-line-in rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5" style={{ animationDelay: `${600 + i * 450}ms` }}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#ffc285]">{f.agent}</span>
              <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider', f.tone)}>{f.sev}</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-gray-300">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResearchPanel() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[0.8fr_1.4fr]">
      <div className="flex flex-col gap-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Sources · 3 indexed</div>
        {[
          { icon: FileText, name: 'attention-is-all-you-need.pdf', meta: '15 pages · 212 chunks' },
          { icon: PlaySquare, name: 'Lecture 7 — Transformers', meta: 'transcript · 48 min' },
          { icon: Globe, name: 'distill.pub/2016/augmented-rnns', meta: 'web · 6.1k words' },
        ].map((s, i) => (
          <div key={s.name} className="lab-line-in flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3" style={{ animationDelay: `${i * 140}ms` }}>
            <s.icon className="h-4 w-4 shrink-0 text-[#a0c3ec]" />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-gray-200">{s.name}</p>
              <p className="font-mono text-[10px] text-gray-500">{s.meta}</p>
            </div>
          </div>
        ))}
        <div className="mt-1 grid grid-cols-2 gap-2">
          {['Summary', 'Flashcards', 'Quiz', 'Mind map'].map(t => (
            <span key={t} className="rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-gray-400">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/40 p-4">
        <div className="self-end rounded-2xl rounded-br-sm bg-white/[0.07] px-3.5 py-2 text-[12.5px] text-gray-200">Why does self-attention scale better than recurrence?</div>
        <div className="lab-line-in text-[12.5px] leading-relaxed text-gray-300" style={{ animationDelay: '500ms' }}>
          Self-attention connects every position in a constant number of sequential operations, while recurrence needs O(n)
          <sup className="mx-0.5 rounded bg-[#ff7a17]/15 px-1 font-mono text-[9px] text-[#ffc285]">1</sup>. That parallelism shortens gradient paths for long-range dependencies
          <sup className="mx-0.5 rounded bg-[#ff7a17]/15 px-1 font-mono text-[9px] text-[#ffc285]">2</sup>
          <sup className="mx-0.5 rounded bg-[#ff7a17]/15 px-1 font-mono text-[9px] text-[#ffc285]">3</sup>.
        </div>
        <div className="lab-line-in mt-auto flex flex-wrap gap-2" style={{ animationDelay: '900ms' }}>
          {['[1] p.6 §4', '[2] 31:04', '[3] §2'].map(c => (
            <span key={c} className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-gray-400">{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function WebAgentPanel() {
  const steps = ['plan', 'search', 'read', 'analyze', 'write_report']
  const [done, setDone] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDone(d => Math.min(d + 1, steps.length)), 1100)
    return () => clearInterval(id)
  }, [steps.length])
  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[0.9fr_1.3fr]">
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'run' : 'wait'
          return (
            <div key={s} className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500', state === 'run' ? 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.06]' : 'border-white/[0.07] bg-white/[0.02]')}>
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', state === 'done' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : state === 'run' ? 'border-[#ff7a17]/50 text-[#ffc285]' : 'border-white/15 text-gray-600')}>
                {state === 'done' ? <Check className="h-3 w-3" /> : state === 'run' ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
              </span>
              <span className={cn('font-mono text-[12px]', state === 'wait' ? 'text-gray-500' : 'text-gray-200')}>{s}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-gray-600">{state === 'done' ? 'ok' : state === 'run' ? 'live' : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">report.md · streaming</div>
        <h4 className="mb-2 text-[15px] text-white">State of small language models, 2026</h4>
        <div className="space-y-2">
          {[92, 100, 78, 96, 64, 88].map((w, i) => (
            <div key={i} className="h-2 rounded-full bg-white/[0.07] transition-all duration-700" style={{ width: i < done + 1 ? `${w}%` : '0%', transitionDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: Math.min(done * 3, 12) }).map((_, i) => (
            <span key={i} className="lab-line-in h-1.5 w-1.5 rounded-full bg-[#a0c3ec]/70" />
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-gray-500">{Math.min(done * 3, 12)} citations attached</p>
      </div>
    </div>
  )
}

function PlaygroundPanel() {
  const models = [
    { name: 'gemini-2.5-flash', lat: 62, cost: 18, score: 88 },
    { name: 'claude-sonnet', lat: 78, cost: 54, score: 94 },
    { name: 'gpt-4o-mini', lat: 55, cost: 22, score: 83 },
  ]
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-white/[0.07] bg-black/40 px-4 py-3 font-mono text-[11.5px] text-gray-400">
        <span className="text-[#c4b5fd]">system</span> You are a precise technical editor. Rewrite <span className="rounded bg-[#ff7a17]/15 px-1 text-[#ffc285]">{'{{draft}}'}</span> in{' '}
        <span className="rounded bg-[#ff7a17]/15 px-1 text-[#ffc285]">{'{{tone}}'}</span> tone.
        <span className="ml-3 text-gray-600">· v14</span>
      </div>
      <div className="grid flex-1 gap-3 md:grid-cols-3">
        {models.map((m, i) => (
          <div key={m.name} className="lab-line-in flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5" style={{ animationDelay: `${i * 150}ms` }}>
            <span className="mb-3 font-mono text-[11px] text-gray-200">{m.name}</span>
            {[
              ['latency', m.lat, '#a0c3ec'],
              ['cost', m.cost, '#c4b5fd'],
              ['eval', m.score, '#ff7a17'],
            ].map(([label, v, c]) => (
              <div key={label as string} className="mb-2.5">
                <div className="mb-1 flex justify-between font-mono text-[9.5px] uppercase tracking-wider text-gray-500">
                  <span>{label}</span>
                  <span>{v}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="lab-progress h-full rounded-full" style={{ width: `${v}%`, background: c as string, animationDuration: '1.2s', animationDelay: `${300 + i * 150}ms`, transform: 'scaleX(0)' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowPanel() {
  const nodes = [
    { x: 40, y: 70, label: 'Trigger · cron' },
    { x: 230, y: 30, label: 'Web Research' },
    { x: 230, y: 130, label: 'Ingest → RAG' },
    { x: 420, y: 80, label: 'Summarise' },
    { x: 600, y: 80, label: 'Notify · Slack' },
  ]
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
  return (
    <div className="flex h-full items-center rounded-xl border border-white/[0.07] bg-black/40 lab-grid-bg p-4">
      <svg viewBox="0 0 740 190" className="w-full h-auto">
        {edges.map(([a, b], i) => {
          const A = nodes[a]
          const B = nodes[b]
          const d = `M${A.x + 120},${A.y + 18} C${A.x + 160},${A.y + 18} ${B.x - 40},${B.y + 18} ${B.x},${B.y + 18}`
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="rgba(255,255,255,0.12)" />
              <path d={d} fill="none" stroke="#ff7a17" strokeOpacity="0.8" className="lab-dash" />
            </g>
          )
        })}
        {nodes.map((n, i) => (
          <g key={n.label} className="lab-line-in" style={{ animationDelay: `${i * 120}ms` }}>
            <rect x={n.x} y={n.y} width="120" height="36" rx="10" fill="#111214" stroke={i === 0 ? '#ff7a17' : 'rgba(255,255,255,0.14)'} />
            <circle cx={n.x + 14} cy={n.y + 18} r="3" fill={i === 0 ? '#ff7a17' : '#a0c3ec'} />
            <text x={n.x + 26} y={n.y + 22} fill="#e5e7eb" fontSize="11.5" fontFamily="Inter, sans-serif">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

const MODULES: Module[] = [
  { id: 'review', name: 'Code Reviewer', icon: Code2, href: '/modules/code-reviewer', tagline: 'Five specialist reviewers. One verified report.', points: ['Bug, security, performance, architecture & quality agents', 'Findings validated and de-duplicated before you see them', 'Auto-generated fixes and regression tests'], panel: ReviewPanel },
  { id: 'research', name: 'Research Assistant', icon: Brain, href: '/modules/research-assistant', tagline: 'Grounded answers over your own corpus.', points: ['Ingest PDFs, Word docs, YouTube and web pages', 'Chroma-backed retrieval with inline citations', 'Summaries, flashcards, quizzes and mind maps'], panel: ResearchPanel },
  { id: 'web', name: 'Web Research Agent', icon: Search, href: '/modules/web-research-agent', tagline: 'Autonomous plan → search → read → analyse → write.', points: ['LangGraph state machine with live progress', 'Streams intermediate insights as it works', 'Markdown reports with full citation trail'], panel: WebAgentPanel },
  { id: 'prompt', name: 'Prompt Playground', icon: Lightbulb, href: '/modules/prompt-playground', tagline: 'Measure prompts like experiments, not vibes.', points: ['Gemini, OpenAI, Anthropic & OpenRouter adapters', 'Versioned prompts with {{variables}}', 'Latency, token and cost metrics per run'], panel: PlaygroundPanel },
  { id: 'flow', name: 'Workflow Automation', icon: Workflow, href: '/modules/workflow-automation', tagline: 'Compose agents into recurring pipelines.', points: ['Visual node editor on React Flow', 'Chain research, ingestion and generation', 'Schedule and re-run with one click'], panel: WorkflowPanel },
]

export function ModuleShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (paused || reduced) return
    const id = setTimeout(() => setIndex(i => (i + 1) % MODULES.length), DURATION)
    return () => clearTimeout(id)
  }, [index, paused, reduced])

  const mod = MODULES[index]
  const Panel = mod.panel

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Tabs */}
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {MODULES.map((m, i) => {
          const active = i === index
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => setIndex(i)}
              className={cn('group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300', active ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.07] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.04]')}
            >
              <div className="flex items-center gap-2.5">
                <m.icon className={cn('h-4 w-4 transition-colors', active ? 'text-[#ff7a17]' : 'text-gray-500 group-hover:text-gray-300')} />
                <span className={cn('text-[13px] transition-colors', active ? 'text-white' : 'text-gray-400')}>{m.name}</span>
              </div>
              <span className="absolute inset-x-0 bottom-0 h-px bg-white/[0.06]">
                {active && (
                  <span
                    key={`${index}-${paused}`}
                    className="lab-progress block h-full bg-gradient-to-r from-[#ffc285] to-[#ff7a17]"
                    style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused || reduced ? 'paused' : 'running' }}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 md:p-8">
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-[#ff7a17]/10 blur-[100px]" />
        <div key={mod.id} className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)]">
          <div className="lab-line-in flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#ff7a17]">0{index + 1} / 0{MODULES.length}</span>
            <h3 className="mt-3 text-2xl tracking-tight text-white md:text-[28px] md:leading-9">{mod.tagline}</h3>
            <ul className="mt-6 space-y-3">
              {mod.points.map(p => (
                <li key={p} className="flex gap-3 text-[14px] leading-relaxed text-gray-400">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#ffc285]" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href={mod.href} className="group mt-8 inline-flex w-fit items-center gap-2 border-b border-white/20 pb-1 text-[14px] text-white transition-colors hover:border-[#ff7a17]">
              Open {mod.name}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="min-h-[300px]">
            <Panel />
          </div>
        </div>
      </div>
    </div>
  )
}
