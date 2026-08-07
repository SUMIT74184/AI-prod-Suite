'use client'

import { useState } from 'react'
import { Terminal, Copy, Check, ArrowLeft, Download, FolderOpen, FileText, Zap, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function CopyBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-[#212327] bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#141517] border-b border-[#212327]">
        <span className="xai-caption-mono-sm text-[#7d8187]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[#7d8187] hover:text-white transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
          ) : (
            <><Copy className="w-3 h-3" /> Copy</>
          )}
        </button>
      </div>
      <pre className="p-4 text-[13px] text-[#dadbdf] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

const STEPS = [
  { num: '01', label: 'Install the CLI', desc: 'Link it globally from the project' },
  { num: '02', label: 'Add your API key', desc: 'Set up your .env file' },
  { num: '03', label: 'Review code', desc: 'Point it at any file or directory' },
]

const CLI_OPTIONS = [
  { flag: '-m, --model', desc: 'Gemini model to use', def: 'gemini-2.5-flash' },
  { flag: '-t, --tokens', desc: 'Max output tokens', def: '2000' },
  { flag: '-o, --output', desc: 'Save review to a markdown file', def: '—' },
  { flag: '-e, --extensions', desc: 'File extensions filter (dir mode)', def: '.js,.ts,.py,.tsx' },
]

