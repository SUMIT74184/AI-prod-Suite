import Link from 'next/link';
import { Brain, Code2, Lightbulb, Search, Workflow, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20">

      {/* Nav bar */}
      <nav className="border-b border-[#212327] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-white" />
            <span className="text-[15px] font-normal tracking-tight">AI Suite</span>
          </div>
          <Link
            href="/modules/research-assistant"
            className="xai-btn-outline inline-flex items-center gap-2 px-4 py-1.5"
          >
            Open App
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        
        {/* Hero section */}
        <header className="mb-20 md:mb-28">
          <p className="xai-caption-mono text-[#7d8187] mb-6">
            AI Productivity Suite
          </p>
          <h1 className="xai-display-md md:xai-display-lg text-white mb-6 max-w-3xl">
            What are we working on today?
          </h1>
          <p className="xai-body-lg text-[#dadbdf] max-w-2xl">
            Select a module below to jump right in. Your recent projects and workflows are ready when you are.
          </p>
        </header>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          
          {/* Research Assistant - Featured */}
          <Link 
            href="/modules/research-assistant"
            className="group md:col-span-2 md:row-span-2 xai-card p-8 transition-all duration-300 hover:border-[rgba(255,255,255,0.25)] flex flex-col justify-between min-h-[320px] xai-animate-in opacity-0 xai-delay-1"
          >
            <div>
              <p className="xai-caption-mono-sm text-[#7d8187] mb-5">Research</p>
              <div className="w-10 h-10 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center mb-6">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h2 className="xai-display-xs text-white mb-3">Research Assistant</h2>
              <p className="xai-body-md text-[#dadbdf] max-w-md">
                Your primary workspace for synthesizing documents, deep-diving into complex topics, and organizing knowledge intuitively.
              </p>
            </div>
            <div className="mt-8">
              <span className="xai-btn-outline inline-flex items-center gap-2 px-5 py-2 group-hover:border-[rgba(255,255,255,0.5)]">
                Open Workspace
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>

          {/* Code Reviewer */}
          <Link 
            href="/modules/code-reviewer"
            className="group xai-card p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.25)] flex flex-col justify-between min-h-[150px] xai-animate-in opacity-0 xai-delay-2"
          >
            <div>
              <p className="xai-caption-mono-sm text-[#7d8187] mb-4">Code</p>
              <div className="w-9 h-9 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center mb-4">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-[17px] font-normal text-white mb-1.5">Code Review</h3>
              <p className="text-sm text-[#7d8187]">Analyze & optimize code structure</p>
            </div>
          </Link>

          {/* Prompt Playground */}
          <Link 
            href="/modules/prompt-playground"
            className="group xai-card p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.25)] flex flex-col justify-between min-h-[150px] xai-animate-in opacity-0 xai-delay-3"
          >
            <div>
              <p className="xai-caption-mono-sm text-[#7d8187] mb-4">Prompts</p>
              <div className="w-9 h-9 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center mb-4">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-[17px] font-normal text-white mb-1.5">Playground</h3>
              <p className="text-sm text-[#7d8187]">Test & iterate system prompts</p>
            </div>
          </Link>

          {/* Web Research Agent */}
          <Link 
            href="/modules/web-research-agent"
            className="group md:col-span-2 xai-card p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.25)] flex items-center justify-between xai-animate-in opacity-0 xai-delay-4"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-normal text-white mb-1">Web Research</h3>
                <p className="text-sm text-[#7d8187]">Deploy agents to scour the web and compile reports automatically.</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#7d8187] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block mr-2" />
          </Link>

          {/* Workflow Automation */}
          <Link 
            href="/modules/workflow-automation"
            className="group xai-card p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.25)] flex flex-col justify-between min-h-[150px] xai-animate-in opacity-0 xai-delay-5"
          >
            <div>
              <p className="xai-caption-mono-sm text-[#7d8187] mb-4">Automation</p>
              <div className="w-9 h-9 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center mb-4">
                <Workflow className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-[17px] font-normal text-white mb-1.5">Workflows</h3>
              <p className="text-sm text-[#7d8187]">Chain agents together</p>
            </div>
          </Link>
          
        </div>
        
        {/* Footer hint */}
        <div className="mt-20 text-center">
          <p className="xai-caption-mono-sm text-[#7d8187] flex items-center justify-center gap-3">
            <span>
              Press <kbd className="px-2 py-1 mx-1 bg-[#1a1c20] rounded text-xs font-mono border border-[#212327]">⌘ + K</kbd> to search across all modules
            </span>
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#212327] px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="xai-body-sm text-[#7d8187]">AI Productivity Suite</p>
          <p className="xai-caption-mono-sm text-[#7d8187]">Built with precision</p>
        </div>
      </footer>
    </div>
  );
}
