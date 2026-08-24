import Link from 'next/link';
import { Brain, Code2, Lightbulb, Search, Workflow, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-white selection:bg-white/20 font-sans">

      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none' }}
      >
        <source src="/no_watermakr_space.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for text readability & glassmorphism contrast */}
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(10, 10, 10, 0.4) 0%, rgba(10, 10, 10, 0.85) 60%, rgba(5, 5, 5, 0.95) 100%)',
        }}
      />

      {/* Nav bar */}
      <nav className="relative z-[2] border-b border-white/10 bg-black/20 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/ProdSuite.png" alt="ProdSuite Logo" className="w-8 h-8 rounded shadow-lg border border-white/10 object-cover" />
            <span className="text-lg font-medium tracking-wide">ProdSuite</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-full overflow-hidden transition-all hover:bg-white/20 hover:scale-105"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-[2] max-w-7xl mx-auto px-6 py-20 md:py-32">
        
        {/* Hero section */}
        <header className="mb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-8 backdrop-blur-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ProdSuite 2.0 is live</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8 max-w-4xl">
            Your Ultimate Developer Ecosystem
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl font-light leading-relaxed">
            Unify your workflow. From deep web research and code reviews to advanced prompt engineering, ProdSuite integrates all your AI tools into one seamless glassmorphic canvas.
          </p>
        </header>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Research Assistant - Large Hero Card */}
          <Link 
            href="/modules/research-assistant"
            className="group md:col-span-2 md:row-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-500 flex flex-col justify-between overflow-hidden relative"
          >
            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-colors" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-8 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-semibold text-white mb-4">Research Assistant</h2>
              <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                Your primary workspace for synthesizing documents, deep-diving into complex topics, and organizing knowledge intuitively.
              </p>
            </div>
            <div className="mt-12 relative z-10">
              <span className="inline-flex items-center gap-2 text-white font-medium border-b border-transparent group-hover:border-white transition-colors pb-1">
                Open Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          {/* Prompt Playground */}
          <Link 
            href="/modules/prompt-playground"
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] group-hover:bg-emerald-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Prompt Playground</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Design, test, and iterate on complex system prompts with real-time SSE streaming and multi-model comparison.</p>
            </div>
          </Link>

          {/* Code Reviewer */}
          <Link 
            href="/modules/code-reviewer"
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-[50px] group-hover:bg-orange-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                <Code2 className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Code Reviewer</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Automate PR checks and analyze codebase architecture for vulnerabilities and optimizations.</p>
            </div>
          </Link>

          {/* Web Research Agent */}
          <Link 
            href="/modules/web-research-agent"
            className="group md:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 flex flex-col justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-md">
                <Search className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white mb-2">Web Research Agents</h3>
                <p className="text-gray-400">Deploy LangGraph-powered autonomous agents to scour the web, synthesize findings, and compile comprehensive reports entirely in the background.</p>
              </div>
            </div>
          </Link>

          {/* Workflow Automation */}
          <Link 
            href="/modules/workflow-automation"
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-pink-500/10 rounded-full blur-[50px] group-hover:bg-pink-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                <Workflow className="w-5 h-5 text-pink-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Automations</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Chain your favorite AI agents together into powerful, recurring pipelines.</p>
            </div>
          </Link>
          
        </div>
        
        {/* Footer hint */}
        <div className="mt-24 text-center relative z-10">
          <p className="text-gray-500 flex items-center justify-center gap-3 text-sm">
            <span>
              Press <kbd className="px-2 py-1 mx-1 bg-white/5 rounded-md text-xs font-mono border border-white/10 text-gray-300 shadow-inner">⌘ + K</kbd> to search across ProdSuite
            </span>
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-[2] border-t border-white/10 bg-black/40 backdrop-blur-xl px-6 py-8 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">ProdSuite</p>
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Built with precision</p>
        </div>
      </footer>
    </div>
  );
}
