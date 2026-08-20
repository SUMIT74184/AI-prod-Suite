'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import FileUploadZone from '@/components/shared/file-upload-zone'
import { 
  Loader2, Copy, AlertCircle, ShieldAlert, Lightbulb, BookOpen, 
  Zap, Wrench, TestTube, Terminal, Code2, Bug, CheckCircle2,
  Sparkles, Activity, Link2, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ReviewResult {
  bugs: any[]
  security: any[]
  improvements: string[]
  explanation: string
  complexity: string
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
  const [activeView, setActiveView] = useState<'overview' | 'bugs' | 'security' | 'improvements' | 'tests'>('overview')

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
      bugs: [],
      security: [],
      improvements: [],
      explanation: '',
      complexity: '',
      refactoring: [],
      unitTests: '',
      healthScore: 100,
      severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 }
    }
    setReviewResult(progressiveResult)
    setActiveView('overview')

    try {
      const encodedCode = encodeURIComponent(code);
      const eventSource = new EventSource(`/api/py/code-review/stream?code=${encodedCode}`);

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

          setCurrentStep(data.status);
          setStepMessage(data.message);

          if (data.status === 'complete') {
            // Final update
            setReviewResult({
               bugs: data.data.bugs || [],
               security: data.data.security || [],
               improvements: [], // Deprecated in v3
               explanation: data.data.explanation || '',
               complexity: data.data.complexity || '',
               refactoring: data.data.refactoring || [],
               unitTests: data.data.unit_tests || '',
               healthScore: data.data.health_score || 100,
               severityBreakdown: calculateTotalSeverity(data.data.bugs, data.data.security)
            });
            eventSource.close();
            setIsStreaming(false);
          } else {
             // Progressive update based on step
             setReviewResult(prev => {
                if (!prev) return progressiveResult;
                const next = { ...prev };
                
                if (data.status === 'detect_bugs' && data.data.bugs) {
                   next.bugs = data.data.bugs;
                }
                if (data.status === 'check_security' && data.data.security) {
                   next.security = data.data.security;
                }
                if (data.status === 'analyze_complexity' && data.data.complexity_preview) {
                   next.complexity = data.data.complexity_preview;
                }
                if (data.status === 'synthesize_report') {
                   next.explanation = data.data.explanation || '';
                   next.refactoring = data.data.refactoring || [];
                   next.healthScore = data.data.health_score || next.healthScore;
                }
                
                // Keep severity count updated
                next.severityBreakdown = calculateTotalSeverity(next.bugs, next.security);
                
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

  const calculateTotalSeverity = (bugs: any[] = [], security: any[] = []) => {
     const counts = { critical: 0, high: 0, medium: 0, low: 0 };
     const all = [...bugs, ...security];
     all.forEach(item => {
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

  const totalIssues = reviewResult 
    ? (reviewResult.bugs?.length || 0) + (reviewResult.security?.length || 0) 
    : 0

  const healthScore = reviewResult?.healthScore ?? 100;

  const steps = [
    { id: 'parse_code', label: 'Parse' },
    { id: 'detect_bugs', label: 'Bugs' },
    { id: 'check_security', label: 'Security' },
    { id: 'analyze_complexity', label: 'Complexity' },
    { id: 'synthesize_report', label: 'Synthesize' },
    { id: 'generate_tests', label: 'Tests' },
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
              Lumina Reviewer <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono border border-indigo-500/20 uppercase tracking-widest">v3.0</span>
            </h1>
            <p className="text-sm text-[#7d8187] mt-0.5 font-normal">
              LangGraph-powered multi-agent code analysis pipeline
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
              <Terminal className="w-4 h-4 text-[#7d8187]" /> Source Code
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
              {/* Fake line numbers for styling */}
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#0d0d0d] border-r border-[#1a1c20] flex flex-col items-center py-3 text-xs font-mono text-[#333] select-none rounded-l-xl z-0 overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                  <span key={i} className="leading-[21px]">{i + 1}</span>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your source code here for analysis..."
                className="w-full h-full p-3 pl-14 rounded-xl border border-[#212327] bg-[#141414] text-[#dadbdf] font-mono text-[13px] leading-[21px] resize-none focus:outline-none focus:border-indigo-500/50 placeholder-[#4a4a4a] transition-all relative z-10 bg-transparent custom-scrollbar"
                spellCheck={false}
              />
            </div>

            {/* File Upload Zone */}
            <div className="mt-auto">
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                acceptedTypes={['text/plain', 'application/zip', 'text/x-python', 'text/javascript', 'text/typescript']}
              />
            </div>
            
            <Button
              onClick={handleReview}
              disabled={isStreaming || !code.trim()}
              className="w-full h-12 gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.15)] transition-all"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  Analyze Source Code
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: AI Review Dashboard */}
        <div className="w-1/2 flex flex-col bg-[#050505] relative">
          
          {/* Progress Tracker (Visible when streaming) */}
          {(isStreaming || (reviewResult && currentStep !== 'complete' && currentStep !== '')) && (
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
                <div className="flex items-center gap-1">
                   {steps.map((step, idx) => {
                      const isActive = currentStep === step.id;
                      const isPast = steps.findIndex(s => s.id === currentStep) > idx;
                      return (
                         <div key={step.id} className="flex items-center">
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
              <h2 className="text-xl font-medium text-white mb-2">Multi-Agent Analysis</h2>
              <p className="text-[#7d8187] max-w-sm leading-relaxed text-sm">
                Paste your code and click Analyze to run the LangGraph pipeline for security, complexity, and refactoring insights.
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
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.bugs?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Bugs</p>
                  </button>

                  <button onClick={() => setActiveView('security')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'security' ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-[#212327] hover:border-amber-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <ShieldAlert className={cn("w-4 h-4", activeView === 'security' ? "text-amber-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.security?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Security</p>
                  </button>

                  <button onClick={() => setActiveView('improvements')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'improvements' ? "bg-blue-500/10 border-blue-500/30" : "bg-[#141414] border-[#212327] hover:border-blue-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <Wrench className={cn("w-4 h-4", activeView === 'improvements' ? "text-blue-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.refactoring?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Refactoring</p>
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
                           <BookOpen className="w-4 h-4" /> AI Synthesis
                         </h3>
                         <p className="text-sm text-[#dadbdf] leading-relaxed">{reviewResult.explanation}</p>
                       </div>
                    )}

                    {reviewResult.complexity && (
                       <div className="bg-[#141414] border border-[#212327] rounded-xl p-5 shadow-inner">
                         <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                           <Zap className="w-4 h-4" /> Complexity Analysis
                         </h3>
                         <p className="text-sm text-[#dadbdf] leading-relaxed font-mono whitespace-pre-wrap">{reviewResult.complexity}</p>
                       </div>
                    )}
                  </div>
                )}

                {/* BUGS MODE */}
                {activeView === 'bugs' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-rose-400" /> Discovered Bugs
                    </h3>
                    {reviewResult.bugs?.length > 0 ? (
                      reviewResult.bugs.map((bug, idx) => (
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
                        <p className="text-[#7d8187] text-sm">{isStreaming ? "Waiting for bug detection..." : "No bugs were detected in this scan."}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SECURITY MODE */}
                {activeView === 'security' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" /> Security Vulnerabilities
                    </h3>
                    {reviewResult.security?.length > 0 ? (
                      reviewResult.security.map((sec, idx) => (
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
                        <p className="text-[#7d8187] text-sm">{isStreaming ? "Waiting for security analysis..." : "No security vulnerabilities detected."}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* IMPROVEMENTS / REFACTORING MODE */}
                {activeView === 'improvements' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-blue-400" /> Refactoring Suggestions
                    </h3>
                    {reviewResult.refactoring?.length > 0 ? (
                      reviewResult.refactoring.map((imp, idx) => (
                        <div key={idx} className="bg-[#141414] border border-[#212327] border-l-2 border-l-blue-500 rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{imp}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        {isStreaming ? (
                           <Loader2 className="w-8 h-8 text-[#7d8187] animate-spin mx-auto mb-3" />
                        ) : (
                           <p className="text-[#7d8187] text-sm">Code structure looks solid.</p>
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
