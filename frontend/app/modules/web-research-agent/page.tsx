'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
// export const dynamic = 'force-dynamic'
import { Loader2, Download, CheckCircle2, AlertCircle, Globe, Search, BookOpen, Brain, FileText, ArrowRight, ArrowUpRight, Check, ChevronRight, Copy, Plus, RotateCw, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import { Markdown, extractHeadings } from '@/components/workspace/markdown'
import { ModuleHeader, MonoLabel, StatusDot, Kbd, ui } from '@/components/workspace/kit'
import { SegmentTabs } from '@/components/workspace/review-report'

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

function WebResearchAgentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')

  const [query, setQuery] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [subQueries, setSubQueries] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [streamLog, setStreamLog] = useState<string[]>([])
  const [liveInsights, setLiveInsights] = useState<{
    topResults?: Array<{title: string, url: string, snippet: string}>
    pagePreviews?: Array<{title: string, url: string, word_count: number}>
    synthesis?: string
    gaps?: string
    confidence?: string
    reportPreview?: string
    sections?: string[]
  }>({})
  const abortRef = useRef<AbortController | null>(null)

  // Studio UI state
  const [view, setView] = useState<'report' | 'activity'>('report')
  const [copied, setCopied] = useState(false)

  // ---------------------------------------------------------------------------
  // Load Session History
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (sessionId) {
      const fetchSession = async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/py/conversations/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.messages && data.messages.length >= 2) {
              const userMsg = data.messages.find((m: any) => m.role === 'user')
              const asstMsg = data.messages.find((m: any) => m.role === 'assistant')
              
              if (userMsg) setQuery(userMsg.content)
              
              if (asstMsg) {
                try {
                  // Try to parse the rich JSON we saved in the backend
                  const parsedData = JSON.parse(asstMsg.content)
                  setResult({
                    report: parsedData.report || '',
                    sources: parsedData.sources || [],
                    sub_queries: parsedData.sub_queries || [],
                    iteration: parsedData.iteration || 0,
                  })
                  setSources(parsedData.sources || [])
                  setSubQueries(parsedData.sub_queries || [])
                  setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'done' as const, message: 'Loaded from history' })))
                } catch (e) {
                  // Fallback: it might just be the raw string if we failed to parse
                  setResult({
                    report: asstMsg.content,
                    sources: [],
                    sub_queries: [],
                    iteration: 0,
                  })
                  setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'done' as const, message: 'Loaded from history' })))
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to load session', err)
        }
      }
      fetchSession()
    } else {
      resetState()
      setQuery('')
    }
  }, [sessionId])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const resetState = () => {
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', message: 'Waiting' })))
    setResult(null)
    setSubQueries([])
    setSources([])
    setStreamLog([])
    setLiveInsights({})
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
    
    // Set first step to active immediately
    setSteps(prev => prev.map(s => 
      s.id === 'plan' ? { ...s, status: 'active', message: 'Generating sub-queries...' } : s
    ))

    abortRef.current = new AbortController()

    // Generate a new session ID if we don't have one, or always generate a new one for a new search
    const currentSessionId = crypto.randomUUID()
    
    // Update URL without a page reload so the sidebar can highlight it
    router.push(`/modules/web-research-agent?sessionId=${currentSessionId}`)

    try {
      // Single SSE stream — runs the agent ONCE.
      // The final "complete" event carries the full report + sources.
      const streamUrl = `/api/py/web-research/stream?query=${encodeURIComponent(query)}&session_id=${currentSessionId}`
      const response = await fetch(streamUrl, { 
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: abortRef.current.signal 
      })

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
                setStepStatus('search', 'active', 'Searching DuckDuckGo...')
                setSubQueries(data.sub_queries ?? [])
                break

              case 'search':
                setStepStatus('search', 'done', `Found ${data.result_count ?? 0} results`)
                setStepStatus('read', 'active', 'Fetching page content...')
                if (data.top_results) {
                  setLiveInsights(prev => ({ ...prev, topResults: data.top_results }))
                }
                break

              case 'read':
                setStepStatus('read', 'done', `Read ${data.pages_fetched ?? 0} pages`)
                setStepStatus('analyze', 'active', 'Synthesizing findings...')
                if (data.sources?.length) setSources(prev => [...new Set([...prev, ...data.sources])])
                if (data.page_previews) {
                  setLiveInsights(prev => ({ ...prev, pagePreviews: data.page_previews }))
                }
                break

              case 'analyze':
                setStepStatus('analyze', 'done', data.needs_more ? 'Needs more info' : 'Sufficient data')
                if (data.needs_more) {
                   setStepStatus('search', 'active', 'Looping back for more search...')
                } else {
                   setStepStatus('write_report', 'active', 'Drafting report...')
                }
                if (data.synthesis) {
                  setLiveInsights(prev => ({
                    ...prev,
                    synthesis: data.synthesis,
                    gaps: data.gaps,
                    confidence: data.confidence
                  }))
                }
                break

              case 'write_report':
                setStepStatus('write_report', 'done', 'Draft complete')
                if (data.report_preview) {
                   setLiveInsights(prev => ({
                     ...prev,
                     reportPreview: data.report_preview,
                     sections: data.sections
                   }))
                }
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
                
                // Notify the sidebar to refresh so the new session appears
                window.dispatchEvent(new Event('refresh-conversations'))
                break

              case 'error':
                setSteps(prev => prev.map(s =>
                  s.status === 'active' || s.status === 'pending' ? { ...s, status: 'error' as const, message: data.message || 'Failed' } : s
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

  const inStudio = isResearching || !!result
  const headings = result?.report ? extractHeadings(result.report).filter(h => h.level > 1) : []
  const wordCount = result?.report ? result.report.split(/\s+/).filter(Boolean).length : 0
  const searchDone = steps.find(s => s.id === 'search')?.status === 'done'

  const handleCopyReport = () => {
    if (!result?.report) return
    navigator.clipboard.writeText(result.report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleResearch()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      <ModuleHeader
        index="M.04"
        section="Research"
        title="Web Research"
        accent="Agent"
        description="LangGraph multi-step agent · plan → search → read → analyze → report"
        actions={inStudio && !isResearching && (
          <button onClick={() => router.push('/modules/web-research-agent')} className={ui.btnOutline}>
            <Plus className="h-3.5 w-3.5" />
            New research
          </button>
        )}
      />

      {!inStudio ? (
        /* ─── Start page ─── */
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-0 opacity-70" />
          <div className="lab-aurora pointer-events-none absolute left-1/2 top-10 h-[320px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,23,0.14),rgba(124,58,237,0.08),transparent)] blur-2xl" />

          <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-14">
            <div className="lab-enter">
              <MonoLabel index="◆">Deep research</MonoLabel>
              <h2 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.035em] text-white">
                What should the agents <span className="lab-serif lab-accent-gradient pr-1">look into?</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-400">
                The LangGraph agent will plan, search, read pages, analyze, and write a comprehensive report automatically.
              </p>
            </div>

            {/* Composer */}
            <div className="lab-enter ws-field mt-8 rounded-2xl p-2 shadow-[0_30px_80px_-40px_rgba(255,122,23,0.45)]" style={{ animationDelay: '100ms' }}>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleComposerKey}
                rows={3}
                autoFocus
                placeholder="Enter a research topic — e.g. 'LangGraph for production AI agents'"
                className="w-full resize-none bg-transparent px-3 pt-2 text-[16px] leading-relaxed text-white placeholder-gray-600 outline-none"
              />
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-2 pt-2">
                <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-600">
                  <Globe className="h-3.5 w-3.5 text-[#ffc285]" />
                  Live web · cited sources
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="hidden text-[11px] text-gray-600 sm:inline"><Kbd>↵</Kbd> run · <Kbd>⇧↵</Kbd> newline</span>
                  <button onClick={handleResearch} disabled={!query.trim()} className={cn(ui.btnPrimary, 'h-9')}>
                    Research
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="lab-enter mt-4 grid gap-2 sm:grid-cols-3" style={{ animationDelay: '200ms' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s.q}
                  onClick={() => setQuery(s.q)}
                  className="group flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-left transition-all hover:border-[#ff7a17]/35 hover:bg-[#ff7a17]/[0.04]"
                >
                  <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                    {s.tag}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="text-[13.5px] leading-snug text-gray-300 group-hover:text-white">{s.q}</span>
                </button>
              ))}
            </div>

            {/* How it works */}
            <div className="lab-enter mt-14" style={{ animationDelay: '300ms' }}>
              <MonoLabel index="01" className="mb-5">How the agent works</MonoLabel>
              <GraphFlow />
            </div>
          </div>
        </div>
      ) : (
        /* ─── Studio ─── */
        <div className="flex min-h-0 flex-1 gap-3 p-3">
          {/* LEFT: run panel */}
          <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070708]">
            <div className="border-b border-white/[0.06] p-4">
              <MonoLabel index="01" className="mb-2.5">Question</MonoLabel>
              <div className="ws-field flex items-start gap-2 rounded-xl p-1.5">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleComposerKey}
                  disabled={isResearching}
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1 text-[14px] leading-snug text-white outline-none disabled:opacity-70"
                />
                <button
                  onClick={handleResearch}
                  disabled={isResearching || !query.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-[#ffc285] disabled:bg-white/[0.06] disabled:text-gray-500"
                  title="Run again"
                >
                  {isResearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-4">
              {/* Agent trace */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <MonoLabel index="02">Agent graph</MonoLabel>
                  {result && result.iteration > 0 && <span className={ui.chip}>{result.iteration} loop{result.iteration !== 1 ? 's' : ''}</span>}
                </div>
                <ol>
                  {steps.map((step, idx) => (
                    <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {idx < steps.length - 1 && (
                        <span className={cn(
                          'absolute left-[13px] top-7 h-[calc(100%-24px)] w-px',
                          step.status === 'done' ? 'bg-gradient-to-b from-emerald-400/50 to-white/10' : 'bg-white/[0.07]'
                        )} />
                      )}
                      <span className={cn(
                        'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-500',
                        step.status === 'pending' && 'border-white/10 bg-[#0d0e10] text-gray-600',
                        step.status === 'active' && 'border-[#ff7a17]/60 bg-[#1a120b] text-[#ffc285] shadow-[0_0_20px_rgba(255,122,23,0.35)]',
                        step.status === 'done' && 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
                        step.status === 'error' && 'border-red-400/40 bg-red-500/10 text-red-300',
                      )}>
                        {step.status === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                          step.status === 'done' ? <Check className="h-3.5 w-3.5" /> :
                          step.status === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> :
                          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{step.icon}</span>}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className={cn('text-[13px]', step.status === 'pending' ? 'text-gray-500' : 'text-white')}>{step.label}</p>
                        <p className={cn('mt-0.5 truncate font-mono text-[10.5px]', step.status === 'active' ? 'text-[#ffc285]' : 'text-gray-600')}>{step.message}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Sub-queries */}
              {subQueries.length > 0 && (
                <div>
                  <MonoLabel index="03" className="mb-3">Sub-queries · {subQueries.length}</MonoLabel>
                  <ol className="space-y-1">
                    {subQueries.map((q, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 80}ms` }}>
                        <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', searchDone ? 'border-emerald-400/30 text-emerald-300' : 'border-white/15 text-gray-600')}>
                          {searchDone ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                        </span>
                        <p className="text-[12.5px] leading-snug text-gray-400">{q}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Sources */}
              {sources.length > 0 && (
                <div>
                  <MonoLabel index="04" className="mb-3">Sources · {sources.length}</MonoLabel>
                  <div className="space-y-1">
                    {sources.slice(0, 12).map((url, i) => {
                      const { host, path } = splitUrl(url)
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-white/[0.07] hover:bg-white/[0.03] animate-in fade-in"
                        >
                          <SourceAvatar host={host} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] text-gray-200">{host}</p>
                            <p className="truncate font-mono text-[10px] text-gray-600">{path || '/'}</p>
                          </div>
                          <span className="font-mono text-[10px] text-gray-700 group-hover:hidden">[{i + 1}]</span>
                          <ArrowUpRight className="hidden h-3 w-3 text-gray-400 group-hover:block" />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT: report / live notebook */}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0b0c]">
            <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4">
              {result?.report ? (
                <SegmentTabs
                  value={view}
                  onChange={setView}
                  tabs={[
                    { id: 'report', label: 'Report' },
                    { id: 'activity', label: `Activity ${streamLog.length || ''}`.trim() },
                  ]}
                />
              ) : (
                <span className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-400">
                  <StatusDot tone="live" /> Live notebook
                </span>
              )}
              {result?.report && (
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyReport} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleExport} className={cn(ui.btnOutline, 'py-1')}>
                    <Download className="h-3.5 w-3.5" />
                    Export .md
                  </button>
                </div>
              )}
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {/* Live notebook while running */}
              {isResearching && !result && (
                <div className="mx-auto max-w-2xl px-6 py-8">
                  <p className="mb-8 text-[22px] leading-snug tracking-[-0.02em] text-white">
                    Researching <span className="lab-serif text-[#ffc285]">“{query}”</span>
                  </p>

                  <ol className="relative space-y-4 border-l border-white/[0.07] pl-6">
                    <NotebookEntry icon={Brain} label="Plan" done={subQueries.length > 0} waiting="Breaking the question into sub-queries…">
                      {subQueries.length > 0 && <p className="text-[13.5px] text-gray-300">{subQueries.length} sub-queries planned — see the left panel.</p>}
                    </NotebookEntry>

                    {(liveInsights.topResults?.length || steps.find(s => s.id === 'search')?.status === 'active') && (
                      <NotebookEntry icon={Search} label="Latest search findings" done={!!liveInsights.topResults?.length} waiting="Searching the web…">
                        {liveInsights.topResults && (
                          <div className="space-y-2.5">
                            {liveInsights.topResults.slice(0, 3).map((res, i) => (
                              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                                <p className="truncate text-[13px] text-gray-200">{res.title}</p>
                                <p className="mt-0.5 truncate font-mono text-[10.5px] text-gray-600">{res.url}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </NotebookEntry>
                    )}

                    {liveInsights.pagePreviews && liveInsights.pagePreviews.length > 0 && (
                      <NotebookEntry icon={BookOpen} label="Reading source material" done>
                        <div className="space-y-1.5">
                          {liveInsights.pagePreviews.map((page, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <p className="truncate text-[13px] text-gray-300">{page.title || page.url}</p>
                              <span className="shrink-0 font-mono text-[10.5px] text-gray-500">{page.word_count} words</span>
                            </div>
                          ))}
                        </div>
                      </NotebookEntry>
                    )}

                    {liveInsights.synthesis && (
                      <NotebookEntry
                        icon={Brain}
                        label="Live synthesis"
                        done
                        badge={liveInsights.confidence && (
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider',
                            liveInsights.confidence === 'high' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/25 bg-amber-500/10 text-amber-300'
                          )}>
                            {liveInsights.confidence === 'high' ? 'Sufficient Data' : 'Needs More Info'}
                          </span>
                        )}
                      >
                        <p className="text-[13.5px] leading-relaxed text-gray-300">{liveInsights.synthesis}</p>
                        {liveInsights.gaps && (
                          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[13px] text-gray-400">
                            <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Gaps</span>
                            {liveInsights.gaps}
                          </p>
                        )}
                      </NotebookEntry>
                    )}

                    {liveInsights.reportPreview && (
                      <NotebookEntry icon={FileText} label="Drafting report" done={false} waiting="">
                        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-400 [mask-image:linear-gradient(180deg,#000_40%,transparent)]">{liveInsights.reportPreview}</p>
                      </NotebookEntry>
                    )}
                  </ol>

                  <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#0c0d0f] px-4 py-3 font-mono text-[11.5px] text-gray-500">
                    <span className="text-[#ff7a17]">❯</span> {streamLog[streamLog.length - 1] || 'Initializing...'}
                    <span className="lab-caret ml-1 text-gray-400">▍</span>
                  </div>
                </div>
              )}

              {/* Final report */}
              {result?.report && view === 'report' && (
                <div className="mx-auto flex max-w-[1080px] gap-10 px-6 py-10">
                  <article className="min-w-0 max-w-[720px] flex-1">
                    <div className="mb-8 border-b border-white/[0.06] pb-6">
                      <MonoLabel index="◆">Research report</MonoLabel>
                      <p className="mt-3 text-[13px] text-gray-500">
                        Answering <span className="lab-serif text-[15px] text-gray-300">“{query}”</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className={ui.chip}><Globe className="h-3 w-3 text-[#ffc285]" />{result.sources.length} sources</span>
                        <span className={ui.chip}>{result.sub_queries.length} sub-queries</span>
                        <span className={ui.chip}>{result.iteration} search iteration{result.iteration !== 1 ? 's' : ''}</span>
                        <span className={ui.chip}>~{Math.max(1, Math.round(wordCount / 220))} min read</span>
                      </div>
                    </div>
                    <Markdown content={result.report} />
                  </article>

                  {headings.length > 1 && (
                    <nav className="sticky top-10 hidden w-52 shrink-0 self-start xl:block">
                      <MonoLabel className="mb-3">On this page</MonoLabel>
                      <ul className="space-y-0.5 border-l border-white/[0.07]">
                        {headings.map(h => (
                          <li key={h.id}>
                            <button
                              onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className={cn('-ml-px block w-full truncate border-l border-transparent py-1 text-left text-[12.5px] text-gray-500 transition-colors hover:border-[#ff7a17] hover:text-white', h.level === 3 ? 'pl-6' : 'pl-3')}
                            >
                              {h.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}
                </div>
              )}

              {/* Activity log */}
              {result?.report && view === 'activity' && (
                <div className="mx-auto max-w-2xl px-6 py-8">
                  {streamLog.length === 0 ? (
                    <p className="text-center text-[13px] text-gray-500">This report was loaded from history — no live activity was recorded.</p>
                  ) : (
                    <ol className="space-y-1 font-mono text-[12px]">
                      {streamLog.map((line, i) => {
                        const m = /^\[(\w+)\]\s*(.*)$/.exec(line)
                        return (
                          <li key={i} className="flex gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.02]">
                            <span className="w-6 shrink-0 text-right text-gray-700">{i + 1}</span>
                            <span className="w-24 shrink-0 text-[#ffc285]">{m ? m[1] : '·'}</span>
                            <span className="text-gray-400">{m ? m[2] : line}</span>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { tag: 'Engineering', q: 'LangGraph production guide' },
  { tag: 'Comparison', q: 'RAG vs fine-tuning comparison' },
  { tag: 'Landscape', q: 'AI agent frameworks 2024' },
]

function splitUrl(url: string): { host: string; path: string } {
  try {
    const u = new URL(url)
    return { host: u.hostname.replace('www.', ''), path: u.pathname === '/' ? '' : u.pathname }
  } catch {
    return { host: url, path: '' }
  }
}

const AVATAR_TONES = ['#ffc285', '#a0c3ec', '#c4b5fd', '#86efac', '#fca5a5']
function SourceAvatar({ host }: { host: string }) {
  const tone = AVATAR_TONES[[...host].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length]
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10.5px] uppercase"
      style={{ color: tone, borderColor: `${tone}33`, backgroundColor: `${tone}14` }}
    >
      {host.charAt(0)}
    </span>
  )
}

function NotebookEntry({ icon: Icon, label, done, waiting, badge, children }: { icon: LucideIcon; label: string; done?: boolean; waiting?: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="relative animate-in fade-in slide-in-from-bottom-2">
      <span className={cn(
        'absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full border',
        done ? 'border-white/15 bg-[#111113] text-[#ffc285]' : 'border-[#ff7a17]/50 bg-[#1a120b] text-[#ffc285] shadow-[0_0_16px_rgba(255,122,23,0.35)]'
      )}>
        {done ? <Icon className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
      <div className="ws-panel relative overflow-hidden p-4">
        {!done && <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff7a17]/[0.06] to-transparent" />}
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-400">{label}</span>
          {badge && <span className="ml-auto">{badge}</span>}
        </div>
        {children || (waiting && <p className="text-[13px] text-gray-500">{waiting}</p>)}
      </div>
    </li>
  )
}

// Static diagram of the research graph (with the analyze → search loop)
function GraphFlow() {
  const nodes = [
    { icon: Brain, label: 'Plan', sub: 'split into sub-queries' },
    { icon: Search, label: 'Search', sub: 'query the live web' },
    { icon: BookOpen, label: 'Read', sub: 'fetch & extract pages' },
    { icon: Brain, label: 'Analyze', sub: 'synthesise · find gaps' },
    { icon: FileText, label: 'Report', sub: 'cited markdown' },
  ]
  return (
    <div className="relative">
      <div className="grid grid-cols-5 gap-2">
        {nodes.map((n, i) => (
          <div key={n.label} className="relative">
            <div className="rounded-xl border border-white/[0.07] bg-[#0b0b0c] p-3">
              <div className="mb-3 flex items-center justify-between">
                <n.icon className="h-4 w-4 text-[#ffc285]" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-gray-700">0{i + 1}</span>
              </div>
              <p className="text-[13px] text-white">{n.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">{n.sub}</p>
            </div>
            {i < nodes.length - 1 && (
              <span className="absolute -right-2 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]">
                <ChevronRight className="h-2.5 w-2.5 text-gray-500" />
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Loop: Analyze → Search */}
      <svg className="mt-1 h-10 w-full overflow-visible" viewBox="0 0 500 40" preserveAspectRatio="none" aria-hidden>
        <path d="M 350 0 C 350 34, 150 34, 150 0" fill="none" stroke="rgba(255,122,23,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" className="lab-dash" />
      </svg>
      <p className="-mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc285]/70">loops back when it needs more evidence</p>
    </div>
  )
}

export default function WebResearchAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-5 w-5 animate-spin text-[#ffc285]" />
      </div>
    }>
      <WebResearchAgentContent />
    </Suspense>
  )
}
