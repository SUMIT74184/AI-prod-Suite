'use client'

import { useState } from 'react'
import { Terminal, Copy, Check, ArrowLeft, Download, FolderOpen, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function CopyBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-zinc-950 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3" /> Copied!</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy</>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  )
}

export default function CodeReviewerDocsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back Link */}
        <Link href="/modules/code-reviewer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Code Reviewer
        </Link>

        {/* Hero */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Terminal className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Code Reviewer CLI</h1>
            <p className="text-muted-foreground mt-1">
              Review code directly from your terminal — single files or entire directories.
            </p>
          </div>
        </div>

        <hr className="border-border mb-8" />

        {/* Prerequisites */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Prerequisites</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong className="text-foreground">Node.js 18+</strong> installed on your machine.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>A <strong className="text-foreground">Gemini API Key</strong>. Get one free at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Google AI Studio</a>.</span>
            </li>
          </ul>
        </section>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Installation
          </h2>

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Option 1: Install from this project</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Clone the repository and link the CLI globally:
          </p>
          <CopyBlock code={`cd ai-productivity-suite\nnpm install\nnpm link`} />

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Option 2: Run directly with npx</h3>
          <p className="text-sm text-muted-foreground mb-3">
            If the package is published on npm:
          </p>
          <CopyBlock code={`npx ai-reviewer ./path/to/your/file.js`} />
        </section>

        {/* Environment Setup */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Environment Setup</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Create a <code className="px-1.5 py-0.5 bg-muted rounded text-foreground text-xs font-mono">.env</code> file in your project root:
          </p>
          <CopyBlock code={`GEMINI_API_KEY=your_gemini_api_key_here`} language="env" />
        </section>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Usage
          </h2>

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Review a single file</h3>
          <CopyBlock code={`ai-reviewer ./src/utils.js`} />

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Review with a specific model</h3>
          <CopyBlock code={`ai-reviewer ./app.py --model gemini-2.5-pro`} />

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Save review to a markdown file</h3>
          <CopyBlock code={`ai-reviewer ./server.ts --output review.md`} />

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Review an entire directory
          </h3>
          <CopyBlock code={`ai-reviewer dir ./src --output full-review.md`} />

          <h3 className="text-sm font-semibold text-foreground mt-6 mb-2">Filter by file extensions</h3>
          <CopyBlock code={`ai-reviewer dir ./backend --extensions .py,.mjs --output python-review.md`} />
        </section>

        {/* Options Table */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">CLI Options</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Flag</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-primary">-m, --model</td>
                  <td className="px-4 py-3 text-muted-foreground">Gemini model to use</td>
                  <td className="px-4 py-3 font-mono text-xs">gemini-2.5-flash</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-primary">-t, --tokens</td>
                  <td className="px-4 py-3 text-muted-foreground">Max output tokens</td>
                  <td className="px-4 py-3 font-mono text-xs">2000</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-primary">-o, --output</td>
                  <td className="px-4 py-3 text-muted-foreground">Save review to a markdown file</td>
                  <td className="px-4 py-3 font-mono text-xs">—</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-primary">-e, --extensions</td>
                  <td className="px-4 py-3 text-muted-foreground">File extensions filter (dir mode)</td>
                  <td className="px-4 py-3 font-mono text-xs">.js,.ts,.py,.tsx,.jsx,.mjs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Example Output */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Example Output</h2>
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

      </div>
    </div>
  )
}
