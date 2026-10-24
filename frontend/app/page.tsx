import Link from 'next/link'
import { ArrowRight, ArrowUpRight, GitBranch, ShieldCheck, Quote, Radio, Layers, Terminal } from 'lucide-react'
import { SiteNav, SiteFooter } from '@/components/marketing/site-chrome'
import { AgentStage } from '@/components/marketing/agent-orchestra'
import { ModuleShowcase } from '@/components/marketing/module-showcase'
import { ReviewPipeline } from '@/components/marketing/review-pipeline'
import { Reveal, CountUp, NetworkField, Typewriter } from '@/components/marketing/motion'

const STACK = ['LangGraph', 'LangChain', 'FastAPI', 'Google Gemini', 'OpenRouter', 'Anthropic', 'OpenAI', 'ChromaDB', 'Next.js', 'React Flow', 'DuckDuckGo Search', 'PyMuPDF']

const PRINCIPLES = [
  { icon: Layers, title: 'Decomposition', body: 'Hard problems are split into narrow sub-tasks. Each agent owns one lens — logic, security, retrieval, synthesis — and is prompted for exactly that.' },
  { icon: ShieldCheck, title: 'Verification', body: 'No finding ships unchecked. A validation pass scores confidence, then de-duplication merges overlapping claims from different specialists.' },
  { icon: Quote, title: 'Grounding', body: 'Answers are retrieved, not recalled. Every claim in a research report carries a citation back to a page, timestamp or URL.' },
  { icon: Radio, title: 'Observability', body: 'Agents think out loud. Each graph node streams its state over SSE, so you can watch the reasoning unfold — and stop it.' },
]

