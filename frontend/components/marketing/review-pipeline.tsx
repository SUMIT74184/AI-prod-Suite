'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useInView, usePrefersReducedMotion } from './motion'

// Mirrors backend/app/code_review_agent/graph.py (sequential to respect provider rate limits)
const STAGES: { group: string; nodes: string[] }[] = [
  { group: 'Context', nodes: ['context_builder'] },
  { group: 'Specialists', nodes: ['agent_bug', 'agent_security', 'agent_performance', 'agent_architecture', 'agent_quality'] },
  { group: 'Verification', nodes: ['validate_findings', 'deduplicate_findings'] },
  { group: 'Synthesis', nodes: ['aggregate_report', 'generate_fixes', 'generate_tests'] },
  { group: 'Output', nodes: ['finalize_review'] },
]
const FLAT = STAGES.flatMap(s => s.nodes)

export function ReviewPipeline() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  const reduced = usePrefersReducedMotion()
  const [cursor, setCursor] = useState(-1)

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setCursor(FLAT.length)
      return
    }
    const id = setInterval(() => setCursor(c => (c >= FLAT.length + 2 ? 0 : c + 1)), 650)
    return () => clearInterval(id)
  }, [inView, reduced])

  const progress = Math.max(0, Math.min(1, cursor / (FLAT.length - 1)))

  return (
    <div ref={ref} className="relative">
      {/* Progress rail (desktop) */}
      <div className="absolute left-0 right-0 top-[22px] hidden h-px bg-white/10 lg:block">
        <div className="h-full origin-left bg-gradient-to-r from-[#ffc285] via-[#ff7a17] to-[#c4b5fd] transition-transform duration-500 ease-out" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-4">
        {STAGES.map((stage, si) => {
          const firstIdx = FLAT.indexOf(stage.nodes[0])
          const stageActive = cursor >= firstIdx
          return (
            <div key={stage.group} className="relative">
              <div className="mb-5 flex items-center gap-3">
                <span className={cn('relative z-10 flex h-11 w-11 items-center justify-center rounded-full border font-mono text-[12px] transition-all duration-500', stageActive ? 'border-[#ff7a17]/60 bg-[#1a120b] text-[#ffc285] shadow-[0_0_24px_rgba(255,122,23,0.35)]' : 'border-white/10 bg-[#0d0e10] text-gray-500')}>
                  0{si + 1}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gray-400">{stage.group}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stage.nodes.map(node => {
                  const idx = FLAT.indexOf(node)
                  const state = cursor > idx ? 'done' : cursor === idx ? 'run' : 'wait'
                  return (
                    <div
                      key={node}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 font-mono text-[11.5px] transition-all duration-500',
                        state === 'run' && 'border-[#ff7a17]/50 bg-[#ff7a17]/[0.08] text-white translate-x-1',
                        state === 'done' && 'border-white/10 bg-white/[0.03] text-gray-300',
                        state === 'wait' && 'border-white/[0.06] bg-transparent text-gray-600'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full transition-colors', state === 'run' ? 'bg-[#ff7a17] shadow-[0_0_8px_#ff7a17]' : state === 'done' ? 'bg-emerald-400/80' : 'bg-white/15')} />
                      <span className="truncate">{node}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
