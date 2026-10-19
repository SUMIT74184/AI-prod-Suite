'use client'

import { useEffect, useRef, useState } from 'react'
import { Compass, Search, BookOpen, FlaskConical, Bug, ShieldCheck, Gauge, FileText, Cpu, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from './motion'

// Agents mirror the real LangGraph nodes in backend/app/{web_research_agent,code_review_agent}
type Agent = { id: string; label: string; role: string; icon: LucideIcon; logs: string[] }

export const AGENTS: Agent[] = [
  { id: 'plan', label: 'Planner', role: 'decompose', icon: Compass, logs: ['decomposed query into 4 sub-questions', 'drafted research plan · depth=2'] },
  { id: 'search', label: 'Searcher', role: 'retrieve', icon: Search, logs: ['issued 6 queries · 38 candidate sources', 'ranked sources by authority + recency'] },
  { id: 'read', label: 'Reader', role: 'extract', icon: BookOpen, logs: ['parsed 12 pages · 41k tokens extracted', 'chunked + embedded into vector store'] },
  { id: 'analyze', label: 'Analyst', role: 'reason', icon: FlaskConical, logs: ['cross-checked 9 claims across sources', 'flagged 2 contradictory findings'] },
  { id: 'agent_bug', label: 'Bug Hunter', role: 'logic', icon: Bug, logs: ['traced edge case in pagination loop', 'found off-by-one · confidence 0.91'] },
  { id: 'agent_security', label: 'Security', role: 'owasp', icon: ShieldCheck, logs: ['scanning diff for injection sinks', 'SQL string interpolation · severity high'] },
  { id: 'agent_performance', label: 'Perf', role: 'big-O', icon: Gauge, logs: ['detected N+1 query in resolver', 'suggested batched fetch · −84% calls'] },
  { id: 'write_report', label: 'Synthesizer', role: 'report', icon: FileText, logs: ['merged findings · deduplicated 3', 'streaming report with 14 citations'] },
]

const CX = 280
const CY = 280
const R = 200

function nodePos(i: number, n: number, r = R) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }
}

// ─── Cycle through agents; shared by graph + trace ───
export function useAgentCycle(interval = 1700) {
  const [step, setStep] = useState(0)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setStep(s => s + 1), interval)
    return () => clearInterval(id)
  }, [interval, reduced])
  return step
}

