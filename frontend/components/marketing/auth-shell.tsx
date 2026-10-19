'use client'

import { useEffect, useState, type ReactNode, type InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './site-chrome'
import { AgentStage } from './agent-orchestra'
import { NetworkField, usePrefersReducedMotion } from './motion'

const NOTES = [
  { k: 'Decomposition', t: 'Each agent owns one lens. Narrow prompts make for deeper, more reliable reasoning.' },
  { k: 'Verification', t: 'Findings are validated and de-duplicated before they ever reach your screen.' },
  { k: 'Grounding', t: 'Every claim carries a citation back to a page, timestamp or URL.' },
  { k: 'Observability', t: 'Watch every graph node stream its state in real time — and stop it at any point.' },
]

function LabNotes() {
  const [i, setI] = useState(0)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setI(v => (v + 1) % NOTES.length), 5000)
    return () => clearInterval(id)
  }, [reduced])
  const note = NOTES[i]
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#ff7a17]">Lab note · {note.k}</span>
        <div className="flex gap-1.5">
          {NOTES.map((_, n) => (
            <span key={n} className={cn('h-1 rounded-full transition-all duration-500', n === i ? 'w-5 bg-[#ff7a17]' : 'w-1.5 bg-white/20')} />
          ))}
        </div>
      </div>
      <p key={i} className="lab-line-in text-[17px] leading-relaxed tracking-tight text-gray-200">
        <span className="lab-serif text-[20px] text-[#ffc285]">“</span>
        {note.t}
      </p>
    </div>
  )
}

export function AuthShell({ eyebrow, title, subtitle, children, footer }: { eyebrow: string; title: ReactNode; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative grid min-h-screen bg-[#0a0a0a] font-sans text-white selection:bg-[#ff7a17]/30 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ─── Form column ─── */}
      <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-10">
        <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-0 opacity-60 lg:opacity-30" />
        <div className="pointer-events-none absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-[#ff7a17]/[0.08] blur-[100px]" />

        <div className="relative flex items-center justify-between">
          <Logo />
          <Link href="/" className="group inline-flex items-center gap-1.5 text-[13px] text-gray-500 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to site
          </Link>
        </div>

        <main className="relative flex flex-1 items-center justify-center py-12">
          <div className="xai-animate-in w-full max-w-[400px] opacity-0">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff7a17]">{eyebrow}</p>
            <h1 className="text-[34px] leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">{title}</h1>
            <p className="mt-3 text-[15px] text-gray-400">{subtitle}</p>
            <div className="mt-9">{children}</div>
            <div className="mt-8 text-[14px] text-gray-500">{footer}</div>
          </div>
        </main>

        <div className="relative flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-600">
          <Lock className="h-3 w-3" />
          Encrypted session · Your data stays yours
        </div>
      </div>

      {/* ─── Visual column ─── */}
      <aside className="relative hidden overflow-hidden border-l border-white/[0.07] bg-[#08080a] lg:flex lg:flex-col">
        <div className="lab-grid-bg absolute inset-0 opacity-70" />
        <NetworkField className="absolute inset-0 opacity-60" density={0.00007} />
        <div className="lab-aurora pointer-events-none absolute left-1/2 top-1/4 h-[460px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,23,0.16),rgba(124,58,237,0.1),transparent)] blur-2xl" />

        <div className="relative flex items-center justify-between px-10 pt-8">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gray-500">Live · multi-agent run</span>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />8 agents online
          </span>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-10">
          <AgentStage compact className="w-full max-w-[560px]" />
        </div>

        <div className="relative px-10 pb-10">
          <LabNotes />
        </div>
      </aside>
    </div>
  )
}

// ─── Form primitives ───
export function AuthField({ label, id, trailing, aside, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; trailing?: ReactNode; aside?: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-400">
          {label}
        </label>
        {aside}
      </div>
      <div className="group relative">
        <input
          id={id}
          {...props}
          className={cn(
            'peer w-full rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-[15px] text-white placeholder-gray-600 outline-none transition-all duration-300',
            'hover:border-white/20 focus:border-[#ff7a17]/60 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_rgba(255,122,23,0.1)]',
            trailing ? 'pr-11' : undefined
          )}
        />
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  )
}

export function SocialButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-[14px] text-white transition-all duration-300 hover:border-white/25 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function OrDivider() {
  return (
    <div className="my-7 flex items-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gray-500">or with email</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
    </div>
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="lab-line-in mb-5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-[13.5px] text-red-300">
      {message}
    </div>
  )
}

export function SubmitButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      {...props}
      className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[14.5px] text-black shadow-[0_0_30px_-10px_rgba(255,194,133,0.7)] transition-all duration-300 hover:bg-[#ffc285] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  )
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
