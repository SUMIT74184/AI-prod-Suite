'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
// export const dynamic = 'force-dynamic'
import { Loader2, Download, CheckCircle2, Circle, AlertCircle, Globe, Search, BookOpen, Brain, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
              <div className="h-full flex flex-col items-center justify-start gap-6 py-10 max-w-2xl mx-auto overflow-y-auto">
                <div className="flex items-center gap-3 mt-4 mb-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7d8187]" />
                  <p className="text-white font-medium text-lg">Agent is actively researching…</p>
                </div>
                
                {/* Live Activity Cards */}
                <div className="w-full space-y-4 pb-12">
                  {/* Search Results Preview */}
                  {liveInsights.topResults && liveInsights.topResults.length > 0 && (
                     <div className="bg-[#191919] border border-[#212327] rounded-xl p-5 w-full animate-in fade-in slide-in-from-bottom-4">
                       <div className="flex items-center gap-2 mb-3">
                         <Search className="w-4 h-4 text-[#7d8187]" />
                         <h3 className="text-sm font-medium text-white">Latest Search Findings</h3>
                       </div>
                       <div className="space-y-3">
                         {liveInsights.topResults.slice(0, 3).map((res, i) => (
                           <div key={i} className="text-sm">
                             <p className="text-[#dadbdf] font-medium truncate">{res.title}</p>
                             <p className="text-xs text-[#7d8187] truncate mt-0.5">{res.url}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}

                  {/* Reading Pages Preview */}
                  {liveInsights.pagePreviews && liveInsights.pagePreviews.length > 0 && (
                     <div className="bg-[#191919] border border-[#212327] rounded-xl p-5 w-full animate-in fade-in slide-in-from-bottom-4">
                       <div className="flex items-center gap-2 mb-3">
                         <BookOpen className="w-4 h-4 text-[#7d8187]" />
                         <h3 className="text-sm font-medium text-white">Reading Source Material</h3>
                       </div>
                       <div className="space-y-2">
                         {liveInsights.pagePreviews.map((page, i) => (
                           <div key={i} className="flex items-center justify-between text-sm">
                             <p className="text-[#dadbdf] font-medium truncate pr-4">{page.title || page.url}</p>
                             <span className="text-xs font-mono text-[#7d8187] flex-shrink-0">{page.word_count} words</span>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}

                  {/* Analysis Synthesis Preview */}
                  {liveInsights.synthesis && (
                     <div className="bg-[#191919] border border-[#212327] rounded-xl p-5 w-full animate-in fade-in slide-in-from-bottom-4">
                       <div className="flex items-center gap-2 mb-3">
                         <Brain className="w-4 h-4 text-[#7d8187]" />
                         <h3 className="text-sm font-medium text-white">Live Synthesis</h3>
                         {liveInsights.confidence && (
                            <span className={cn(
                              "ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border",
                              liveInsights.confidence === 'high' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            )}>
                              {liveInsights.confidence === 'high' ? 'Sufficient Data' : 'Needs More Info'}
                            </span>
                         )}
                       </div>
                       <p className="text-sm text-[#dadbdf] leading-relaxed">{liveInsights.synthesis}</p>
                       {liveInsights.gaps && (
                         <div className="mt-3 pt-3 border-t border-[#212327]">
                           <p className="text-xs text-[#7d8187] font-medium mb-1">Identified Gaps:</p>
                           <p className="text-sm text-[#dadbdf]">{liveInsights.gaps}</p>
                         </div>
                       )}
                     </div>
                  )}

                  {/* Report Writing Preview */}
                  {liveInsights.reportPreview && (
                     <div className="bg-[#191919] border border-[#212327] rounded-xl p-5 w-full animate-in fade-in slide-in-from-bottom-4">
                       <div className="flex items-center gap-2 mb-3">
                         <FileText className="w-4 h-4 text-[#7d8187]" />
                         <h3 className="text-sm font-medium text-white">Drafting Report</h3>
                       </div>
                       <div className="prose prose-invert prose-sm max-w-none">
                          <p className="text-[#dadbdf] opacity-70 whitespace-pre-wrap blur-[0.5px]">{liveInsights.reportPreview}</p>
                       </div>
                     </div>
                  )}
                </div>

                <div className="w-full text-center pb-8 flex-shrink-0">
                  <p className="text-xs text-[#7d8187] font-mono">
                    {streamLog[streamLog.length - 1] || 'Initializing...'}
                  </p>
                </div>
              </div>
            )}

            {/* Report */}
            {result?.report && (
              <div className="max-w-3xl mx-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-6 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 text-[#dadbdf] leading-relaxed text-sm" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-4 text-[#dadbdf] text-sm" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 mb-4 text-[#dadbdf] text-sm" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-[#dadbdf]" {...props} />,
                      code: ({node, ...props}) => <code className="px-1.5 py-0.5 mx-0.5 rounded bg-[#202020] border border-[#2d2d2d] text-[#ffc285] font-mono text-[13px]" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[#ff7a17] pl-4 py-2 my-4 text-[#a1a1aa] italic bg-[#161616] rounded-r text-sm" {...props} />,
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-6">
                          <table className="w-full text-left border-collapse text-sm text-[#dadbdf]" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-[#1a1c20]" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 border border-[#212327] font-semibold text-white" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 border border-[#212327]" {...props} />,
                    }}
                  >
                    {result.report}
                  </ReactMarkdown>
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

export default function WebResearchAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 animate-spin text-[#7d8187]" />
      </div>
    }>
      <WebResearchAgentContent />
    </Suspense>
  )
}
