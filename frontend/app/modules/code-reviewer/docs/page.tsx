'use client'

import { useState } from 'react'
import { Terminal, Copy, Check, ArrowLeft, ArrowRight, FolderOpen, FileText, Zap, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function CopyBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d0f]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">
          <Terminal className="h-3 w-3" />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? (
            <><Check className="h-3 w-3 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
          ) : (
            <><Copy className="h-3 w-3" /> Copy</>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-relaxed text-gray-300">
        {code}
      </pre>
    </div>
  )
}

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
      <span className="text-[#ff7a17]">{index}</span>
      <span className="h-px w-8 bg-white/15" />
      {children}
    </div>
  )
}

const STEPS = [
  { num: '01', label: 'Install Locally', desc: 'npm link inside frontend folder' },
  { num: '02', label: 'Run the Agent', desc: 'ai-reviewer dir ./my-repo' },
  { num: '03', label: 'Get the Report', desc: 'Generates a .md review file' },
]

const CLI_OPTIONS = [
  { flag: '-m, --model', desc: 'Gemini model to use', def: 'gemini-2.5-flash' },
  { flag: '-t, --tokens', desc: 'Max output tokens', def: '2000' },
  { flag: '-o, --output', desc: 'Save review to a markdown file', def: '—' },
  { flag: '-e, --extensions', desc: 'File extensions filter (dir mode)', def: '.js,.ts,.py,.tsx' },
]

const EXAMPLE_OUTPUT = `🔍 Reviewing utils.js using gemini-2.5-flash...

✅ Review Complete:

🐛 Bugs
  • Potential null reference on line 12: config could be undefined.

🔒 Security
  • None found.

💡 Improvements
  • Use const instead of let for immutable bindings.
  • Add JSDoc comments for exported functions.

📊 Complexity
  • Time: O(n) — single pass through the array.
  • Space: O(1) — constant auxiliary space.

🔧 Refactoring
  • Extract validation logic into a separate function.

────────────────────────────────────────────────────────`

export default function CodeReviewerDocsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <div className="relative">
        <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,122,23,0.14),rgba(124,58,237,0.07),transparent)] blur-2xl" />

        <div className="relative mx-auto max-w-3xl px-6 py-10">
          {/* Back Link */}
          <Link href="/modules/code-reviewer" className="group mb-12 inline-flex items-center gap-2 text-[13px] text-gray-500 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Code Reviewer
          </Link>

          {/* Hero */}
          <div className="lab-enter mb-12">
            <SectionTitle index="CLI">Documentation</SectionTitle>
            <h1 className="text-[44px] leading-[1.04] tracking-[-0.035em] text-white">
              AI Code Reviewer <span className="lab-serif lab-accent-gradient pr-1">CLI</span>
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-gray-400">
              Review code directly from your terminal — single files or entire directories, powered by Gemini.
            </p>
          </div>

          {/* Quick-start steps */}
          <div className="lab-enter mb-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3" style={{ animationDelay: '100ms' }}>
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col gap-2 bg-[#0b0b0c] p-5">
                <span className="font-mono text-[11px] text-[#ff7a17]">{step.num}</span>
                <h3 className="text-[15px] tracking-tight text-white">{step.label}</h3>
                <p className="font-mono text-[11.5px] leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Prerequisites */}
          <section className="mb-12">
            <SectionTitle index="01">Prerequisites</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ws-panel flex items-start gap-3 p-4">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7a17]" />
                <p className="text-[14px] text-gray-300">
                  <span className="text-white">Node.js 18+</span> installed on your machine.
                </p>
              </div>
              <div className="ws-panel flex items-start gap-3 p-4">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b5fd]" />
                <p className="text-[14px] text-gray-300">
                  A <span className="text-white">Gemini API Key</span>. Get one free at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                     className="text-[#ffc285] underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-[#ffc285]">
                    Google AI Studio
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* Installation */}
          <section className="mb-12">
            <SectionTitle index="02">Installation</SectionTitle>
            <p className="mb-4 text-[14px] leading-relaxed text-gray-400">
              Navigate to the <code className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12.5px] text-[#ffc285]">frontend</code> folder of this project and link the CLI globally so you can use it anywhere on your laptop:
            </p>
            <CopyBlock code={`cd frontend\nnpm install\nnpm link`} />
          </section>

          {/* Environment Setup */}
          <section className="mb-12">
            <SectionTitle index="03">Environment Setup</SectionTitle>
            <p className="mb-4 text-[14px] text-gray-400">
              Create a <code className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12.5px] text-[#ffc285]">.env</code> file in your project root:
            </p>
            <CopyBlock code={`GEMINI_API_KEY=your_gemini_api_key_here`} language="env" />
          </section>

          {/* Usage */}
          <section className="mb-12">
            <SectionTitle index="04">Usage</SectionTitle>

            <div className="flex flex-col gap-8">
              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <FolderOpen className="h-4 w-4 text-[#a0c3ec]" />
                  <h3 className="text-[16px] tracking-tight text-white">Analyze a Local Repository</h3>
                </div>
                <p className="mb-3 text-[14px] leading-relaxed text-gray-400">
                  Point the agent to any folder on your laptop. It will recursively scan all code files and generate a comprehensive markdown report.
                </p>
                <CopyBlock code={`ai-reviewer dir ./my-project-folder --output review-report.md`} />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-emerald-300" />
                  <h3 className="text-[16px] tracking-tight text-white">Read the .md Report</h3>
                </div>
                <p className="text-[14px] leading-relaxed text-gray-400">
                  The agent will generate a <code className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12.5px] text-[#ffc285]">review-report.md</code> file in your current directory containing bugs, security vulnerabilities, and architecture feedback.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <ChevronRight className="h-4 w-4 text-[#ffc285]" />
                  <h3 className="text-[16px] tracking-tight text-white">Filter by file extensions <span className="lab-serif text-gray-500">(optional)</span></h3>
                </div>
                <CopyBlock code={`ai-reviewer dir ./backend --extensions .py,.mjs --output python-review.md`} />
              </div>
            </div>
          </section>

          {/* CLI Options Table */}
          <section className="mb-12">
            <SectionTitle index="05">CLI Options</SectionTitle>
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <table className="w-full text-[13.5px]">
                <thead className="bg-white/[0.03]">
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-5 py-3 text-left font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-gray-500">Flag</th>
                    <th className="px-5 py-3 text-left font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-gray-500">Description</th>
                    <th className="px-5 py-3 text-left font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-gray-500">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {CLI_OPTIONS.map((opt, i) => (
                    <tr key={opt.flag} className={i < CLI_OPTIONS.length - 1 ? 'border-b border-white/[0.05]' : ''}>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] text-[#ffc285]">{opt.flag}</td>
                      <td className="px-5 py-3.5 text-gray-300">{opt.desc}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] text-gray-500">{opt.def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Example Output */}
          <section className="mb-16">
            <SectionTitle index="06">Example Output</SectionTitle>
            <CopyBlock language="terminal" code={EXAMPLE_OUTPUT} />
          </section>

          {/* Bottom CTA */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#ff7a17]/[0.08] via-transparent to-transparent p-6">
            <p className="text-[18px] tracking-tight text-white">
              Ready to start <span className="lab-serif text-[#ffc285]">reviewing?</span>
            </p>
            <Link href="/modules/code-reviewer" className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[13.5px] text-black transition-all hover:bg-[#ffc285]">
              Open Code Reviewer
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
