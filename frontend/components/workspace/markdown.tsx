'use client'

import { isValidElement, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CodeBlock({ language, content }: { language?: string; content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d0f]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-gray-300">
        <code>{content}</code>
      </pre>
    </div>
  )
}

// ─── Heading anchors (used for report tables of contents) ───
export function slugify(text: string) {
  return text.toLowerCase().replace(/[`*_~[\]()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

export function extractHeadings(md: string): { level: number; text: string; id: string }[] {
  const out: { level: number; text: string; id: string }[] = []
  let inFence = false
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('```')) inFence = !inFence
    const m = !inFence && /^(#{1,3})\s+(.+?)\s*#*$/.exec(line)
    if (m) {
      const text = m[2].replace(/[`*_~]/g, '')
      out.push({ level: m[1].length, text, id: slugify(text) })
    }
  }
  return out
}

const components: Components = {
  h1: ({ node, ...props }) => <h1 id={slugify(textOf(props.children))} className="scroll-mt-6 mb-4 mt-8 text-[24px] leading-tight tracking-[-0.02em] text-white first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h2 id={slugify(textOf(props.children))} className="scroll-mt-6 mb-3 mt-8 border-t border-white/[0.06] pt-6 text-[18px] tracking-[-0.015em] text-white first:mt-0 first:border-0 first:pt-0" {...props} />,
  h3: ({ node, ...props }) => <h3 id={slugify(textOf(props.children))} className="scroll-mt-6 mb-2 mt-6 text-[15px] font-medium tracking-tight text-white" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4 text-[14.5px] leading-7 text-gray-300" {...props} />,
  ul: ({ node, ...props }) => <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[14.5px] leading-7 text-gray-300 marker:text-[#ff7a17]" {...props} />,
  ol: ({ node, ...props }) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-7 text-gray-300 marker:font-mono marker:text-[12px] marker:text-gray-500" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  a: ({ node, ...props }) => <a className="text-[#ffc285] underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-[#ffc285]" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-medium text-white" {...props} />,
  em: ({ node, ...props }) => <em className="lab-serif text-[1.05em] text-gray-200" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="my-5 rounded-r-xl border-l-2 border-[#ff7a17] bg-white/[0.02] py-2 pl-4 pr-3 text-[14px] text-gray-400" {...props} />,
  table: ({ node, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full border-collapse text-left text-[13.5px] text-gray-300" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-white/[0.03]" {...props} />,
  th: ({ node, ...props }) => <th className="border-b border-white/[0.08] px-4 py-2.5 font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-gray-500" {...props} />,
  td: ({ node, ...props }) => <td className="border-b border-white/[0.05] px-4 py-2.5" {...props} />,
  hr: ({ node, ...props }) => <hr className="my-8 border-white/[0.07]" {...props} />,
  // Fenced blocks render their own chrome via CodeBlock
  pre: ({ children }) => <>{children}</>,
  code(props) {
    const { children, className, node, ...rest } = props
    const match = /language-(\w+)/.exec(className || '')
    const text = String(children)
    // Fenced blocks without a language still contain newlines
    return match || text.includes('\n') ? (
      <CodeBlock language={match?.[1]} content={text.replace(/\n$/, '')} />
    ) : (
      <code {...rest} className="mx-0.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12.5px] text-[#ffc285]">
        {children}
      </code>
    )
  },
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
