'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Loader2, AlertCircle, ShieldAlert, BookOpen, 
  Zap, Wrench, TestTube, Terminal, Code2, Bug, CheckCircle2,
  Activity, GitBranch, ArrowLeft, Search, Download
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

export default function GitIntegrationsPage() {
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
          <Link href="/modules/code-reviewer">
            <Button variant="ghost" size="icon" className="text-[#7d8187] hover:text-white hover:bg-[#1a1c20]">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <GitBranch className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              Repository Scanner
            </h1>
            <p className="text-sm text-[#7d8187] mt-0.5 font-normal">
              Scan entire GitHub or GitLab repositories for vulnerabilities
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Input & Repositories */}
        <div className="w-1/3 flex flex-col border-r border-[rgba(255,255,255,0.05)] bg-[#0a0a0a] overflow-hidden">
          {!isConnected ? (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-in fade-in">
               <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center mb-6 shadow-lg">
                  <GitBranch className="w-8 h-8 text-white" />
               </div>
               <h2 className="text-xl font-semibold text-white mb-2">Connect GitHub</h2>
               <p className="text-[#7d8187] text-sm mb-8 leading-relaxed">
                 Authenticate to securely review your private and public repositories. We only request read access.
               </p>

               <div className="w-full text-left">
                 <label className="text-sm font-medium text-[#dadbdf] mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Personal Access Token
                 </label>
                 <Input 
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="bg-[#141414] border-[#212327] text-white focus-visible:ring-indigo-500/50 mb-4 h-11"
                 />
                 <Button
                    onClick={fetchRepos}
                    disabled={isFetchingRepos || !githubToken.trim()}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-all"
                 >
                    {isFetchingRepos ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <GitBranch className="w-5 h-5 mr-2" />}
                    Connect Account
                 </Button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in">
              <div className="p-5 border-b border-[#212327]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-white flex items-center gap-2">
                     <GitBranch className="w-4 h-4 text-[#7d8187]" /> Your Repositories
                  </h2>
                  <button onClick={() => setIsConnected(false)} className="text-xs text-[#7d8187] hover:text-white transition-colors">
                     Disconnect
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8187]" />
                  <Input 
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#141414] border-[#212327] pl-9 h-10 text-white placeholder:text-[#4a4a4a]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                 {repos.filter(r => r.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(repo => (
                    <button
                       key={repo.id}
                       onClick={() => setSelectedRepo(repo)}
                       className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2",
                          selectedRepo?.id === repo.id 
                             ? "bg-indigo-500/10 border-indigo-500/30" 
                             : "bg-[#141414] border-[#212327] hover:border-[#4a4a4a]"
                       )}
                    >
                       <div className="flex items-center gap-2">
                          <Code2 className={cn("w-4 h-4", selectedRepo?.id === repo.id ? "text-indigo-400" : "text-[#7d8187]")} />
                          <span className={cn("font-medium text-sm truncate", selectedRepo?.id === repo.id ? "text-indigo-400" : "text-[#dadbdf]")}>
                             {repo.full_name}
                          </span>
                       </div>
                       <div className="flex items-center gap-3 text-xs text-[#7d8187]">
                          <span className="flex items-center gap-1">
                             <span className="w-2 h-2 rounded-full bg-amber-500/80"></span>
                             {repo.language || 'Mixed'}
                          </span>
                          <span>⭐ {repo.stargazers_count}</span>
                          {repo.private && <span className="text-rose-400 font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10">Private</span>}
                       </div>
                    </button>
                 ))}
                 {repos.length === 0 && (
                    <div className="text-center p-8 text-[#7d8187] text-sm">No repositories found.</div>
                 )}
              </div>

              <div className="p-5 border-t border-[#212327] bg-[#0a0a0a]">
                <Button
                  onClick={handleReview}
                  disabled={isStreaming || !selectedRepo}
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
                      Scanning {selectedRepo?.name}...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5 group-hover:animate-pulse" />
                      Run Code Review
                    </>
                  )}
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: AI Review Dashboard */}
        <div className="w-2/3 flex flex-col bg-[#050505] relative">
          
          {/* Progress Tracker (Visible when streaming) */}
          {(isStreaming || (reviewResult && currentStep !== 'complete' && currentStep !== '')) && (
             <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                   </div>
                   <div>
                      <h3 className="text-sm font-medium text-white">{stepMessage}</h3>
                      <p className="text-xs text-[#7d8187] font-mono">Agent state: {currentStep}</p>
                   </div>
                </div>
                
                {/* Visual Stepper */}
                <div className="flex items-center justify-between w-full px-2 mt-4 relative">
                   <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#212327] z-0"></div>
                   {steps.map((step, index) => {
                      const stepIndex = steps.findIndex(s => s.id === currentStep);
                      const isCompleted = stepIndex > index || currentStep === 'complete';
                      const isCurrent = step.id === currentStep;
                      
                      return (
                         <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={cn(
                               "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                               isCompleted ? "bg-emerald-500 border-emerald-500" :
                               isCurrent ? "bg-indigo-500 border-indigo-500 ring-4 ring-indigo-500/20" :
                               "bg-[#141414] border-[#4a4a4a]"
                            )}>
                               {isCompleted && <CheckCircle2 className="w-3 h-3 text-[#050505]" />}
                            </div>
                            <span className={cn(
                               "text-[10px] font-mono uppercase font-semibold transition-colors duration-300 absolute -bottom-6 whitespace-nowrap",
                               isCompleted ? "text-emerald-400" :
                               isCurrent ? "text-indigo-400" :
                               "text-[#4a4a4a]"
                            )}>
                               {step.label}
                            </span>
                         </div>
                      );
                   })}
                </div>
                <div className="h-4"></div> {/* Spacer for absolute labels */}
             </div>
          )}

          {!reviewResult && !isStreaming ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
                <GitBranch className="w-8 h-8 text-[#4a4a4a]" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Select a Repository</h2>
              <p className="text-[#7d8187] max-w-sm leading-relaxed text-sm">
                Choose a repository from the left panel to run a comprehensive multi-file LangGraph analysis for bugs, security vulnerabilities, and architectural health.
              </p>
            </div>
          ) : reviewResult && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dashboard Header / Scorecard */}
              <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Repository Health Report</h2>
                    <div className="flex gap-2 mt-2">
                       {reviewResult.severityBreakdown?.critical ? <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">{reviewResult.severityBreakdown.critical} CRIT</span> : null}
                       {reviewResult.severityBreakdown?.high ? <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">{reviewResult.severityBreakdown.high} HIGH</span> : null}
                    </div>
                  </div>
                  
                  {/* Health Score & Download Button */}
                  <div className="flex items-center gap-4">
                     {(!isStreaming && currentStep === 'complete') && (
                        <Button
                           onClick={downloadMarkdown}
                           variant="outline"
                           className="bg-[#141414] border-[#212327] text-white hover:bg-[#1a1c20] hover:text-indigo-400 gap-2 h-10"
                        >
                           <Download className="w-4 h-4" />
                           Download Report
                        </Button>
                     )}
                     
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
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setActiveView('bugs')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'bugs' ? "bg-rose-500/10 border-rose-500/30" : "bg-[#141414] border-[#212327] hover:border-rose-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <Bug className={cn("w-4 h-4", activeView === 'bugs' ? "text-rose-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.bugs?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Bugs Found</p>
                  </button>

                  <button onClick={() => setActiveView('security')} className={cn("text-left p-3 rounded-xl border transition-all", activeView === 'security' ? "bg-amber-500/10 border-amber-500/30" : "bg-[#141414] border-[#212327] hover:border-amber-500/30")}>
                    <div className="flex items-center justify-between mb-2">
                      <ShieldAlert className={cn("w-4 h-4", activeView === 'security' ? "text-amber-400" : "text-[#7d8187]")} />
                      <span className="text-lg font-mono font-bold text-white">{reviewResult.security?.length || 0}</span>
                    </div>
                    <p className="text-xs text-[#7d8187] uppercase font-semibold">Vulnerabilities</p>
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

              {/* Detailed View Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* OVERVIEW MODE */}
                {activeView === 'overview' && (
                  <div className="space-y-6 animate-in fade-in">
                    {reviewResult.explanation && (
                       <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-5">
                         <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2 mb-2">
                           <BookOpen className="w-4 h-4" /> Repo Synthesis
                         </h3>
                         <p className="text-sm text-[#dadbdf] leading-relaxed">{reviewResult.explanation}</p>
                       </div>
                    )}

                    {reviewResult.complexity && (
                       <div className="bg-[#141414] border border-[#212327] rounded-xl p-5 shadow-inner">
                         <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                           <Zap className="w-4 h-4" /> Architecture Complexity
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
                        <p className="text-[#7d8187] text-sm">{isStreaming ? "Waiting for bug detection..." : "No bugs were detected across scanned files."}</p>
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
                           <p className="text-[#7d8187] text-sm">Architecture looks solid.</p>
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