export default function CodeReviewerDocsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back Link */}
        <Link href="/modules/code-reviewer" className="inline-flex items-center gap-2 xai-body-sm text-[#7d8187] hover:text-white transition-colors mb-10 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Code Reviewer
        </Link>

        {/* Hero */}
        <div className="mb-12 xai-animate-in opacity-0">
          <p className="xai-caption-mono text-[#7d8187] mb-4">Documentation</p>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center shrink-0">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="xai-display-sm text-white mb-2">AI Code Reviewer CLI</h1>
              <p className="xai-body-md text-[#dadbdf] max-w-lg">
                Review code directly from your terminal — single files or entire directories, powered by Gemini.
              </p>
            </div>
          </div>
        </div>

        {/* Quick-start steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12 xai-animate-in opacity-0 xai-delay-1">
          {STEPS.map((step) => (
            <div key={step.num} className="xai-card p-5 flex flex-col gap-3">
              <span className="xai-caption-mono text-[#7d8187]">{step.num}</span>
              <h3 className="text-[15px] text-white font-normal">{step.label}</h3>
              <p className="text-[13px] text-[#7d8187] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#212327] mb-10" />

        {/* Prerequisites */}
        <section className="mb-10 xai-animate-in opacity-0 xai-delay-2">
          <h2 className="xai-caption-mono text-[#7d8187] mb-5">Prerequisites</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 xai-card p-4">
              <Zap className="w-4 h-4 text-[#ff7a17] mt-0.5 shrink-0" />
              <p className="xai-body-sm text-[#dadbdf]">
                <span className="text-white">Node.js 18+</span> installed on your machine.
              </p>
            </div>
            <div className="flex items-start gap-3 xai-card p-4">
              <Shield className="w-4 h-4 text-[#7c3aed] mt-0.5 shrink-0" />
              <p className="xai-body-sm text-[#dadbdf]">
                A <span className="text-white">Gemini API Key</span>. Get one free at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                   className="text-white underline underline-offset-4 decoration-[#7d8187] hover:decoration-white transition-colors">
                  Google AI Studio
                </a>.
              </p>
            </div>
          </div>
        </section>

        {/* Installation */}
        <section className="mb-10 xai-animate-in opacity-0 xai-delay-3">
          <div className="flex items-center gap-3 mb-5">
            <Download className="w-4 h-4 text-white" />
            <h2 className="xai-caption-mono text-[#7d8187]">Installation</h2>
          </div>

          <div className="xai-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="w-3.5 h-3.5 text-[#ff7a17]" />
              <h3 className="text-[14px] text-white font-normal">Install from this project</h3>
            </div>
            <p className="xai-body-sm text-[#7d8187] mb-4 ml-5">
              Clone the repository and link the CLI globally:
            </p>
            <CopyBlock code={`cd ai-productivity-suite\nnpm install\nnpm link`} />
          </div>

          <div className="xai-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="w-3.5 h-3.5 text-[#7c3aed]" />
              <h3 className="text-[14px] text-white font-normal">Run directly with npx</h3>
            </div>
            <p className="xai-body-sm text-[#7d8187] mb-4 ml-5">
              If the package is published on npm:
            </p>
            <CopyBlock code={`npx ai-reviewer ./path/to/your/file.js`} />
          </div>
        </section>

        {/* Environment Setup */}
        <section className="mb-10">
          <h2 className="xai-caption-mono text-[#7d8187] mb-5">Environment Setup</h2>
          <p className="xai-body-sm text-[#dadbdf] mb-4">
            Create a <code className="px-1.5 py-0.5 bg-[#1a1c20] border border-[#212327] rounded text-[12px] font-mono text-white">.env</code> file in your project root:
          </p>
          <CopyBlock code={`GEMINI_API_KEY=your_gemini_api_key_here`} language="env" />
        </section>

        {/* Usage */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <FileText className="w-4 h-4 text-white" />
            <h2 className="xai-caption-mono text-[#7d8187]">Usage</h2>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { title: 'Review a single file', code: 'ai-reviewer ./src/utils.js' },
              { title: 'Review with a specific model', code: 'ai-reviewer ./app.py --model gemini-2.5-pro' },
              { title: 'Save review to a markdown file', code: 'ai-reviewer ./server.ts --output review.md' },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="xai-body-sm text-white mb-2">{item.title}</h3>
                <CopyBlock code={item.code} />
              </div>
            ))}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-3.5 h-3.5 text-[#a0c3ec]" />
                <h3 className="xai-body-sm text-white">Review an entire directory</h3>
              </div>
              <CopyBlock code={`ai-reviewer dir ./src --output full-review.md`} />
            </div>

            <div>
              <h3 className="xai-body-sm text-white mb-2">Filter by file extensions</h3>
              <CopyBlock code={`ai-reviewer dir ./backend --extensions .py,.mjs --output python-review.md`} />
            </div>
          </div>
        </section>

        {/* CLI Options Table */}
        <section className="mb-10">
          <h2 className="xai-caption-mono text-[#7d8187] mb-5">CLI Options</h2>
          <div className="xai-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#212327]">
                  <th className="px-5 py-3 text-left xai-caption-mono-sm text-[#7d8187]">Flag</th>
                  <th className="px-5 py-3 text-left xai-caption-mono-sm text-[#7d8187]">Description</th>
                  <th className="px-5 py-3 text-left xai-caption-mono-sm text-[#7d8187]">Default</th>
                </tr>
              </thead>
              <tbody>
                {CLI_OPTIONS.map((opt, i) => (
                  <tr key={opt.flag} className={i < CLI_OPTIONS.length - 1 ? 'border-b border-[#212327]/50' : ''}>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[#ff7a17] whitespace-nowrap">{opt.flag}</td>
                    <td className="px-5 py-3.5 xai-body-sm text-[#dadbdf]">{opt.desc}</td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[#7d8187] whitespace-nowrap">{opt.def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Example Output */}
        <section className="mb-16">
          <h2 className="xai-caption-mono text-[#7d8187] mb-5">Example Output</h2>
          <CopyBlock language="terminal" code={`🔍 Reviewing utils.js using gemini-2.5-flash...

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

────────────────────────────────────────────────────────`} />
        </section>

        {/* Bottom CTA */}
        <div className="border-t border-[#212327] pt-8 pb-4 flex items-center justify-between">
          <p className="xai-body-sm text-[#7d8187]">Ready to start reviewing?</p>
          <Link href="/modules/code-reviewer" className="xai-btn-outline inline-flex items-center gap-2 px-5 py-2">
            Open Code Reviewer
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

      </div>
    </div>
  )
}
