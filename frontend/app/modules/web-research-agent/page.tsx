'use client'

import { useState, useRef } from 'react'
export const dynamic = 'force-dynamic'
import { Loader2, Download, CheckCircle2, Circle, AlertCircle, Globe, Search, BookOpen, Brain, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NodeStatus = 'pending' | 'active' | 'done' | 'error'

interface AgentStep {
  id: string
  label: string        // display name
  icon: React.ReactNode
  status: NodeStatus
  message: string      // detail line shown below label
}

interface ResearchResult {
  report: string
  sources: string[]
  sub_queries: string[]
  iteration: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_STEPS: AgentStep[] = [
  { id: 'plan',         label: 'Plan',         icon: <Brain className="w-4 h-4" />,     status: 'pending', message: 'Waiting' },
  { id: 'search',       label: 'Search',        icon: <Search className="w-4 h-4" />,    status: 'pending', message: 'Waiting' },
  { id: 'read',         label: 'Read Pages',    icon: <BookOpen className="w-4 h-4" />,  status: 'pending', message: 'Waiting' },
  { id: 'analyze',      label: 'Analyze',       icon: <Brain className="w-4 h-4" />,     status: 'pending', message: 'Waiting' },
  { id: 'write_report', label: 'Write Report',  icon: <FileText className="w-4 h-4" />,  status: 'pending', message: 'Waiting' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WebResearchAgentPage() {
  const [query, setQuery] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [subQueries, setSubQueries] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [streamLog, setStreamLog] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const resetState = () => {
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', message: 'Waiting' })))
    setResult(null)
    setSubQueries([])
    setSources([])
    setStreamLog([])
  }

  const setStepStatus = (stepId: string, status: NodeStatus, message: string) => {
    setSteps(prev => prev.map(s => {
      if (s.id === stepId) return { ...s, status, message }
      // Mark all previous steps as done when a new one goes active
      const idx = INITIAL_STEPS.findIndex(x => x.id === s.id)
      const activeIdx = INITIAL_STEPS.findIndex(x => x.id === stepId)
      if (idx < activeIdx && s.status !== 'done') return { ...s, status: 'done', message: 'Complete' }
      return s
    }))
  }

  // ---------------------------------------------------------------------------
  // Main research handler — SSE streaming
  // ---------------------------------------------------------------------------

  const handleResearch = async () => {
    if (!query.trim() || isResearching) return

    resetState()
    setIsResearching(true)

    abortRef.current = new AbortController()

    try {
      // Single SSE stream — runs the agent ONCE.
      // The final "complete" event carries the full report + sources.
      const streamUrl = `/api/py/web-research/stream?query=${encodeURIComponent(query)}`
      const response = await fetch(streamUrl, { signal: abortRef.current.signal })

      if (!response.ok) throw new Error(`Stream failed: ${response.statusText}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            const { status, message, data } = event

            setStreamLog(prev => [...prev, `[${status}] ${message}`])

            switch (status) {
              case 'plan':
                setStepStatus('plan', 'done', `${data.sub_queries?.length ?? 0} sub-queries planned`)
                setSubQueries(data.sub_queries ?? [])
                break

              case 'search':
                setStepStatus('search', 'active', `Found ${data.result_count ?? 0} results (pass ${data.iteration ?? 1})`)
                break

              case 'read':
                setStepStatus('search', 'done', 'Done')
                setStepStatus('read', 'active', `Reading ${data.pages_fetched ?? 0} pages`)
                if (data.sources?.length) setSources(prev => [...new Set([...prev, ...data.sources])])
                break

              case 'analyze':
                setStepStatus('read', 'done', 'Done')
                setStepStatus('analyze', 'active', data.needs_more ? 'Needs more info — looping back…' : 'Sufficient data found')
                break

              case 'write_report':
                setStepStatus('analyze', 'done', 'Done')
                setStepStatus('write_report', 'active', 'Writing report…')
                break

              case 'complete':
                // The final event carries the full report — no second API call needed
                setStepStatus('write_report', 'done', 'Done')
                setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const, message: 'Complete' })))
                setResult({
                  report:      data.report ?? '',
                  sources:     data.sources ?? [],
                  sub_queries: data.sub_queries ?? [],
                  iteration:   data.iteration ?? 0,
                })
                setSubQueries(data.sub_queries ?? [])
                setSources(data.sources ?? [])
                break

              case 'error':
                setSteps(prev => prev.map(s =>
                  s.status === 'active' ? { ...s, status: 'error' as const, message: 'Failed' } : s
                ))
                break
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Research failed:', err)
      setSteps(prev => prev.map(s =>
        s.status === 'active' ? { ...s, status: 'error' as const, message: 'Failed' } : s
      ))
    } finally {
      setIsResearching(false)
    }
  }

  const handleExport = () => {
    if (!result?.report) return
    const a = document.createElement('a')
    a.href = `data:text/markdown;charset=utf-8,${encodeURIComponent(result.report)}`
    a.download = `research-${Date.now()}.md`
    a.click()
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">

      {/* Header */}
      <div className="border-b border-[#212327] px-6 py-4 flex-shrink-0">
        <p className="xai-caption-mono-sm text-[#7d8187] mb-1">Research</p>
        <h1 className="xai-display-xs text-white">Web Research Agent</h1>
        <p className="text-sm text-[#7d8187] mt-1 font-normal">
          LangGraph multi-step agent · plan → search → read → analyze → report
        </p>
      </div>

      {/* Search Input */}
      <div className="px-6 py-5 flex-shrink-0 border-b border-[#212327]">
        <div className="max-w-2xl flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#191919] border border-[#212327] rounded-full px-4 py-2.5 focus-within:border-[rgba(255,255,255,0.25)] transition-all">
            <Globe className="w-4 h-4 text-[#7d8187] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResearch()}
              placeholder="Enter a research topic — e.g. 'LangGraph for production AI agents'"
              disabled={isResearching}
              className="flex-1 bg-transparent text-white placeholder-[#7d8187] focus:outline-none text-sm font-normal"
            />
          </div>
          <button
            onClick={handleResearch}
            disabled={isResearching || !query.trim()}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
              isResearching || !query.trim()
                ? 'bg-[#191919] text-[#7d8187] border border-[#212327]'
                : 'bg-white text-[#0a0a0a] hover:opacity-90'
            )}
          >
            {isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {isResearching ? 'Researching…' : 'Research'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-4 gap-0">

        {/* Left Sidebar: Agent Progress */}
        <div className="col-span-1 border-r border-[#212327] p-5 overflow-y-auto">
          <p className="xai-caption-mono-sm text-[#7d8187] mb-5">Agent Steps</p>

          <div className="space-y-1">
            {steps.map((step, idx) => (
              <div key={step.id}>
                <div className={cn(
                  'flex items-start gap-3 p-3 rounded-xl transition-all',
                  step.status === 'active' && 'bg-[#1a1c20] border border-[#212327]',
                  step.status === 'done' && 'opacity-60',
                )}>
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === 'pending' && <Circle className="w-5 h-5 text-[#3a3a3a]" />}
                    {step.status === 'active' && <Loader2 className="w-5 h-5 text-white animate-spin" />}
                    {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {step.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-medium', step.status === 'pending' ? 'text-[#7d8187]' : 'text-white')}>
                        {step.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#4a4a4a] mt-0.5 truncate">{step.message}</p>
                  </div>
                </div>

                {/* Connector line between steps */}
                {idx < steps.length - 1 && (
                  <div className="ml-[22px] w-px h-3 bg-[#1e1e1e]" />
                )}
              </div>
            ))}
          </div>

          {/* Sub-queries */}
          {subQueries.length > 0 && (
            <div className="mt-6">
              <p className="xai-caption-mono-sm text-[#7d8187] mb-3">Sub-queries</p>
              <div className="space-y-2">
                {subQueries.map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Search className="w-3 h-3 text-[#7d8187] mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-[#9ca3af] font-normal leading-snug">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-6">
              <p className="xai-caption-mono-sm text-[#7d8187] mb-3">Sources ({sources.length})</p>
              <div className="space-y-1.5">
                {sources.slice(0, 10).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-mono text-[#4a4a4a] hover:text-[#7d8187] transition-colors truncate"
                  >
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    {new URL(url).hostname.replace('www.', '')}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Report Area */}
        <div className="col-span-3 flex flex-col overflow-hidden">
          {/* Report toolbar */}
          <div className="border-b border-[#212327] px-6 py-3 flex items-center justify-between flex-shrink-0">
            <p className="xai-caption-mono-sm text-[#7d8187]">Research Report</p>
            {result?.report && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs font-mono text-[#7d8187] hover:text-white transition-colors px-3 py-1.5 rounded-full border border-[#212327] hover:border-[rgba(255,255,255,0.2)]"
              >
                <Download className="w-3.5 h-3.5" />
                Export .md
              </button>
            )}
          </div>

          {/* Report content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Empty state */}
            {!isResearching && !result && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#191919] border border-[#212327] flex items-center justify-center">
                  <Globe className="w-8 h-8 text-[#3a3a3a]" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Enter a topic to research</p>
                  <p className="text-sm text-[#7d8187] font-normal max-w-sm">
                    The LangGraph agent will plan, search, read pages, analyze,
                    and write a comprehensive report automatically.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['LangGraph production guide', 'RAG vs fine-tuning comparison', 'AI agent frameworks 2024'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="text-xs font-mono text-[#7d8187] px-3 py-1.5 rounded-full border border-[#212327] hover:border-[rgba(255,255,255,0.2)] hover:text-white transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isResearching && !result && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <p className="text-white font-medium">Agent is researching…</p>
                <div className="mt-4 max-w-md w-full bg-[#191919] border border-[#212327] rounded-xl p-4">
                  <p className="xai-caption-mono-sm text-[#7d8187] mb-2">Agent Log</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {streamLog.map((log, i) => (
                      <p key={i} className="text-[10px] font-mono text-[#4a4a4a]">{log}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Report */}
            {result?.report && (
              <div className="max-w-3xl mx-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-[#dadbdf] whitespace-pre-wrap leading-relaxed font-normal text-sm">
                    {result.report}
                  </div>
                </div>

                {/* Metadata footer */}
                <div className="mt-8 pt-6 border-t border-[#212327] flex items-center gap-6 text-[10px] font-mono text-[#4a4a4a]">
                  <span>{result.sources.length} sources</span>
                  <span>{result.sub_queries.length} sub-queries</span>
                  <span>{result.iteration} search iteration{result.iteration !== 1 ? 's' : ''}</span>
                  <span>{result.report.length.toLocaleString()} chars</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
