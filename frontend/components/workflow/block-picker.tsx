'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, X, Zap, Sparkles, Flame, Cog, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bubbleFill, type WorkflowNodeData } from './workflow-node'

export interface PickerCategory {
  title: string
  accent: string
  items: string[]
  type: WorkflowNodeData['type']
}

export type PickerMode =
  | { kind: 'trigger' }
  | { kind: 'any' }
  | { kind: 'after'; label: string }
  | { kind: 'between'; from: string; to: string }

const POPULAR = ['Upload Document', 'Extract Skills', 'Summarize', 'Generate Content', 'Send Email', 'Webhook Call']

// Zapier-style "Add a step" dialog: categories on the left, searchable block grid on the right
export default function BlockPicker({
  mode,
  categories,
  icons,
  hints,
  onPick,
  onClose,
}: {
  mode: PickerMode
  categories: PickerCategory[]
  icons: Record<string, ReactNode>
  hints: Record<string, string>
  onPick: (label: string, type: WorkflowNodeData['type']) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<string>(mode.kind === 'trigger' ? 'Triggers' : 'Popular')

  // Triggers only start a flow; steps after/between others can't be triggers
  const allowed = useMemo(
    () => categories.filter(c => (mode.kind === 'trigger' ? c.type === 'input' : mode.kind === 'any' ? true : c.type !== 'input')),
    [categories, mode.kind]
  )
  const typeOf = (label: string) => allowed.find(c => c.items.includes(label))

  const sections = [
    ...(mode.kind === 'trigger' ? [] : [{ title: 'Popular', icon: Flame }]),
    ...allowed.map(c => ({ title: c.title, icon: c.type === 'input' ? Zap : c.type === 'process' ? Sparkles : Cog })),
  ]

  const q = query.trim().toLowerCase()
  const items: string[] = q
    ? allowed.flatMap(c => c.items).filter(l => l.toLowerCase().includes(q) || (hints[l] || '').toLowerCase().includes(q))
    : section === 'Popular'
      ? POPULAR.filter(l => typeOf(l))
      : allowed.find(c => c.title === section)?.items || []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = mode.kind === 'trigger' ? 'Choose a trigger' : 'Add a step'
  const subtitle =
    mode.kind === 'trigger'
      ? 'An event that starts your workflow.'
      : mode.kind === 'after'
        ? <>Runs after <span className="text-gray-200">{mode.label}</span></>
        : mode.kind === 'between'
          ? <>Inserted between <span className="text-gray-200">{mode.from}</span> and <span className="text-gray-200">{mode.to}</span></>
          : 'An event your workflow performs.'

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/55 p-6 pt-16 backdrop-blur-[2px] animate-in fade-in duration-150" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onMouseDown={e => e.stopPropagation()}
        className="flex max-h-[min(560px,100%)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111113] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
      >
        {/* Header + search */}
        <div className="border-b border-white/[0.07] p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] tracking-tight text-white">{title}</h2>
              <p className="mt-0.5 text-[12.5px] text-gray-500">{subtitle}</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="ws-field flex h-11 items-center gap-2.5 rounded-xl px-3.5">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode.kind === 'trigger' ? 'Search triggers…' : 'Search apps and events…'}
              className="flex-1 bg-transparent text-[14px] text-white placeholder-gray-600 outline-none"
            />
            <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-500">esc</kbd>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Categories */}
          <nav className="w-48 shrink-0 space-y-0.5 overflow-y-auto border-r border-white/[0.07] p-2">
            {sections.map(sec => {
              const active = !q && section === sec.title
              return (
                <button
                  key={sec.title}
                  onClick={() => { setSection(sec.title); setQuery('') }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                    active ? 'bg-white/[0.07] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  <sec.icon className={cn('h-3.5 w-3.5', active ? 'text-[#ffc285]' : 'text-gray-500')} />
                  {sec.title === 'Processing' ? 'AI & processing' : sec.title}
                </button>
              )
            })}
          </nav>

          {/* Block grid */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
              {q ? `Results for “${query}”` : section === 'Processing' ? 'AI & processing' : section}
            </p>
            {items.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {items.map(label => {
                  const cat = typeOf(label)!
                  return (
                    <button
                      key={label}
                      onClick={() => onPick(label, cat.type)}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-left transition-all hover:border-[#ff7a17]/40 hover:bg-white/[0.04]"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105 [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[2]"
                        style={{ background: bubbleFill(cat.accent), boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -6px ${cat.accent}99` }}
                      >
                        {icons[label] || <Sparkles />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-gray-100">{label}</span>
                        <span className="block truncate text-[11.5px] text-gray-500">{hints[label] || 'Custom step'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="px-1 py-10 text-center text-[13px] text-gray-500">No blocks match “{query}”.</p>
            )}
          </div>
        </div>

        {mode.kind !== 'trigger' && (
          <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5">
            <span className="text-[12px] text-gray-600">Can’t find it? Start from a blank step.</span>
            <button
              onClick={() => onPick('New Step', 'process')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3 py-1 text-[12.5px] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Custom step
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
