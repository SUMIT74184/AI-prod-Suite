'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2, ShieldAlert, BookOpen, Lock, Star,
  Zap, Wrench, Code2, Bug, CheckCircle2,
  Activity, GitBranch, ArrowLeft, Search, Download
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ModuleHeader, EmptyState, MonoLabel, ui } from '@/components/workspace/kit'
import { PipelineTracker, HealthGauge, SeverityStrip, KpiTile, SegmentTabs, FindingCard, ReportSection, ReportPlaceholder } from '@/components/workspace/review-report'

interface ReviewResult {
  bugs: any[]
  security: any[]
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

function GitIntegrationsContent() {
  const [githubToken, setGithubToken] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [repos, setRepos] = useState<any[]>([])
  const [isFetchingRepos, setIsFetchingRepos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  
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
              const asstMsg = data.messages.find((m: any) => m.role === 'assistant')
              if (asstMsg) {
                const parsed = JSON.parse(asstMsg.content)
                setReviewResult({
                  bugs: parsed.findings?.filter((f: any) => f.agent === 'bug') || parsed.bugs || [],
                  security: parsed.findings?.filter((f: any) => f.agent === 'security') || parsed.security || [],
                  explanation: parsed.explanation || '',
                  complexity: parsed.complexity || '',
                  refactoring: parsed.refactoring || [],
                  unitTests: parsed.generated_tests || parsed.unit_tests || '',
                  healthScore: parsed.health_score || parsed.healthScore || 100,
                  severityBreakdown: calculateTotalSeverity(
                     parsed.findings?.filter((f: any) => f.agent === 'bug') || parsed.bugs, 
                     parsed.findings?.filter((f: any) => f.agent === 'security') || parsed.security
                  )
                })
                setIsStreaming(false)
                setIsConnected(true) // assume connected to show results
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
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [stepMessage, setStepMessage] = useState<string>('')
  
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [activeView, setActiveView] = useState<'overview' | 'bugs' | 'security' | 'improvements' | 'tests'>('overview')

  const handleReview = async () => {
    if (!selectedRepo) {
      alert('Please select a repository')
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
      const newSessionId = crypto.randomUUID();
      router.push(`/modules/code-reviewer/integrations?sessionId=${newSessionId}`);
      
      const encodedUrl = encodeURIComponent(selectedRepo.html_url);
      const encodedToken = githubToken ? `&token=${encodeURIComponent(githubToken)}` : '';
      const eventSource = new EventSource(`/api/py/code-review/stream/repo?url=${encodedUrl}${encodedToken}&session_id=${newSessionId}&module=code-reviewer`);

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

          if (data.status === 'ping') {
            setStepMessage(data.message);
            return;
          }

          setCurrentStep(data.status);
          setStepMessage(data.message);

          if (data.status === 'complete') {
            // Final update
            setReviewResult({
               bugs: data.data.bugs || [],
               security: data.data.security || [],
               explanation: data.data.explanation || '',
               complexity: data.data.complexity || '',
               refactoring: data.data.refactoring || [],
               unitTests: data.data.unit_tests || '',
               healthScore: data.data.health_score || 100,
               severityBreakdown: calculateTotalSeverity(data.data.bugs, data.data.security)
            });
            eventSource.close();
            setIsStreaming(false);
            window.dispatchEvent(new Event('refresh-conversations'));
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

  const fetchRepos = async () => {
    if (!githubToken.trim()) {
      alert('Please enter your GitHub Personal Access Token');
      return;
    }
    setIsFetchingRepos(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch repositories. Invalid token?');
      const data = await res.json();
      setRepos(data);
      setIsConnected(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFetchingRepos(false);
    }
  }

  const downloadMarkdown = () => {
    if (!reviewResult) return;
    
    let md = `# Code Review Report: ${selectedRepo?.full_name || 'Repository'}\n\n`;
    md += `## 📊 Health Score: ${reviewResult.healthScore}/100\n\n`;
    
    if (reviewResult.explanation) {
       md += `## 📝 Overview\n${reviewResult.explanation}\n\n`;
    }
    
    if (reviewResult.bugs?.length > 0) {
       md += `## 🐛 Bugs\n`;
       reviewResult.bugs.forEach(b => {
          md += `- **[${b.severity}] ${b.category}** (Line: ${b.line_ref})\n  ${b.description}\n`;
       });
       md += '\n';
    }
    
    if (reviewResult.security?.length > 0) {
       md += `## 🔒 Security\n`;
       reviewResult.security.forEach(s => {
          md += `- **[${s.severity}] ${s.category}** (Line: ${s.line_ref})\n  ${s.description}\n`;
       });
       md += '\n';
    }
    
    if (reviewResult.refactoring?.length > 0) {
       md += `## 🔧 Refactoring\n`;
       reviewResult.refactoring.forEach(r => {
          md += `- ${r}\n`;
       });
       md += '\n';
    }
    
    if (reviewResult.complexity) {
       md += `## ⚡ Complexity\n\`\`\`\n${reviewResult.complexity}\n\`\`\`\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-report-${(selectedRepo?.name || 'repo')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const healthScore = reviewResult?.healthScore ?? 100;

  const steps = [
    { id: 'cloning', label: 'Clone' },
    { id: 'preparing', label: 'Extract' },
    { id: 'parse_code', label: 'Parse' },
    { id: 'detect_bugs', label: 'Bugs' },
    { id: 'check_security', label: 'Security' },
    { id: 'analyze_complexity', label: 'Complexity' },
    { id: 'synthesize_report', label: 'Synthesize' },
    { id: 'generate_tests', label: 'Tests' },
    { id: 'finalize_review', label: 'Finalize' }
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      <ModuleHeader
        index="M.02"
        section="Engineering · Integrations"
        title="Repository"
        accent="Scanner"
        description="Scan entire GitHub or GitLab repositories for vulnerabilities"
        leading={
          <Link href="/modules/code-reviewer" className={cn(ui.iconBtn, 'border border-white/[0.08]')} aria-label="Back to Code Reviewer">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Input & Repositories */}
        <div className="flex w-1/3 min-w-[300px] flex-col overflow-hidden border-r border-white/[0.06]">
          {!isConnected ? (
            <div className="relative flex h-full flex-col justify-center p-8 animate-in fade-in">
              <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative">
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/60 shadow-[0_0_40px_-8px_rgba(255,122,23,0.45)]">
                  <GitBranch className="h-5 w-5 text-[#ffc285]" strokeWidth={1.5} />
                </span>
                <MonoLabel index="01">Connect</MonoLabel>
                <h2 className="mt-2 text-[24px] tracking-[-0.02em] text-white">
                  Connect <span className="lab-serif text-[#ffc285]">GitHub</span>
                </h2>
                <p className="mb-8 mt-2 text-[13.5px] leading-relaxed text-gray-500">
                  Authenticate to securely review your private and public repositories. We only request read access.
                </p>

                <label className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-400">
                  <Lock className="h-3 w-3 text-[#ffc285]" /> Personal Access Token
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="ws-field mb-4 h-11 w-full px-4 font-mono text-[13px]"
                />
                <button
                  onClick={fetchRepos}
                  disabled={isFetchingRepos || !githubToken.trim()}
                  className={cn(ui.btnPrimary, 'h-11 w-full')}
                >
                  {isFetchingRepos ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                  Connect Account
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden animate-in fade-in">
              <div className="space-y-3 border-b border-white/[0.06] p-5">
                <div className="flex items-center justify-between">
                  <MonoLabel index="01">Your repositories · {repos.length}</MonoLabel>
                  <button onClick={() => setIsConnected(false)} className="font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:text-red-300">
                    Disconnect
                  </button>
                </div>
                <div className="ws-field flex h-10 items-center gap-2 px-3">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-[13.5px] text-white placeholder-gray-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
                {repos.filter(r => r.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(repo => {
                  const selected = selectedRepo?.id === repo.id
                  return (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      className={cn(
                        'relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border p-3.5 text-left transition-all',
                        selected ? 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'
                      )}
                    >
                      {selected && <span className="absolute inset-y-0 left-0 w-[2px] bg-[#ff7a17]" />}
                      <div className="flex items-center gap-2">
                        <Code2 className={cn('h-4 w-4 shrink-0', selected ? 'text-[#ffc285]' : 'text-gray-500')} />
                        <span className={cn('truncate text-[13.5px]', selected ? 'text-white' : 'text-gray-300')}>
                          {repo.full_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10.5px] text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ffc285]" />
                          {repo.language || 'Mixed'}
                        </span>
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {repo.stargazers_count}</span>
                        {repo.private && <span className="rounded-full border border-white/10 px-1.5 py-px uppercase tracking-wider text-gray-400">Private</span>}
                      </div>
                    </button>
                  )
                })}
                {repos.length === 0 && (
                  <div className="p-8 text-center text-[13px] text-gray-500">No repositories found.</div>
                )}
              </div>

              <div className="border-t border-white/[0.06] p-5">
                <button
                  onClick={handleReview}
                  disabled={isStreaming || !selectedRepo}
                  className={cn(ui.btnPrimary, 'relative h-11 w-full overflow-hidden text-[14px]')}
                >
                  {isStreaming && <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-[#ff7a17]/25 to-transparent" />}
                  {isStreaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning {selectedRepo?.name}...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4" />
                      Run Code Review
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: AI Review Dashboard */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-[#070708]">
          {/* Progress Tracker (Visible when streaming) */}
          {(isStreaming || (reviewResult && currentStep !== 'complete' && currentStep !== '')) && (
            <PipelineTracker steps={steps} currentStep={currentStep} message={stepMessage} />
          )}

          {!reviewResult && !isStreaming ? (
            <EmptyState
              icon={GitBranch}
              title="Select a"
              accent="repository."
              body="Choose a repository from the left panel to run a comprehensive multi-file LangGraph analysis for bugs, security vulnerabilities, and architectural health."
            />
          ) : reviewResult && (
            <div className="flex flex-1 flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dashboard Header / Scorecard */}
              <div className="space-y-5 border-b border-white/[0.06] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <MonoLabel index="02">Repository health report</MonoLabel>
                    <h2 className="mt-1.5 truncate text-[19px] tracking-tight text-white">
                      {selectedRepo?.full_name || 'Repository'}
                    </h2>
                    <div className="mt-2">
                      <SeverityStrip breakdown={reviewResult.severityBreakdown} />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {(!isStreaming && currentStep === 'complete') && (
                      <button onClick={downloadMarkdown} className={ui.btnOutline}>
                        <Download className="h-3.5 w-3.5" />
                        Download Report
                      </button>
                    )}
                    <HealthGauge score={healthScore} />
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <KpiTile icon={Bug} label="Bugs Found" value={reviewResult.bugs?.length || 0} active={activeView === 'bugs'} onClick={() => setActiveView('bugs')} />
                  <KpiTile icon={ShieldAlert} label="Vulnerabilities" value={reviewResult.security?.length || 0} active={activeView === 'security'} onClick={() => setActiveView('security')} />
                  <KpiTile icon={Wrench} label="Refactoring" value={reviewResult.refactoring?.length || 0} active={activeView === 'improvements'} onClick={() => setActiveView('improvements')} />
                </div>
              </div>

              <div className="border-b border-white/[0.06] px-6 py-2.5">
                <SegmentTabs
                  value={activeView}
                  onChange={setActiveView}
                  tabs={[
                    { id: 'overview', label: 'Overview' },
                    { id: 'bugs', label: 'Bugs' },
                    { id: 'security', label: 'Security' },
                    { id: 'improvements', label: 'Refactoring' },
                  ]}
                />
              </div>

              {/* Detailed View Area */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* OVERVIEW MODE */}
                {activeView === 'overview' && (
                  <div className="space-y-5 animate-in fade-in">
                    {reviewResult.explanation ? (
                      <div className="rounded-2xl border border-[#ff7a17]/20 bg-gradient-to-br from-[#ff7a17]/[0.07] via-transparent to-transparent p-5">
                        <MonoLabel index="◆" className="mb-3">Repo synthesis</MonoLabel>
                        <p className="text-[14px] leading-relaxed text-gray-200">{reviewResult.explanation}</p>
                      </div>
                    ) : (
                      <ReportPlaceholder streaming={isStreaming} streamingText="Waiting for the synthesis step…" idleText="No synthesis was produced for this scan." icon={BookOpen} />
                    )}

                    {reviewResult.complexity && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                        <MonoLabel index="◆" className="mb-3">
                          <Zap className="h-3 w-3 text-[#c4b5fd]" /> Architecture complexity
                        </MonoLabel>
                        <p className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-gray-300">{reviewResult.complexity}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* BUGS MODE */}
                {activeView === 'bugs' && (
                  <ReportSection icon={Bug} title="Discovered Bugs" count={reviewResult.bugs?.length || 0}>
                    {reviewResult.bugs?.length > 0 ? (
                      reviewResult.bugs.map((bug, idx) => (
                        <FindingCard key={idx} severity={bug.severity} category={bug.category} lineRef={bug.line_ref} description={bug.description} />
                      ))
                    ) : (
                      <ReportPlaceholder streaming={isStreaming} streamingText="Waiting for bug detection..." idleText="No bugs were detected across scanned files." icon={CheckCircle2} />
                    )}
                  </ReportSection>
                )}

                {/* SECURITY MODE */}
                {activeView === 'security' && (
                  <ReportSection icon={ShieldAlert} title="Security Vulnerabilities" count={reviewResult.security?.length || 0}>
                    {reviewResult.security?.length > 0 ? (
                      reviewResult.security.map((sec, idx) => (
                        <FindingCard key={idx} severity={sec.severity} category={sec.category} lineRef={sec.line_ref} description={sec.description} />
                      ))
                    ) : (
                      <ReportPlaceholder streaming={isStreaming} streamingText="Waiting for security analysis..." idleText="No security vulnerabilities detected." icon={ShieldAlert} />
                    )}
                  </ReportSection>
                )}

                {/* IMPROVEMENTS / REFACTORING MODE */}
                {activeView === 'improvements' && (
                  <ReportSection icon={Wrench} title="Refactoring Suggestions" count={reviewResult.refactoring?.length || 0}>
                    {reviewResult.refactoring?.length > 0 ? (
                      <ol className="space-y-2">
                        {reviewResult.refactoring.map((imp, idx) => (
                          <li key={idx} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                            <span className="font-mono text-[11px] text-[#ff7a17]">{String(idx + 1).padStart(2, '0')}</span>
                            <p className="text-[13.5px] leading-relaxed text-gray-300">{imp}</p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <ReportPlaceholder streaming={isStreaming} streamingText="Waiting for synthesis..." idleText="Architecture looks solid." />
                    )}
                  </ReportSection>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GitIntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-5 w-5 animate-spin text-[#ffc285]" />
      </div>
    }>
      <GitIntegrationsContent />
    </Suspense>
  )
}
