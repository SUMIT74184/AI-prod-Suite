'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2, Copy, ShieldAlert, BookOpen, GitBranch, Upload, Eraser, FileCode2, Code2,
  Wrench, TestTube, Terminal, Bug, CheckCircle2, Check, ChevronRight, Play, Sparkles,
  Gauge, Boxes, CornerDownRight, PenTool, type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ModuleHeader, MonoLabel, StatusDot, Kbd, severityTone, ui } from '@/components/workspace/kit'
import { CodeBlock } from '@/components/workspace/markdown'
import { HealthGauge, SegmentTabs, ReportPlaceholder } from '@/components/workspace/review-report'

interface Finding {
  description: string
  severity: string
  line_ref: string
  category: string
  agent: string
  confidence?: number
}

interface Fix {
  finding_id?: string
  file_path?: string
  original_code: string
  suggested_code: string
}

interface ReviewResult {
  findings: Finding[]
  fixes: Fix[]
  explanation: string
  refactoring: string[]
  unitTests: string
  healthScore: number
  severityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  }
}

function CodeReviewerContent() {
  const [code, setCode] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [stepMessage, setStepMessage] = useState<string>('')
  
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [activeView, setActiveView] = useState<'findings' | 'fixes' | 'tests' | 'summary'>('findings')

  // Studio UI state
  const [highlightLine, setHighlightLine] = useState<number | null>(null)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  // Load Session History
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
              
              if (userMsg) {
                setCode(userMsg.content)
              }
              
              if (asstMsg) {
                const parsed = JSON.parse(asstMsg.content)
                setReviewResult({
                  findings: parsed.findings || parsed.deduplicated_findings || parsed.raw_findings || [],
                  fixes: parsed.fixes || parsed.generated_fixes || [],
                  explanation: parsed.explanation || '',
                  refactoring: parsed.refactoring || [],
                  unitTests: parsed.generated_tests || parsed.unit_tests || '',
                  healthScore: parsed.health_score || parsed.healthScore || 100,
                  severityBreakdown: calculateTotalSeverity(parsed.findings || parsed.deduplicated_findings || parsed.raw_findings || [])
                })
                setIsStreaming(false)
                setCurrentStep('complete')
                setStepMessage('Loaded from history')
              }
            }
          }
        } catch (err) {
          console.error('Failed to load session', err)
        }
      }
      fetchSession()
    }
  }, [sessionId])

  const handleReview = async () => {
    if (!code.trim()) {
      alert('Please enter code to review')
      return
    }

    setIsStreaming(true)
    setReviewResult(null)
    setCurrentStep('starting')
    setStepMessage('Connecting to review pipeline...')
    
    // Initialize empty result for progressive rendering
    const progressiveResult: ReviewResult = {
      findings: [],
      fixes: [],
      explanation: '',
      refactoring: [],
      unitTests: '',
      healthScore: 100,
      severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 }
    }
    setReviewResult(progressiveResult)
    setActiveView('findings')

    try {
      const newSessionId = crypto.randomUUID();
      router.push(`/modules/code-reviewer?sessionId=${newSessionId}`);
      
      const encodedCode = encodeURIComponent(code);
      const eventSource = new EventSource(`/api/py/code-review/stream?code=${encodedCode}&session_id=${newSessionId}&module=code-reviewer`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.status === 'error') {
            console.error('Pipeline error:', data.message);
            alert(`Review pipeline error: ${data.message}`);
            eventSource.close();
            setIsStreaming(false);
            return;
          }

          // Map completed nodes to the NEXT node that is currently running
          const nextStepMap: Record<string, string> = {
            'context_builder': 'agent_bug',
            'agent_bug': 'agent_security',
            'agent_security': 'agent_performance',
            'agent_performance': 'agent_architecture',
            'agent_architecture': 'agent_quality',
            'agent_quality': 'validate_findings',
            'validate_findings': 'deduplicate_findings',
            'deduplicate_findings': 'aggregate_report',
            'aggregate_report': 'generate_fixes',
            'generate_fixes': 'generate_tests',
            'generate_tests': 'finalize_review'
          };

          const currentlyRunningStep = nextStepMap[data.status] || data.status;
          
          if (data.status !== 'ping') {
             setCurrentStep(currentlyRunningStep);
             setStepMessage(`Running ${currentlyRunningStep.replace(/_/g, ' ')}...`);
          }

          if (data.status === 'complete') {
            // Final update
            setReviewResult({
               findings: data.data.findings || [],
               fixes: data.data.fixes || [],
               explanation: data.data.explanation || '',
               refactoring: data.data.refactoring || [],
               unitTests: data.data.generated_tests || '',
               healthScore: data.data.health_score || 100,
               severityBreakdown: calculateTotalSeverity(data.data.findings || [])
            });
            eventSource.close();
            setIsStreaming(false);
            window.dispatchEvent(new Event('refresh-conversations'));
          } else {
             // Progressive update based on step
             setReviewResult(prev => {
                if (!prev) return progressiveResult;
                const next = { ...prev };
                
                // The backend stream emits findings inside raw_findings or deduplicated_findings
                const currentFindings = data.data.deduplicated_findings || data.data.raw_findings || [];
                if (currentFindings.length > 0) {
                   next.findings = currentFindings;
                }
                
                if (data.data.generated_fixes) {
                   next.fixes = data.data.generated_fixes;
                }
                
                if (data.data.explanation) {
                   next.explanation = data.data.explanation;
                }
                
                if (data.data.refactoring) {
                   next.refactoring = data.data.refactoring;
                }
                
                if (data.data.generated_tests) {
                   next.unitTests = data.data.generated_tests;
                }
                
                next.healthScore = data.data.health_score || next.healthScore;
                next.severityBreakdown = calculateTotalSeverity(next.findings);
                
                return next;
             });
          }
        } catch (err) {
          console.error("Failed to parse SSE message", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource.close();
        setIsStreaming(false);
        alert('Connection to review pipeline lost.');
      };

    } catch (error) {
      console.error('Review failed:', error)
      alert('Failed to start review. Is the Python backend running?')
      setIsStreaming(false)
    }
  }

  const calculateTotalSeverity = (findings: Finding[] = []) => {
     const counts = { critical: 0, high: 0, medium: 0, low: 0 };
     findings.forEach(item => {
        const s = item.severity?.toLowerCase() || 'medium';
        if (s in counts) counts[s as keyof typeof counts]++;
     });
     return counts;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
  }

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files)
    if (files.length > 0) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          setCode(content)
        }
      }
      reader.readAsText(files[0])
    }
  }

  const healthScore = reviewResult?.healthScore ?? 100;
  const findings = reviewResult?.findings || [];
  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 28);
  const fileName = uploadedFiles[0]?.name || 'untitled.diff';
  const language = guessLanguage(fileName, code);

  // Graph position — drives the live agent roster
  const curIdx = PIPELINE.findIndex(s => s.id === currentStep || currentStep.includes(s.id));
  const isComplete = currentStep === 'complete';
  const stageState = (id: string): AgentState => {
    if (!reviewResult && !isStreaming) return 'idle';
    const idx = PIPELINE.findIndex(s => s.id === id);
    if (isComplete || (curIdx > idx)) return 'done';
    if (curIdx === idx && isStreaming) return 'running';
    return 'queued';
  };

  // Map finding line refs onto editor lines (gutter markers)
  const markers = new Map<number, string>();
  findings.forEach(f => {
    const ln = parseLine(f.line_ref);
    if (!ln) return;
    const prev = markers.get(ln);
    const rank = (sev?: string) => { const i = (SEVERITY_ORDER as readonly string[]).indexOf(sev?.toLowerCase() || ''); return i < 0 ? 99 : i };
    if (!prev || rank(f.severity) < rank(prev)) markers.set(ln, f.severity?.toLowerCase());
  });

  const visibleFindings = findings
    .filter(f => severityFilter === 'all' || f.severity?.toLowerCase() === severityFilter)
    .filter(f => !agentFilter || f.agent === agentFilter);

  const jumpToLine = (line: number | null) => {
    if (!line) return;
    setHighlightLine(line);
    editorRef.current?.scrollTo({ top: Math.max(0, (line - 1) * LINE_H - 120), behavior: 'smooth' });
  };

  const handleEditorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFilesSelected(files);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      <ModuleHeader
        index="M.02"
        section="Engineering"
        title="Lumina"
        accent="Reviewer"
        description="Production LangGraph Multi-Agent Architecture"
        actions={
          <>
            <span className={cn(ui.chip, 'hidden lg:inline-flex')}>v4.0</span>
            <Link href="/modules/code-reviewer/integrations" className={ui.btnOutline}>
              <GitBranch className="h-3.5 w-3.5" />
              Git Integrations
            </Link>
            <Link href="/modules/code-reviewer/docs" className={ui.btnOutline}>
              <Terminal className="h-3.5 w-3.5" />
              CLI Docs
            </Link>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* ─── LEFT: editor ─── */}
        <section className="flex min-w-0 flex-[1.15] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0d0f]">
          {/* Tab bar */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#09090a] pr-2">
            <div className="flex h-full items-center">
              <div className="relative flex h-full items-center gap-2 border-r border-white/[0.06] bg-[#0c0d0f] px-4">
                <span className="absolute inset-x-0 top-0 h-px bg-[#ff7a17]" />
                <FileCode2 className="h-3.5 w-3.5 text-[#ffc285]" />
                <span className="font-mono text-[12px] text-gray-200">{fileName}</span>
                {code && <span className="h-1.5 w-1.5 rounded-full bg-white/40" title="Unsaved buffer" />}
              </div>
              <span className="px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-600">{language}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => { const f = Array.from(e.target.files || []); if (f.length) handleFilesSelected(f); e.target.value = '' }}
              />
              <ToolbarButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
              <ToolbarButton icon={Copy} label="Copy" onClick={handleCopyCode} disabled={!code} />
              <ToolbarButton icon={Eraser} label="Clear" onClick={() => { setCode(''); setHighlightLine(null) }} disabled={!code || isStreaming} />
            </div>
          </div>

          {/* Editor body */}
          <div
            ref={editorRef}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleEditorDrop}
            className="relative min-h-0 flex-1 overflow-auto"
          >
            <div className="relative flex min-h-full">
              {/* Selected-finding line band */}
              {highlightLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-0 border-y border-[#ff7a17]/25 bg-[#ff7a17]/[0.07] transition-all duration-300"
                  style={{ top: (highlightLine - 1) * LINE_H + PAD_Y, height: LINE_H }}
                />
              )}
              {/* Gutter */}
              <div className="sticky left-0 z-10 select-none border-r border-white/[0.05] bg-[#0c0d0f] py-3 font-mono text-[11.5px]" style={{ lineHeight: `${LINE_H}px` }}>
                {Array.from({ length: lineCount }).map((_, i) => {
                  const sev = markers.get(i + 1)
                  return (
                    <button
                      key={i}
                      type="button"
                      tabIndex={-1}
                      onClick={() => sev && setHighlightLine(i + 1)}
                      className={cn('flex w-14 items-center justify-end gap-2 pr-3 text-right', sev ? 'cursor-pointer text-gray-300' : 'cursor-default text-gray-700', highlightLine === i + 1 && 'text-[#ffc285]')}
                      style={{ height: LINE_H }}
                    >
                      {sev && <span className={cn('h-1.5 w-1.5 rounded-full', severityTone(sev).bar)} />}
                      {i + 1}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (!isStreaming && code.trim()) handleReview() } }}
                wrap="off"
                spellCheck={false}
                style={{ height: lineCount * LINE_H + PAD_Y * 2, lineHeight: `${LINE_H}px`, paddingTop: PAD_Y, paddingBottom: PAD_Y }}
                className="relative z-[1] flex-1 resize-none overflow-y-hidden bg-transparent px-4 font-mono text-[13px] text-gray-200 caret-[#ff7a17] outline-none selection:bg-[#ff7a17]/25"
              />
            </div>

            {/* Empty editor overlay */}
            {!code && !isDragging && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
                <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0a0a0b]/90 p-6 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
                  <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black shadow-[0_0_30px_-6px_rgba(255,122,23,0.5)]">
                    <Code2 className="h-5 w-5 text-[#ffc285]" strokeWidth={1.5} />
                  </span>
                  <p className="text-[16px] tracking-tight text-white">
                    Paste a diff, <span className="lab-serif text-gray-400">or drop a file.</span>
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-gray-500">Click anywhere in the editor to start typing.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <EntryButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
                    <EntryButton icon={Sparkles} label="Sample" onClick={() => setCode(SAMPLE_CODE)} />
                    <Link href="/modules/code-reviewer/integrations" className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 py-3 text-[12px] text-gray-300 transition-colors hover:border-[#ff7a17]/35 hover:text-white">
                      <GitBranch className="h-4 w-4 text-[#ffc285]" />
                      Repo
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Drag overlay */}
            {isDragging && (
              <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border border-dashed border-[#ff7a17]/60 bg-[#ff7a17]/[0.06] backdrop-blur-[2px]">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#ffc285]">
                  <Upload className="h-4 w-4" /> Drop to load file
                </p>
              </div>
            )}
          </div>

          {/* Run bar */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-[#09090a] px-4">
            <div className="flex min-w-0 items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">
              <StatusDot tone={isStreaming ? 'live' : isComplete ? 'done' : 'idle'} />
              <span className="truncate">
                {isStreaming ? stepMessage : code ? `${lines.length} lines · ${code.length.toLocaleString()} chars` : 'Buffer empty'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-1.5 text-[11px] text-gray-600 md:flex"><Kbd>⌘↵</Kbd></span>
              <button
                onClick={handleReview}
                disabled={isStreaming || !code.trim()}
                className={cn(ui.btnPrimary, 'relative h-9 overflow-hidden px-5')}
              >
                {isStreaming && <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff7a17]/30 to-transparent" />}
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                {isStreaming ? 'Reviewing…' : 'Run review'}
              </button>
            </div>
          </div>
        </section>

        {/* ─── RIGHT: review ─── */}
        <section className="flex min-w-[400px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070708]">
          {/* Agent roster */}
          {!isComplete ? (
            <div className="flex-1 overflow-y-auto p-5">
              <MonoLabel index="◆">{isStreaming ? 'Review in progress' : 'Review graph'}</MonoLabel>
              <h2 className="mb-1 mt-2 text-[20px] tracking-[-0.02em] text-white">
                Five specialists. <span className="lab-serif text-gray-400">One verdict.</span>
              </h2>
              <p className="mb-5 text-[13px] text-gray-500">
                {isStreaming ? 'Each agent streams its findings as it finishes.' : 'Your code passes through every lens below, then a validation layer.'}
              </p>

              <div className="space-y-1.5">
                {AGENTS.map(a => (
                  <AgentRow
                    key={a.id}
                    agent={a}
                    state={stageState(a.node)}
                    count={findings.filter(f => f.agent === a.id).length}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-white/[0.06] p-3">
                <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">Verification &amp; synthesis</p>
                <div className="flex flex-wrap items-center gap-1">
                  {POST_STAGES.map((s, i) => {
                    const st = stageState(s.id)
                    return (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] transition-colors',
                          st === 'running' ? 'bg-[#ff7a17]/10 text-[#ffc285]' : st === 'done' ? 'text-gray-300' : 'text-gray-600'
                        )}>
                          {st === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : st === 'done' ? <Check className="h-3 w-3 text-emerald-400" /> : <span className="h-1 w-1 rounded-full bg-white/20" />}
                          {s.label}
                        </span>
                        {i < POST_STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-gray-700" />}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Findings stream in while running */}
              {isStreaming && findings.length > 0 && (
                <div className="mt-6 space-y-2">
                  <MonoLabel>Live findings · {findings.length}</MonoLabel>
                  {findings.slice(-4).reverse().map((f, i) => (
                    <FindingRow key={`${f.line_ref}-${i}`} finding={f} onJump={() => jumpToLine(parseLine(f.line_ref))} />
                  ))}
                </div>
              )}
            </div>
          ) : reviewResult && (
            <div className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-500">
              {/* Verdict */}
              <div className="border-b border-white/[0.06] p-5">
                <div className="flex items-center gap-4">
                  <HealthGauge score={healthScore} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-baseline justify-between">
                      <p className="text-[15px] tracking-tight text-white">
                        {findings.length} finding{findings.length !== 1 ? 's' : ''} <span className="lab-serif text-gray-400">verified</span>
                      </p>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-600">{stepMessage}</span>
                    </div>
                    <SeverityBar breakdown={reviewResult.severityBreakdown} />
                  </div>
                </div>

                {/* Agent chips — double as filters */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {AGENTS.map(a => {
                    const n = findings.filter(f => f.agent === a.id).length
                    const on = agentFilter === a.id
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setAgentFilter(on ? null : a.id); setActiveView('findings') }}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                          on ? 'border-[#ff7a17]/50 bg-[#ff7a17]/10 text-white' : 'border-white/[0.07] text-gray-400 hover:border-white/20 hover:text-white'
                        )}
                      >
                        <a.icon className={cn('h-3 w-3', on ? 'text-[#ffc285]' : 'text-gray-500')} />
                        {a.short}
                        <span className={cn('font-mono text-[10px]', n ? 'text-gray-300' : 'text-gray-600')}>{n}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                <SegmentTabs
                  value={activeView}
                  onChange={setActiveView}
                  tabs={[
                    { id: 'findings', label: `Findings ${findings.length}` },
                    { id: 'fixes', label: `Fixes ${reviewResult.fixes?.length || 0}` },
                    { id: 'tests', label: 'Tests' },
                    { id: 'summary', label: 'Summary' },
                  ]}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {activeView === 'findings' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {(['all', ...SEVERITY_ORDER] as const).map(s => {
                        const n = s === 'all' ? findings.length : findings.filter(f => f.severity?.toLowerCase() === s).length
                        return (
                          <button
                            key={s}
                            onClick={() => setSeverityFilter(s)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider transition-colors',
                              severityFilter === s ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-200'
                            )}
                          >
                            {s !== 'all' && <span className={cn('h-1.5 w-1.5 rounded-full', severityTone(s).bar)} />}
                            {s} <span className="text-gray-600">{n}</span>
                          </button>
                        )
                      })}
                    </div>
                    {visibleFindings.length > 0 ? (
                      visibleFindings.map((f, i) => (
                        <FindingRow
                          key={`${f.line_ref}-${i}`}
                          finding={f}
                          active={highlightLine !== null && parseLine(f.line_ref) === highlightLine}
                          onJump={() => jumpToLine(parseLine(f.line_ref))}
                        />
                      ))
                    ) : (
                      <ReportPlaceholder streaming={false} streamingText="" idleText={findings.length ? 'Nothing matches these filters.' : 'No issues found — clean bill of health.'} icon={CheckCircle2} />
                    )}
                  </div>
                )}

                {activeView === 'fixes' && (
                  <div className="space-y-4">
                    {reviewResult.fixes?.length > 0 ? (
                      reviewResult.fixes.map((fix, idx) => <DiffBlock key={idx} fix={fix} index={idx} />)
                    ) : (
                      <ReportPlaceholder streaming={false} streamingText="" idleText="No fixes generated (Code is healthy or no critical issues found)." icon={PenTool} />
                    )}
                  </div>
                )}

                {activeView === 'tests' && (
                  reviewResult.unitTests ? (
                    <CodeBlock language="generated tests" content={reviewResult.unitTests} />
                  ) : (
                    <ReportPlaceholder streaming={false} streamingText="" idleText="No tests generated." icon={TestTube} />
                  )
                )}

                {activeView === 'summary' && (
                  <div className="space-y-5">
                    {reviewResult.explanation ? (
                      <div className="rounded-2xl border border-[#ff7a17]/20 bg-gradient-to-br from-[#ff7a17]/[0.07] via-transparent to-transparent p-5">
                        <MonoLabel index="◆" className="mb-3">Final synthesis</MonoLabel>
                        <p className="text-[14px] leading-relaxed text-gray-200">{reviewResult.explanation}</p>
                      </div>
                    ) : (
                      <ReportPlaceholder streaming={false} streamingText="" idleText="No synthesis was produced for this scan." icon={BookOpen} />
                    )}
                    {reviewResult.refactoring?.length > 0 && (
                      <div>
                        <MonoLabel className="mb-3"><Wrench className="h-3 w-3 text-[#ffc285]" /> Refactoring suggestions</MonoLabel>
                        <ol className="space-y-2">
                          {reviewResult.refactoring.map((imp, idx) => (
                            <li key={idx} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                              <span className="font-mono text-[11px] text-[#ff7a17]">{String(idx + 1).padStart(2, '0')}</span>
                              <p className="text-[13.5px] leading-relaxed text-gray-300">{imp}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Static config + helpers
// ---------------------------------------------------------------------------
const LINE_H = 21
const PAD_Y = 12
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const

type AgentState = 'idle' | 'queued' | 'running' | 'done'

// Mirrors backend/app/code_review_agent/graph.py node order
const PIPELINE = [
  { id: 'context_builder', label: 'context' },
  { id: 'agent_bug', label: 'bug' },
  { id: 'agent_security', label: 'security' },
  { id: 'agent_performance', label: 'perf' },
  { id: 'agent_architecture', label: 'arch' },
  { id: 'agent_quality', label: 'quality' },
  { id: 'validate_findings', label: 'validate' },
  { id: 'deduplicate_findings', label: 'dedupe' },
  { id: 'aggregate_report', label: 'aggregate' },
  { id: 'generate_fixes', label: 'fixes' },
  { id: 'generate_tests', label: 'tests' },
  { id: 'finalize_review', label: 'finalize' },
]
const POST_STAGES = PIPELINE.slice(6)

const AGENTS = [
  { id: 'bug', node: 'agent_bug', short: 'Bugs', icon: Bug, lens: 'Logic errors, null refs, off-by-ones, edge cases' },
  { id: 'security', node: 'agent_security', short: 'Security', icon: ShieldAlert, lens: 'Injection, secrets, auth gaps, unsafe input' },
  { id: 'performance', node: 'agent_performance', short: 'Perf', icon: Gauge, lens: 'N+1 queries, hot loops, needless allocations' },
  { id: 'architecture', node: 'agent_architecture', short: 'Arch', icon: Boxes, lens: 'Coupling, layering, responsibilities' },
  { id: 'quality', node: 'agent_quality', short: 'Quality', icon: Sparkles, lens: 'Naming, readability, dead code, style' },
]

const SAMPLE_CODE = `async def get_user(db, user_id: str):
    q = f"SELECT * FROM users WHERE id = {user_id}"
    return await db.fetch(q)


async def load_orders(db, orders):
    for order in orders:
        order.items = await db.fetch(
            f"SELECT * FROM items WHERE order_id = {order.id}"
        )
    return orders


def tmp2(x):
    if x == None:
        return 0
    return x / len(x)
`

// "L42", "file.py:L12-L15", "line 7" → first line number
function parseLine(ref?: string): number | null {
  if (!ref) return null
  const m = ref.match(/L(\d+)/i) || ref.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function guessLanguage(name: string, code: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const byExt: Record<string, string> = { py: 'python', ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', go: 'go', rs: 'rust', java: 'java', rb: 'ruby', diff: 'diff', patch: 'diff' }
  if (ext && byExt[ext] && ext !== 'diff') return byExt[ext]
  if (/^(diff --git|@@ )/m.test(code)) return 'diff'
  if (/^\s*(def |async def |import \w+$|from \w+ import)/m.test(code)) return 'python'
  if (/\b(const|let|=>|interface)\b/.test(code)) return 'typescript'
  return code ? 'plain text' : 'diff'
}

function ToolbarButton({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}

function EntryButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 py-3 text-[12px] text-gray-300 transition-colors hover:border-[#ff7a17]/35 hover:text-white"
    >
      <Icon className="h-4 w-4 text-[#ffc285]" />
      {label}
    </button>
  )
}

function AgentRow({ agent, state, count }: { agent: typeof AGENTS[number]; state: AgentState; count: number }) {
  return (
    <div className={cn(
      'relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-500',
      state === 'running' ? 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.06]' : state === 'done' ? 'border-white/[0.08] bg-white/[0.025]' : 'border-white/[0.05]'
    )}>
      {state === 'running' && <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff7a17]/10 to-transparent" />}
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
        state === 'running' ? 'border-[#ff7a17]/40 bg-black text-[#ffc285]' : state === 'done' ? 'border-white/10 bg-white/[0.04] text-gray-200' : 'border-white/[0.06] text-gray-500'
      )}>
        <agent.icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[12px] text-gray-200">agent_{agent.id}</p>
        <p className="truncate text-[12px] text-gray-500">{agent.lens}</p>
      </div>
      <span className="shrink-0">
        {state === 'running' && <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#ffc285]"><Loader2 className="h-3 w-3 animate-spin" /> scanning</span>}
        {state === 'queued' && <span className="font-mono text-[10px] uppercase tracking-wider text-gray-600">queued</span>}
        {state === 'idle' && <span className="h-1.5 w-1.5 rounded-full bg-white/15" />}
        {state === 'done' && (
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]', count ? 'border-white/15 text-white' : 'border-emerald-400/25 text-emerald-300')}>
            {count ? `${count} found` : <><Check className="h-3 w-3" /> clean</>}
          </span>
        )}
      </span>
    </div>
  )
}

function FindingRow({ finding, active, onJump }: { finding: Finding; active?: boolean; onJump: () => void }) {
  const tone = severityTone(finding.severity)
  const line = parseLine(finding.line_ref)
  return (
    <button
      onClick={onJump}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border p-3.5 pl-4 text-left transition-colors',
        active ? 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.05]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', tone.bar)} />
      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn('rounded-full border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider', tone.ring, tone.text)}>{finding.severity}</span>
        <span className="font-mono text-[11px] text-[#ffc285]/80">agent_{finding.agent}</span>
        <span className="truncate font-mono text-[11px] text-gray-600">{finding.category}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] px-1.5 py-0.5 font-mono text-[10.5px] text-gray-400 transition-colors group-hover:border-[#ff7a17]/40 group-hover:text-white">
          {finding.line_ref}
          {line && <CornerDownRight className="h-3 w-3" />}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-gray-300">{finding.description}</p>
      {typeof finding.confidence === 'number' && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-0.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full bg-white/40" style={{ width: `${Math.round(finding.confidence * 100)}%` }} />
          </div>
          <span className="font-mono text-[10px] text-gray-600">{Math.round(finding.confidence * 100)}% confidence</span>
        </div>
      )}
    </button>
  )
}

function SeverityBar({ breakdown }: { breakdown?: ReviewResult['severityBreakdown'] }) {
  const total = breakdown ? SEVERITY_ORDER.reduce((n, k) => n + breakdown[k], 0) : 0
  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {breakdown && total > 0 && SEVERITY_ORDER.map(k => breakdown[k] > 0 && (
          <div key={k} className={cn('h-full', severityTone(k).bar)} style={{ width: `${(breakdown[k] / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {SEVERITY_ORDER.map(k => (
          <span key={k} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
            <span className={cn('h-1.5 w-1.5 rounded-full', severityTone(k).bar)} />
            {breakdown?.[k] ?? 0} {k}
          </span>
        ))}
      </div>
    </div>
  )
}

function DiffBlock({ fix, index }: { fix: Fix; index: number }) {
  const [copied, setCopied] = useState(false)
  const removed = (fix.original_code || '').replace(/\n$/, '').split('\n')
  const added = (fix.suggested_code || '').replace(/\n$/, '').split('\n')
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d0f]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
          <PenTool className="h-3 w-3 text-[#ffc285]" />
          {fix.file_path || `patch_${index + 1}`}
          <span className="text-red-300/80">−{removed.length}</span>
          <span className="text-emerald-300/80">+{added.length}</span>
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(fix.suggested_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy fix'}
        </button>
      </div>
      <pre className="overflow-x-auto py-2 font-mono text-[12px] leading-[20px]">
        {removed.map((l, i) => (
          <div key={`r${i}`} className="bg-red-500/[0.08] px-4 text-red-200/90"><span className="mr-3 select-none text-red-400/60">−</span>{l}</div>
        ))}
        {added.map((l, i) => (
          <div key={`a${i}`} className="bg-emerald-500/[0.08] px-4 text-emerald-200/90"><span className="mr-3 select-none text-emerald-400/60">+</span>{l}</div>
        ))}
      </pre>
    </div>
  )
}

export default function CodeReviewerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-5 w-5 animate-spin text-[#ffc285]" />
      </div>
    }>
      <CodeReviewerContent />
    </Suspense>
  )
}
