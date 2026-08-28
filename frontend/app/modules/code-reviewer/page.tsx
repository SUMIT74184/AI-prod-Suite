'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import FileUploadZone from '@/components/shared/file-upload-zone'
import { 
  Loader2, Copy, AlertCircle, ShieldAlert, BookOpen, 
  Wrench, TestTube, Terminal, Code2, Bug, CheckCircle2,
  Activity, Link2, ChevronRight, PenTool
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

export default function CodeReviewerPage() {
  const [code, setCode] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [stepMessage, setStepMessage] = useState<string>('')
  
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [activeView, setActiveView] = useState<'overview' | 'bugs' | 'security' | 'fixes' | 'tests'>('overview')

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
    setActiveView('overview')

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

  const steps = [
    { id: 'context_builder', label: 'Context' },
    { id: 'agent_bug', label: 'Bugs' },
    { id: 'agent_security', label: 'Security' },
    { id: 'agent_performance', label: 'Perf' },
    { id: 'agent_architecture', label: 'Arch' },
    { id: 'agent_quality', label: 'Quality' },
    { id: 'finalize_review', label: 'Finalize' }
  ];

  const getSeverityColor = (severity: string) => {
     switch (severity?.toLowerCase()) {
        case 'critical': return 'text-purple-400 border-purple-500/50 bg-purple-500/10';
        case 'high': return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
        case 'medium': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
        case 'low': return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
        default: return 'text-[#7d8187] border-[#212327] bg-[#141414]';
     }
  }

  // Filter findings for display
  const bugsList = reviewResult?.findings?.filter(f => f.agent === 'bug') || [];
  const secList = reviewResult?.findings?.filter(f => f.agent === 'security') || [];

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden">
      {/* Premium Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] p-5 flex items-center justify-between bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Code2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              Lumina Reviewer <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono border border-indigo-500/20 uppercase tracking-widest">v4.0</span>
            </h1>
            <p className="text-sm text-[#7d8187] mt-0.5 font-normal">
              Production LangGraph Multi-Agent Architecture
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/modules/code-reviewer/integrations">
            <Button variant="outline" size="sm" className="gap-2 border-[rgba(255,255,255,0.1)] bg-[#141414] hover:bg-[#1a1c20] text-[#dadbdf]">
              <Link2 className="w-4 h-4" />
              Git Integrations
            </Button>
          </Link>
          <Link href="/modules/code-reviewer/docs">
            <Button variant="outline" size="sm" className="gap-2 border-[rgba(255,255,255,0.1)] bg-[#141414] hover:bg-[#1a1c20] text-[#dadbdf]">
              <Terminal className="w-4 h-4" />
              CLI Docs
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Code Input */}
        <div className="w-1/2 flex flex-col border-r border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
          <div className="p-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#7d8187]" /> Source Code (Git Diff)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              disabled={!code}
              className="h-8 gap-2 text-[#7d8187] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <div className="relative flex-1 group">
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#0d0d0d] border-r border-[#1a1c20] flex flex-col items-center py-3 text-xs font-mono text-[#333] select-none rounded-l-xl z-0 overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                  <span key={i} className="leading-[21px]">{i + 1}</span>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your source code or diff here..."
                className="w-full h-full p-3 pl-14 rounded-xl border border-[#212327] bg-[#141414] text-[#dadbdf] font-mono text-[13px] leading-[21px] resize-none focus:outline-none focus:border-indigo-500/50 placeholder-[#4a4a4a] transition-all relative z-10 bg-transparent custom-scrollbar"
                spellCheck={false}
              />
            </div>

            <div className="mt-auto">
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                acceptedTypes={['text/plain', 'application/zip', 'text/x-python', 'text/javascript', 'text/typescript']}
              />
            </div>
            
            <Button
              onClick={handleReview}
              disabled={isStreaming || !code.trim()}
              className="relative w-full h-14 overflow-hidden rounded-xl bg-[#0a0a0a] group border border-transparent hover:border-transparent transition-all shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]"
            >
              {/* Gradient background with spin/pulse */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* AI Sparkle / Shimmer effect */}
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] bg-[0%_0%] group-hover:bg-[100%_100%] transition-[background-position] duration-700" />
              
              <div className="relative flex items-center justify-center gap-3 w-full h-full text-white font-medium z-10">
              {isStreaming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running AI Pipeline...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 group-hover:animate-pulse" />
                  Analyze Source Code
                </>
              )}
              </div>
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: AI Review Dashboard */}
        <div className="w-1/2 flex flex-col bg-[#050505] relative">
          
          {/* Progress Tracker (Visible when streaming) */}
          {(isStreaming || (reviewResult && currentStep !== 'complete' && currentStep !== 'error' && currentStep !== '')) && (
             <div className="p-4 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                   </div>
                   <div>
                      <h3 className="text-sm font-medium text-white">{stepMessage}</h3>
                      <p className="text-xs text-[#7d8187] font-mono">Agent state: {currentStep}</p>
                   </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                   {steps.map((step, idx) => {
                      const isActive = currentStep.includes(step.id) || currentStep === step.id;
                      const isPast = steps.findIndex(s => s.id === currentStep || currentStep.includes(s.id)) > idx;
                      return (
                         <div key={step.id} className="flex items-center mb-1">
                            <div className={cn(
                               "px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors",
                               isActive ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : 
                               isPast ? "text-[#7d8187]" : "text-[#4a4a4a]"
                            )}>
                               {step.label}
                            </div>
                            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 mx-1 text-[#212327]" />}
                         </div>
                      );
                   })}
                </div>
             </div>
          )}

          {!reviewResult && !isStreaming ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
                <ShieldAlert className="w-8 h-8 text-[#4a4a4a]" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Production Multi-Agent Scan</h2>
              <p className="text-[#7d8187] max-w-sm leading-relaxed text-sm">
                Powered by LangGraph. Your code will pass through 5 specialist agents (Bug, Security, Perf, Arch, Quality) and a post-processing validation layer.
              </p>
            </div>
          ) : reviewResult && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dashboard Header / Scorecard */}
              <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Scan Report</h2>
                    <div className="flex gap-2 mt-2">
                       {reviewResult.severityBreakdown?.critical ? <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">{reviewResult.severityBreakdown.critical} CRIT</span> : null}
                       {reviewResult.severityBreakdown?.high ? <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">{reviewResult.severityBreakdown.high} HIGH</span> : null}
                    </div>
                  </div>
                  
                  {/* Health Score Circular Gauge */}
                  <div className="flex items-center gap-3 bg-[#141414] border border-[#212327] px-4 py-2 rounded-xl shadow-inner transition-colors duration-500" style={{ 
                     borderColor: healthScore > 80 ? 'rgba(52,211,153,0.3)' : healthScore > 50 ? 'rgba(251,191,36,0.3)' : 'rgba(244,63,94,0.3)'
                  }}>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-[#7d8187] uppercase tracking-wider font-semibold">Health Score</span>
                      <span className={cn(
                        "text-2xl font-bold font-mono transition-colors duration-500",
                        healthScore > 80 ? "text-emerald-400" : healthScore > 50 ? "text-amber-400" : "text-rose-400"
                      )}>
                        {healthScore}/100
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-4 flex items-center justify-center transition-colors duration-500" style={{ 
                      borderColor: healthScore > 80 ? 'rgba(52,211,153,0.2)' : healthScore > 50 ? 'rgba(251,191,36,0.2)' : 'rgba(244,63,94,0.2)'
                    }}>
                      {healthScore > 80 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
                    </div>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setActiveView('bugs')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'bugs' ? "bg-rose-500/10 border-rose-500/30" : "bg-[#141414] border-[#212327] hover:border-rose-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <Bug className={cn("w-4 h-4", activeView === 'bugs' ? "text-rose-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{bugsList.length}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Bugs</p>
                  </button>

                  <button onClick={() => setActiveView('security')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'security' ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-[#212327] hover:border-amber-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <ShieldAlert className={cn("w-4 h-4", activeView === 'security' ? "text-amber-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{secList.length}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Security</p>
                  </button>

                  <button onClick={() => setActiveView('fixes')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'fixes' ? "bg-blue-500/10 border-blue-500/30" : "bg-[#141414] border-[#212327] hover:border-blue-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <PenTool className={cn("w-4 h-4", activeView === 'fixes' ? "text-blue-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.fixes?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Generated Fixes</p>
                  </button>
                </div>
              </div>

              {/* Sub-navigation for text details */}
              <div className="flex items-center gap-1 p-2 bg-[#0a0a0a] border-b border-[rgba(255,255,255,0.05)]">
                <Button variant="ghost" size="sm" onClick={() => setActiveView('overview')} className={cn("h-8 rounded-lg text-xs font-medium", activeView === 'overview' ? "bg-[#1a1c20] text-white" : "text-[#7d8187]")}>Overview</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveView('tests')} className={cn("h-8 rounded-lg text-xs font-medium", activeView === 'tests' ? "bg-[#1a1c20] text-white" : "text-[#7d8187]")}>Unit Tests</Button>
              </div>

              {/* Detailed View Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* OVERVIEW MODE */}
                {activeView === 'overview' && (
                  <div className="space-y-6 animate-in fade-in">
                    {reviewResult.explanation && (
                       <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-5">
                         <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2 mb-2">
                           <BookOpen className="w-4 h-4" /> Final Synthesis
                         </h3>
                         <p className="text-sm text-[#dadbdf] leading-relaxed">{reviewResult.explanation}</p>
                       </div>
                    )}
                    
                    {reviewResult.refactoring?.length > 0 && (
                      <div className="space-y-3">
                         <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                           <Wrench className="w-4 h-4 text-blue-400" /> Key Refactoring Suggestions
                         </h3>
                         {reviewResult.refactoring.map((imp, idx) => (
                           <div key={idx} className="bg-[#141414] border border-[#212327] border-l-2 border-l-blue-500 rounded-lg p-3 shadow-sm">
                             <p className="text-sm text-[#dadbdf]">{imp}</p>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                )}

                {/* BUGS MODE */}
                {activeView === 'bugs' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-rose-400" /> Logic & Edge Cases
                    </h3>
                    {bugsList.length > 0 ? (
                      bugsList.map((bug, idx) => (
                        <div key={idx} className={cn("bg-[#141414] border border-l-4 rounded-lg p-4 shadow-sm", getSeverityColor(bug.severity))}>
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-black/20">{bug.severity} | {bug.category}</span>
                              <span className="text-xs text-[#7d8187] font-mono border border-[#212327] px-2 py-0.5 rounded">{bug.line_ref}</span>
                           </div>
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{bug.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        {isStreaming ? (
                           <Loader2 className="w-8 h-8 text-[#7d8187] animate-spin mx-auto mb-3" />
                        ) : (
                           <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-50" />
                        )}
                        <p className="text-[#7d8187] text-sm">{isStreaming ? "Agent is scanning..." : "No bugs were detected in this scan."}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SECURITY MODE */}
                {activeView === 'security' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" /> Vulnerabilities
                    </h3>
                    {secList.length > 0 ? (
                      secList.map((sec, idx) => (
                        <div key={idx} className={cn("bg-[#141414] border border-l-4 rounded-lg p-4 shadow-sm", getSeverityColor(sec.severity))}>
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-black/20">{sec.severity} | {sec.category}</span>
                              <span className="text-xs text-[#7d8187] font-mono border border-[#212327] px-2 py-0.5 rounded">{sec.line_ref}</span>
                           </div>
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{sec.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        {isStreaming ? (
                           <Loader2 className="w-8 h-8 text-[#7d8187] animate-spin mx-auto mb-3" />
                        ) : (
                           <ShieldAlert className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-50" />
                        )}
                        <p className="text-[#7d8187] text-sm">{isStreaming ? "Agent is scanning..." : "No security vulnerabilities detected."}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* FIXES MODE */}
                {activeView === 'fixes' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <PenTool className="w-4 h-4 text-blue-400" /> Automatically Generated Fixes
                    </h3>
                    {reviewResult.fixes?.length > 0 ? (
                      reviewResult.fixes.map((fix, idx) => (
                        <div key={idx} className="bg-[#141414] border border-[#212327] rounded-lg overflow-hidden shadow-sm">
                           <div className="bg-[#1a1c20] px-4 py-2 border-b border-[#212327] flex justify-between">
                              <span className="text-xs text-[#7d8187] font-mono">Patch Suggestion #{idx+1}</span>
                              {fix.file_path && <span className="text-xs text-blue-400 font-mono">{fix.file_path}</span>}
                           </div>
                           <div className="grid grid-cols-2 divide-x divide-[#212327]">
                              <div className="p-3 bg-[rgba(244,63,94,0.02)]">
                                 <span className="text-[10px] uppercase text-rose-500 font-bold mb-2 block tracking-wider">Original</span>
                                 <pre className="text-[#dadbdf] text-xs font-mono overflow-x-auto custom-scrollbar">{fix.original_code}</pre>
                              </div>
                              <div className="p-3 bg-[rgba(52,211,153,0.02)]">
                                 <span className="text-[10px] uppercase text-emerald-500 font-bold mb-2 block tracking-wider">Suggested</span>
                                 <pre className="text-[#dadbdf] text-xs font-mono overflow-x-auto custom-scrollbar">{fix.suggested_code}</pre>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        {isStreaming ? (
                           <Loader2 className="w-8 h-8 text-[#7d8187] animate-spin mx-auto mb-3" />
                        ) : (
                           <p className="text-[#7d8187] text-sm">No fixes generated (Code is healthy or no critical issues found).</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TESTS MODE */}
                {activeView === 'tests' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 h-full flex flex-col">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2 shrink-0">
                      <TestTube className="w-4 h-4 text-emerald-400" /> Recommended Unit Tests
                    </h3>
                    {reviewResult.unitTests ? (
                       <div className="flex-1 bg-[#0a0a0a] border border-[#1a1c20] rounded-xl p-4 overflow-hidden relative">
                         <div className="absolute top-2 right-2 flex gap-2">
                            <span className="px-2 py-1 bg-[#1a1c20] text-[#7d8187] text-[10px] font-mono rounded">Generated Code</span>
                         </div>
                         <pre className="text-[#dadbdf] font-mono text-xs overflow-auto h-full custom-scrollbar leading-relaxed pb-4">
                           {reviewResult.unitTests}
                         </pre>
                       </div>
                    ) : (
                       <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                         {isStreaming ? (
                            <Loader2 className="w-8 h-8 text-[#7d8187] animate-spin mx-auto mb-3" />
                         ) : (
                            <p className="text-[#7d8187] text-sm">No tests generated.</p>
                         )}
                       </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
