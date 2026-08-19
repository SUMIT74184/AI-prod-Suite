'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import FileUploadZone from '@/components/shared/file-upload-zone'
import { 
  Loader2, Copy, AlertCircle, ShieldAlert, Lightbulb, BookOpen, 
  Zap, Wrench, TestTube, Terminal, Code2, Bug, CheckCircle2,
  Sparkles, Activity, Link2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ReviewResult {
  bugs: string[]
  security: string[]
  improvements: string[]
  explanation: string
  complexity: string
  refactoring: string[]
  unitTests: string
}

export default function CodeReviewerPage() {
  const [code, setCode] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  
  // Dashboard view state
  const [activeView, setActiveView] = useState<'overview' | 'bugs' | 'security' | 'improvements' | 'tests'>('overview')

  const handleReview = async () => {
    if (!code.trim()) {
      alert('Please enter code to review')
      return
    }

    setIsLoading(true)
    setReviewResult(null)
    try {
      const response = await fetch('/api/py/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('Backend returned an error')
      }

      const data = await response.json()
      setReviewResult(data)
      setActiveView('overview')
    } catch (error) {
      console.error('Review failed:', error)
      alert('Failed to review code. Is the Python backend running?')
    } finally {
      setIsLoading(false)
    }
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

  // Calculate some simple metrics based on the result
  const totalIssues = reviewResult 
    ? (reviewResult.bugs?.length || 0) + (reviewResult.security?.length || 0) 
    : 0
  const healthScore = reviewResult ? Math.max(0, 100 - (totalIssues * 15)) : 100

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
              Lumina Reviewer <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono border border-indigo-500/20 uppercase tracking-widest">v2.0</span>
            </h1>
            <p className="text-sm text-[#7d8187] mt-0.5 font-normal">
              Enterprise-grade AI vulnerability and performance analysis
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
              disabled={isLoading || !code.trim()}
              className="w-full h-12 gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.15)] transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Deep Analysis...
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
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505]/80 backdrop-blur-sm z-50">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin animation-delay-150"></div>
                <div className="absolute inset-4 rounded-full border-b-2 border-emerald-500 animate-spin animation-delay-300"></div>
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-white animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Analyzing Architecture</h3>
              <p className="text-sm text-[#7d8187] font-mono animate-pulse">Running security and complexity heuristics...</p>
            </div>
          ) : !reviewResult ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
                <ShieldAlert className="w-8 h-8 text-[#4a4a4a]" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">No Analysis Data</h2>
              <p className="text-[#7d8187] max-w-sm leading-relaxed text-sm">
                Paste your code and click Analyze to generate a comprehensive security, technical debt, and refactoring report.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dashboard Header / Scorecard */}
              <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Scan Report</h2>
                    <p className="text-xs text-[#7d8187] font-mono mt-1">Generated instantly via AI</p>
                  </div>
                  
                  {/* Health Score Circular Gauge */}
                  <div className="flex items-center gap-3 bg-[#141414] border border-[#212327] px-4 py-2 rounded-xl shadow-inner">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-[#7d8187] uppercase tracking-wider font-semibold">Health Score</span>
                      <span className={cn(
                        "text-2xl font-bold font-mono",
                        healthScore > 80 ? "text-emerald-400" : healthScore > 50 ? "text-amber-400" : "text-rose-400"
                      )}>
                        {healthScore}/100
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-4 flex items-center justify-center" style={{ 
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
                      <Lightbulb className={cn("w-4 h-4", activeView === 'improvements' ? "text-blue-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.improvements?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Improvements</p>
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
                    <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4" /> AI Explanation
                      </h3>
                      <p className="text-sm text-[#dadbdf] leading-relaxed">{reviewResult.explanation}</p>
                    </div>

                    <div className="bg-[#141414] border border-[#212327] rounded-xl p-5 shadow-inner">
                      <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" /> Complexity Analysis
                      </h3>
                      <p className="text-sm text-[#dadbdf] leading-relaxed font-mono whitespace-pre-wrap">{reviewResult.complexity}</p>
                    </div>

                    {reviewResult.refactoring?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                          <Wrench className="w-4 h-4 text-[#7d8187]" /> Refactoring Suggestions
                        </h3>
                        <div className="space-y-2">
                          {reviewResult.refactoring.map((ref, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-3 bg-[#0a0a0a] border border-[#1a1c20] rounded-lg">
                              <span className="w-5 h-5 rounded bg-[#141414] text-[#7d8187] flex items-center justify-center text-[10px] font-mono mt-0.5 shrink-0">{idx + 1}</span>
                              <p className="text-sm text-[#dadbdf] leading-relaxed">{ref}</p>
                            </div>
                          ))}
                        </div>
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
                        <div key={idx} className="bg-[#141414] border border-[#212327] border-l-2 border-l-rose-500 rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{bug}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-50" />
                        <p className="text-[#7d8187] text-sm">No bugs were detected in this scan.</p>
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
                        <div key={idx} className="bg-[#141414] border border-[#212327] border-l-2 border-l-amber-500 rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{sec}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        <ShieldAlert className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-50" />
                        <p className="text-[#7d8187] text-sm">No security vulnerabilities detected.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* IMPROVEMENTS MODE */}
                {activeView === 'improvements' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-blue-400" /> Architecture Improvements
                    </h3>
                    {reviewResult.improvements?.length > 0 ? (
                      reviewResult.improvements.map((imp, idx) => (
                        <div key={idx} className="bg-[#141414] border border-[#212327] border-l-2 border-l-blue-500 rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-[#dadbdf] leading-relaxed">{imp}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#212327] rounded-xl">
                        <p className="text-[#7d8187] text-sm">Code structure looks solid.</p>
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
                    <div className="flex-1 bg-[#0a0a0a] border border-[#1a1c20] rounded-xl p-4 overflow-hidden relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                         <span className="px-2 py-1 bg-[#1a1c20] text-[#7d8187] text-[10px] font-mono rounded">Generated Code</span>
                      </div>
                      <pre className="text-[#dadbdf] font-mono text-xs overflow-auto h-full custom-scrollbar leading-relaxed">
                        {reviewResult.unitTests}
                      </pre>
                    </div>
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