// ─── The orchestration graph ───
export function AgentGraph({ step, labels = true, className }: { step: number; labels?: boolean; className?: string }) {
  const n = AGENTS.length
  const active = step % n
  const dispatchRef = useRef<SVGAnimateMotionElement>(null)
  const reduced = usePrefersReducedMotion()
  const activePos = nodePos(active, n)

  useEffect(() => {
    if (reduced) return
    try {
      dispatchRef.current?.beginElement()
    } catch {
      /* SMIL unsupported — packet simply stays hidden */
    }
  }, [step, reduced])

  return (
    <svg viewBox="-100 -10 760 580" className={cn('w-full h-auto overflow-visible', className)} role="img" aria-label="Orchestrator dispatching work to eight specialist agents">
      <defs>
        <radialGradient id="ao-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7a17" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ao-edge-active" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffc285" />
          <stop offset="100%" stopColor="#ff7a17" />
        </linearGradient>
      </defs>

      {/* Orbits */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 8" className="lab-spin-slow" />
      <circle cx={CX} cy={CY} r={R - 80} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="1 6" className="lab-spin-rev" />
      <circle cx={CX} cy={CY} r={R + 46} fill="none" stroke="rgba(255,255,255,0.04)" />
      <circle cx={CX} cy={CY} r={150} fill="url(#ao-core)" />

      {/* Edges */}
      {AGENTS.map((a, i) => {
        const p = nodePos(i, n)
        const isActive = i === active
        return (
          <line
            key={`e-${a.id}`}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            stroke={isActive ? 'url(#ao-edge-active)' : 'rgba(255,255,255,0.09)'}
            strokeWidth={isActive ? 1.6 : 1}
            className={isActive ? 'lab-dash' : undefined}
            style={{ transition: 'stroke 0.4s ease' }}
          />
        )
      })}

      {/* Return packets: results flowing back to the orchestrator */}
      {!reduced &&
        AGENTS.map((a, i) => {
          const p = nodePos(i, n)
          return (
            <circle key={`rp-${a.id}`} r="2" fill="#a0c3ec">
              <animateMotion dur="3.2s" begin={`${(i * 0.41).toFixed(2)}s`} repeatCount="indefinite" path={`M${p.x},${p.y} L${CX},${CY}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" begin={`${(i * 0.41).toFixed(2)}s`} repeatCount="indefinite" />
            </circle>
          )
        })}

      {/* Dispatch packet: orchestrator → active agent */}
      {!reduced && (
        <g>
          {/* Relative path: before the first beginElement() the packet rests hidden under the core */}
          <animateMotion ref={dispatchRef} dur="0.7s" begin="indefinite" fill="freeze" path={`M0,0 L${activePos.x - CX},${activePos.y - CY}`} />
          <circle cx={CX} cy={CY} r="6" fill="#ff7a17" opacity="0.35" />
          <circle cx={CX} cy={CY} r="3" fill="#ffc285" />
        </g>
      )}

      {/* Agent nodes */}
      {AGENTS.map((a, i) => {
        const p = nodePos(i, n)
        const isActive = i === active
        const isDone = !isActive && (i < active || step >= n)
        const Icon = a.icon
        const right = p.x > CX + 10
        const left = p.x < CX - 10
        const lx = right ? p.x + 36 : left ? p.x - 36 : p.x
        const ly = right || left ? p.y - 2 : p.y < CY ? p.y - 44 : p.y + 50
        const anchor = right ? 'start' : left ? 'end' : 'middle'
        return (
          <g key={a.id}>
            {isActive && <circle cx={p.x} cy={p.y} r="26" fill="none" stroke="#ff7a17" strokeWidth="1" className="lab-pulse-ring" />}
            <circle
              cx={p.x}
              cy={p.y}
              r="24"
              fill={isActive ? '#1f140b' : '#0f1012'}
              stroke={isActive ? '#ff7a17' : isDone ? 'rgba(160,195,236,0.35)' : 'rgba(255,255,255,0.14)'}
              strokeWidth={isActive ? 1.5 : 1}
              style={{ transition: 'all 0.4s ease' }}
            />
            <Icon x={p.x - 9} y={p.y - 9} width={18} height={18} color={isActive ? '#ffc285' : 'rgba(255,255,255,0.7)'} strokeWidth={1.6} />
            {labels && (
              <g style={{ transition: 'opacity 0.4s ease' }} opacity={isActive ? 1 : 0.62}>
                <text x={lx} y={ly} textAnchor={anchor} fill="#fff" fontSize="13" fontFamily="Inter, sans-serif">
                  {a.label}
                </text>
                <text x={lx} y={ly + 16} textAnchor={anchor} fill={isActive ? '#ff7a17' : '#7d8187'} fontSize="10" letterSpacing="1.2" fontFamily="'Geist Mono', monospace">
                  {isActive ? 'RUNNING' : a.role.toUpperCase()}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Orchestrator core */}
      <circle cx={CX} cy={CY} r="46" fill="none" stroke="#ff7a17" strokeOpacity="0.5" className="lab-pulse-ring" />
      <circle cx={CX} cy={CY} r="46" fill="#0a0a0a" stroke="rgba(255,194,133,0.6)" strokeWidth="1.2" />
      <circle cx={CX} cy={CY} r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" className="lab-spin-slow" />
      <Cpu x={CX - 11} y={CY - 20} width={22} height={22} color="#ffc285" strokeWidth={1.5} />
      <text x={CX} y={CY + 16} textAnchor="middle" fill="#fff" fontSize="9" letterSpacing="1.6" fontFamily="'Geist Mono', monospace">
        ORCHESTRATOR
      </text>
    </svg>
  )
}

// ─── Graph + trace on one clock ───
export function AgentStage({ compact = false, className }: { compact?: boolean; className?: string }) {
  const step = useAgentCycle()
  return (
    <div className={cn('relative', className)}>
      <AgentGraph step={step} labels={!compact} />
      <AgentTrace step={step} rows={compact ? 4 : 5} className={compact ? 'mt-2' : 'lab-float relative mx-auto mt-2 max-w-[480px]'} />
    </div>
  )
}

// ─── Live trace log ───
type Line = { key: number; t: string; agent: string; msg: string }

export function AgentTrace({ step, rows = 6, className }: { step: number; rows?: number; className?: string }) {
  const n = AGENTS.length
  const build = (s: number): Line => {
    const a = AGENTS[s % n]
    return { key: s, t: (s * 1.7 + 0.42).toFixed(1).padStart(5, '0'), agent: a.id, msg: a.logs[Math.floor(s / n) % a.logs.length] }
  }
  const lines: Line[] = []
  for (let s = Math.max(0, step - rows + 1); s <= step; s++) lines.push(build(s))

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-[#0c0d0f]/90 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]', className)}>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">trace · run_0042</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          streaming
        </span>
      </div>
      <div className="px-4 py-3 font-mono text-[11.5px] leading-[1.9]" style={{ minHeight: rows * 21.85 + 24 }}>
        {lines.map((l, idx) => {
          const latest = idx === lines.length - 1
          return (
            <div key={l.key} className={cn('flex gap-3 whitespace-nowrap overflow-hidden', latest ? 'lab-line-in' : 'opacity-55')}>
              <span className="text-gray-600 shrink-0">t+{l.t}s</span>
              <span className={cn('shrink-0 w-[118px] truncate', latest ? 'text-[#ff7a17]' : 'text-[#a0c3ec]/70')}>{l.agent}</span>
              <span className={cn('truncate', latest ? 'text-gray-100' : 'text-gray-400')}>
                {l.msg}
                {latest && <span className="lab-caret ml-0.5 text-[#ff7a17]">▍</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
