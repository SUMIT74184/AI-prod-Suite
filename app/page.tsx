import Link from 'next/link';
import { Brain, Code2, Lightbulb, Search, Workflow, ArrowUpRight, Sparkles, Command } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      {/* Subtle Dot Pattern Background */}
      <div className="absolute inset-0 z-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-50"></div>
      
      {/* Soft gradient fade at the top */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent z-0 pointer-events-none"></div>

      <main className="relative z-10 container mx-auto px-6 py-16 md:py-24 max-w-5xl">
        
        {/* Header section */}
        <header className="mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-medium mb-6 shadow-sm border border-border/50">
            <Sparkles className="w-4 h-4" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
            What are we working on today?
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Select a module below to jump right in. Your recent projects and workflows are ready when you are.
          </p>
        </header>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[160px]">
          
          {/* Research Assistant - Large Featured Card */}
          <Link 
            href="/modules/research-assistant"
            className="group relative md:col-span-2 md:row-span-2 rounded-[2rem] bg-card p-8 overflow-hidden transition-all duration-300 cartoon-paper animate-cartoon animation-delay-100"
          >
            <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-12">
              <Brain className="w-64 h-64" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-foreground mb-3">Research Assistant</h2>
                <p className="text-muted-foreground max-w-md leading-relaxed">
                  Your primary workspace for synthesizing documents, deep-diving into complex topics, and organizing knowledge intuitively.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-8 group-hover:gap-3 transition-all">
                Open Workspace <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Code Reviewer */}
          <Link 
            href="/modules/code-reviewer"
            className="group rounded-[2rem] bg-card p-6 transition-all duration-300 flex flex-col justify-between cartoon-paper animate-cartoon animation-delay-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Code2 className="w-5 h-5 text-blue-500" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 text-lg">Code Review</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Analyze & optimize code structure</p>
            </div>
          </Link>

          {/* Prompt Playground */}
          <Link 
            href="/modules/prompt-playground"
            className="group rounded-[2rem] bg-card p-6 transition-all duration-300 flex flex-col justify-between cartoon-paper animate-cartoon animation-delay-500"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Lightbulb className="w-5 h-5 text-amber-500" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 text-lg">Playground</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Test & iterate system prompts</p>
            </div>
          </Link>

          {/* Web Research Agent */}
          <Link 
            href="/modules/web-research-agent"
            className="group md:col-span-2 rounded-[2rem] bg-card p-6 transition-all duration-300 flex items-center justify-between cartoon-paper animate-cartoon animation-delay-700"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Search className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-foreground mb-1">Web Research</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Deploy agents to scour the web and compile reports automatically.</p>
              </div>
            </div>
            <ArrowUpRight className="w-6 h-6 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all hidden sm:block mr-2" />
          </Link>

          {/* Workflow Automation */}
          <Link 
            href="/modules/workflow-automation"
            className="group rounded-[2rem] bg-card p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cartoon-paper animate-cartoon animation-delay-100"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
              <Workflow className="w-32 h-32" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Workflow className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div className="relative z-10 mt-8">
              <h3 className="font-medium text-foreground mb-1 text-lg">Workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Chain agents together</p>
            </div>
          </Link>
          
        </div>
        
        {/* Quick Help Footer */}
        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Command className="w-4 h-4 opacity-50" />
            <span>
              Press <kbd className="px-2 py-1 mx-1 bg-secondary rounded-md text-xs font-sans border border-border">⌘ + K</kbd> to search across all modules
            </span>
          </p>
        </div>

      </main>
    </div>
  );
}
