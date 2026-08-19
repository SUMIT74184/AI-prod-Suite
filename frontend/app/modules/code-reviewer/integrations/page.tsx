'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, CheckCircle2, Webhook, Loader2, Link2, GitBranch, ShieldCheck,
  Globe2, Lock, Settings2, Trash2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const Github = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export default function IntegrationsPage() {
  const [githubConnected, setGithubConnected] = useState(false)
  const [gitlabConnected, setGitlabConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState<'github' | 'gitlab' | null>(null)
  const [attachingRepo, setAttachingRepo] = useState<number | null>(null)
  
  const [repos, setRepos] = useState([
    { id: 1, name: 'acme-corp/frontend-webapp', provider: 'github', attached: false, private: true },
    { id: 2, name: 'acme-corp/backend-api', provider: 'github', attached: true, private: true },
    { id: 3, name: 'acme-corp/lumina-docs', provider: 'github', attached: false, private: false },
    { id: 4, name: 'acme-corp/infrastructure', provider: 'gitlab', attached: false, private: true },
  ])

  const handleConnect = (provider: 'github' | 'gitlab') => {
    setIsConnecting(provider)
    // Simulate OAuth delay
    setTimeout(() => {
      if (provider === 'github') setGithubConnected(true)
      if (provider === 'gitlab') setGitlabConnected(true)
      setIsConnecting(null)
    }, 1200)
  }

  const toggleAttach = (id: number) => {
    setAttachingRepo(id)
    // Simulate Webhook installation delay
    setTimeout(() => {
      setRepos(prev => prev.map(repo => 
        repo.id === id ? { ...repo, attached: !repo.attached } : repo
      ))
      setAttachingRepo(null)
    }, 800)
  }

  const activeRepos = repos.filter(repo => {
    if (repo.provider === 'github' && githubConnected) return true
    if (repo.provider === 'gitlab' && gitlabConnected) return true
    return false
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] p-5 bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/modules/code-reviewer">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-[#7d8187] hover:text-white hover:bg-[#1a1c20]">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-3">
                Repository Integrations
              </h1>
              <p className="text-sm text-[#7d8187] mt-1 font-normal">
                Connect your Git providers to enable automated PR reviews and webhooks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-12">
        
        {/* Providers Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-400" /> Git Providers
            </h2>
            <p className="text-[#7d8187] text-sm mt-1">Authenticate with your provider to index repositories and install the PR bot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub Card */}
            <div className={cn(
              "rounded-2xl border transition-all duration-300 p-6 flex flex-col items-start gap-6",
              githubConnected ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[#0a0a0a] border-[#212327] hover:border-[rgba(255,255,255,0.2)]"
            )}>
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                {githubConnected ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1c20] border border-[#212327] text-[#7d8187] text-xs font-semibold uppercase tracking-wider">
                    Disconnected
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-semibold text-white">GitHub App Integration</h3>
                <p className="text-sm text-[#7d8187] mt-1.5 leading-relaxed">
                  Allows Lumina to listen to Pull Request events, scan diffs, and post inline comments on GitHub.
                </p>
              </div>

              <div className="mt-auto w-full pt-2">
                {!githubConnected ? (
                  <Button 
                    onClick={() => handleConnect('github')}
                    disabled={isConnecting !== null}
                    className="w-full bg-white text-black hover:bg-gray-200 gap-2 h-11 rounded-xl shadow-lg transition-all"
                  >
                    {isConnecting === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                    {isConnecting === 'github' ? 'Authenticating...' : 'Connect GitHub'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setGithubConnected(false)}
                    className="w-full border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-2 h-11 rounded-xl transition-all"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            {/* GitLab Card */}
            <div className={cn(
              "rounded-2xl border transition-all duration-300 p-6 flex flex-col items-start gap-6",
              gitlabConnected ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[#0a0a0a] border-[#212327] hover:border-[rgba(255,255,255,0.2)]"
            )}>
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#212327] flex items-center justify-center">
                  <GitBranch className="w-6 h-6 text-orange-500" />
                </div>
                {gitlabConnected ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1c20] border border-[#212327] text-[#7d8187] text-xs font-semibold uppercase tracking-wider">
                    Disconnected
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-semibold text-white">GitLab OAuth Integration</h3>
                <p className="text-sm text-[#7d8187] mt-1.5 leading-relaxed">
                  Allows Lumina to listen to Merge Request events, scan diffs, and post inline comments on GitLab.
                </p>
              </div>

              <div className="mt-auto w-full pt-2">
                {!gitlabConnected ? (
                  <Button 
                    onClick={() => handleConnect('gitlab')}
                    disabled={isConnecting !== null}
                    className="w-full bg-[#FC6D26] text-white hover:bg-[#e25814] gap-2 h-11 rounded-xl shadow-[0_0_20px_rgba(252,109,38,0.2)] transition-all"
                  >
                    {isConnecting === 'gitlab' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                    {isConnecting === 'gitlab' ? 'Authenticating...' : 'Connect GitLab'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setGitlabConnected(false)}
                    className="w-full border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-2 h-11 rounded-xl transition-all"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Repositories Section (Only shown if at least one provider is connected) */}
        {(githubConnected || gitlabConnected) && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Protect Repositories
                </h2>
                <p className="text-[#7d8187] text-sm mt-1">Select repositories to attach webhooks for automated code reviews.</p>
              </div>
              
              <Button variant="outline" className="gap-2 border-[#212327] bg-[#0a0a0a] text-white">
                <Settings2 className="w-4 h-4" /> Global Rules
              </Button>
            </div>

            <div className="bg-[#0a0a0a] border border-[#212327] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 border-b border-[rgba(255,255,255,0.05)] bg-[#0d0d0d]">
                <span className="text-xs font-semibold text-[#7d8187] uppercase tracking-wider pl-2">Repository</span>
                <span className="text-xs font-semibold text-[#7d8187] uppercase tracking-wider pr-4">Webhook Status</span>
              </div>
              
              <div className="divide-y divide-[#212327]">
                {activeRepos.map((repo) => (
                  <div key={repo.id} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div className="flex items-center gap-3 pl-2">
                      {repo.provider === 'github' ? <Github className="w-5 h-5 text-[#dadbdf]" /> : <GitBranch className="w-5 h-5 text-orange-500" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white">{repo.name}</span>
                          {repo.private ? (
                            <Lock className="w-3 h-3 text-[#7d8187]" />
                          ) : (
                            <Globe2 className="w-3 h-3 text-[#7d8187]" />
                          )}
                        </div>
                        <span className="text-xs text-[#7d8187] mt-0.5 block">{repo.provider === 'github' ? 'GitHub' : 'GitLab'}</span>
                      </div>
                    </div>
                    
                    <div>
                      {repo.attached ? (
                        <Button 
                          onClick={() => toggleAttach(repo.id)}
                          disabled={attachingRepo === repo.id}
                          className="h-9 gap-2 bg-emerald-500/10 hover:bg-rose-500/10 text-emerald-400 hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/30 transition-all rounded-lg group"
                        >
                          {attachingRepo === repo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Webhook className="w-4 h-4 group-hover:hidden" />
                              <span className="group-hover:hidden">Attached</span>
                              <Trash2 className="w-4 h-4 hidden group-hover:block" />
                              <span className="hidden group-hover:block">Remove</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => toggleAttach(repo.id)}
                          disabled={attachingRepo === repo.id}
                          variant="outline"
                          className="h-9 gap-2 bg-transparent border-[#212327] hover:border-indigo-500/50 hover:text-indigo-400 transition-all rounded-lg"
                        >
                          {attachingRepo === repo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Webhook className="w-4 h-4" />
                              Attach Webhook
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