function SectionLabel({ index, children, className = '' }: { index: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 ${className}`}>
      <span className="text-[#ff7a17]">{index}</span>
      <span className="h-px w-8 bg-white/15" />
      {children}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a] font-sans text-white selection:bg-[#ff7a17]/30">
      <SiteNav />

      {/* ─── Hero ─── */}
      <section className="relative pt-28 pb-24 md:pt-36 lg:pb-36">
        <div className="lab-grid-bg lab-grid-fade absolute inset-0" />
        <NetworkField className="absolute inset-0 opacity-70" />
        <div className="lab-aurora pointer-events-none absolute left-1/2 top-24 h-[420px] w-[820px] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,23,0.18),rgba(124,58,237,0.1),transparent)] blur-2xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
          <div>
            <div className="lab-enter">
              <Link href="#agents" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-[12.5px] text-gray-300 backdrop-blur transition-colors hover:border-white/20">
                <span className="rounded-full bg-[#ff7a17]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#ffc285]">New</span>
                5-agent review graph is live
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="lab-enter" style={{ animationDelay: '50ms' }}>
              <p className="mt-8 select-none font-mono text-[44px] leading-none tracking-[0.12em] sm:text-6xl lg:text-[72px]">
                <Typewriter text="PRODSUITE" startDelay={500} textClassName="lab-text-gradient" caretClassName="text-[#ff7a17]" />
              </p>
            </div>
            <div className="lab-enter" style={{ animationDelay: '100ms' }}>
              <h1 className="mt-6 text-[44px] leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[76px]">
                <span className="lab-text-gradient">Research, done by a</span>
                <br />
                <span className="lab-serif lab-accent-gradient pr-2 text-[1.08em]">society of agents.</span>
              </h1>
            </div>
            <div className="lab-enter" style={{ animationDelay: '200ms' }}>
              <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-gray-400">
                ProdSuite orchestrates specialist AI agents that plan, retrieve, critique and synthesise — reviewing your code, reading your sources and searching the web, with every step streamed and verified.
              </p>
            </div>
            <div className="lab-enter" style={{ animationDelay: '300ms' }}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/sign-up" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14.5px] text-black shadow-[0_0_40px_-8px_rgba(255,194,133,0.6)] transition-all hover:bg-[#ffc285]">
                  Start a research run
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="#pipeline" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[14.5px] text-white transition-colors hover:border-white/30 hover:bg-white/[0.04]">
                  See how it works
                </Link>
              </div>
            </div>
            <div className="lab-enter" style={{ animationDelay: '400ms' }}>
              <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/[0.08] pt-6">
                {[
                  ['8', 'agent roles'],
                  ['12', 'graph nodes'],
                  ['4', 'LLM providers'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">{l}</dt>
                    <dd className="mt-1 text-2xl tracking-tight text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="lab-enter relative" style={{ animationDelay: '250ms' }}>
            <AgentStage />
          </div>
        </div>
      </section>

      {/* ─── Stack marquee ─── */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.012] py-8">
        <p className="mb-6 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-gray-500">Orchestrated on an open, model-agnostic stack</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="lab-marquee flex w-max gap-14">
            {[...STACK, ...STACK].map((s, i) => (
              <span key={i} className="whitespace-nowrap text-[17px] tracking-tight text-gray-500 transition-colors hover:text-white">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Agents ─── */}
      <section id="agents" className="relative scroll-mt-20 py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-end">
            <Reveal>
              <SectionLabel index="01">Architecture</SectionLabel>
              <h2 className="text-4xl leading-[1.08] tracking-[-0.03em] md:text-[54px]">
                One orchestrator.
                <br />
                <span className="lab-serif text-gray-400">Many minds.</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="max-w-xl text-[16.5px] leading-relaxed text-gray-400">
                Instead of asking one model to do everything, ProdSuite routes work through a LangGraph state machine. Each node is a specialist with its own prompt, tools and output schema. State flows between them; the orchestrator decides what runs next.
              </p>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.06] md:grid-cols-3">
            {[
              { k: 'Orchestrator', t: 'Plans and routes', d: 'Builds context, decides whether more files are needed, and dispatches each specialist in order — respecting provider rate limits.', code: 'graph.add_conditional_edges(…)' },
              { k: 'Specialists', t: 'Narrow, deep expertise', d: 'Bug, security, performance, architecture and quality reviewers; planners, searchers, readers and analysts for research.', code: 'state.raw_findings += findings' },
              { k: 'Synthesiser', t: 'Verifies and writes', d: 'Validates confidence, merges duplicates, aggregates a report, then drafts fixes and regression tests.', code: 'finalize_review → END' },
            ].map((c, i) => (
              <Reveal key={c.k} delay={i * 120} className="group relative bg-[#0b0b0c] p-8 transition-colors hover:bg-[#0f0f11]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff7a17]/0 to-transparent transition-all duration-700 group-hover:via-[#ff7a17]/70" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#ff7a17]">{c.k}</span>
                <h3 className="mt-4 text-xl tracking-tight text-white">{c.t}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-gray-400">{c.d}</p>
                <code className="mt-8 block rounded-lg border border-white/[0.06] bg-black/50 px-3 py-2 font-mono text-[11.5px] text-gray-400">{c.code}</code>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.06] md:grid-cols-4">
            {[
              { v: 5, s: '', l: 'Specialist reviewers' },
              { v: 12, s: '', l: 'Nodes in the review graph' },
              { v: 5, s: '', l: 'Integrated research modules' },
              { v: 4, s: '', l: 'Pluggable LLM providers' },
            ].map((m, i) => (
              <Reveal key={m.l} delay={i * 90} className="bg-[#0b0b0c] px-6 py-8">
                <div className="text-4xl tracking-tight text-white md:text-5xl">
                  <CountUp to={m.v} suffix={m.s} />
                </div>
                <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">{m.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pipeline ─── */}
      <section id="pipeline" className="relative scroll-mt-20 border-t border-white/[0.06] py-28 md:py-36">
        <div className="lab-grid-bg absolute inset-0 opacity-50 [mask-image:linear-gradient(180deg,transparent,#000_30%,#000_70%,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <Reveal>
              <SectionLabel index="02">Review pipeline</SectionLabel>
              <h2 className="max-w-2xl text-4xl leading-[1.08] tracking-[-0.03em] md:text-[54px]">
                From diff to <span className="lab-serif text-[#ffc285]">verified</span> review, in twelve steps.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <GitBranch className="h-4 w-4 text-[#ff7a17]" />
                <span className="font-mono text-[12px] text-gray-400">
                  GitHub · GitLab · CLI · paste a snippet
                </span>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <ReviewPipeline />
          </Reveal>
        </div>
      </section>

      {/* ─── Modules ─── */}
      <section id="modules" className="relative scroll-mt-20 border-t border-white/[0.06] py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-14 max-w-3xl">
            <SectionLabel index="03">The suite</SectionLabel>
            <h2 className="text-4xl leading-[1.08] tracking-[-0.03em] md:text-[54px]">
              Five instruments. <span className="lab-serif text-gray-400">One lab bench.</span>
            </h2>
            <p className="mt-6 text-[16.5px] leading-relaxed text-gray-400">Every module is its own agent system, sharing one workspace, one vector store and one set of model providers.</p>
          </Reveal>
          <Reveal delay={100}>
            <ModuleShowcase />
          </Reveal>
        </div>
      </section>

      {/* ─── Research principles ─── */}
      <section id="research" className="relative scroll-mt-20 border-t border-white/[0.06] py-28 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7c3aed]/[0.07] blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-16 max-w-3xl text-center">
            <SectionLabel index="04" className="justify-center">
              Research principles
            </SectionLabel>
            <h2 className="text-4xl leading-[1.08] tracking-[-0.03em] md:text-[54px]">
              Built like a <span className="lab-serif lab-accent-gradient">research system</span>, not a chatbot.
            </h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 100} className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent p-8 transition-all duration-500 hover:border-white/15">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ff7a17]/0 blur-3xl transition-all duration-700 group-hover:bg-[#ff7a17]/15" />
                <div className="relative flex items-start gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                    <p.icon className="h-5 w-5 text-[#ffc285]" strokeWidth={1.5} />
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-gray-600">P.0{i + 1}</span>
                      <h3 className="text-xl tracking-tight text-white">{p.title}</h3>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-gray-400">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CLI ─── */}
      <section className="relative border-t border-white/[0.06] py-28 md:py-36">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <SectionLabel index="05">From your terminal</SectionLabel>
            <h2 className="text-4xl leading-[1.08] tracking-[-0.03em] md:text-[50px]">
              Reviews where you <span className="lab-serif text-gray-400">already work.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[16.5px] leading-relaxed text-gray-400">
              The <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[14px] text-[#ffc285]">ai-reviewer</code> CLI runs the same review agents on a single file or an entire directory, and writes a Markdown report you can commit alongside your code.
            </p>
            <Link href="/modules/code-reviewer/docs" className="group mt-8 inline-flex items-center gap-2 border-b border-white/20 pb-1 text-[14px] text-white transition-colors hover:border-[#ff7a17]">
              Read the CLI docs
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
          <Reveal delay={150}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d0f] shadow-[0_40px_100px_-30px_rgba(255,122,23,0.25)]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                <Terminal className="h-3.5 w-3.5 text-gray-500" />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">zsh — ai-reviewer</span>
              </div>
              <div className="space-y-1.5 overflow-x-auto p-5 font-mono text-[12px] leading-6 sm:text-[12.5px]">
                <p>
                  <span className="text-[#ff7a17]">❯</span> <span className="text-white">ai-reviewer dir ./src -e .ts,.py -o review.md</span>
                </p>
                {[
                  ['text-gray-500', '◇ scanning 23 files · model gemini-2.5-flash'],
                  ['text-gray-400', '◆ api/auth.ts            2 issues'],
                  ['text-gray-400', '◆ services/billing.py    1 issue'],
                  ['text-red-300/90', '  ✕ high   SQL built from user input        L42'],
                  ['text-amber-300/90', '  ▲ med    N+1 query in invoice loop        L88'],
                  ['text-sky-300/90', '  ● low    unclear name `tmp2`              L12'],
                  ['text-emerald-300', '✓ report written to review.md (3 findings, 4.8s)'],
                ].map(([c, t], i) => (
                  <p key={i} className={`lab-line-in whitespace-pre ${c}`} style={{ animationDelay: `${300 + i * 220}ms` }}>
                    {t}
                  </p>
                ))}
                <p>
                  <span className="text-[#ff7a17]">❯</span> <span className="lab-caret text-gray-300">▍</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-32 md:py-44">
        <NetworkField className="absolute inset-0 opacity-50" density={0.00006} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,122,23,0.22),transparent)]" />
        <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-[42px] leading-[1.04] tracking-[-0.035em] md:text-7xl">
            <span className="lab-text-gradient">Put a team of agents</span>
            <br />
            <span className="lab-serif lab-accent-gradient">on your hardest question.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-[16.5px] leading-relaxed text-gray-400">Create a workspace in under a minute. Bring your own documents, repos and model keys.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/sign-up" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] text-black transition-all hover:bg-[#ffc285]">
              Create free workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-[15px] text-white transition-colors hover:bg-white/[0.05]">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
