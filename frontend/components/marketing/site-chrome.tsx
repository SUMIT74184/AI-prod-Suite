'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Agents', href: '/#agents' },
  { label: 'Pipeline', href: '/#pipeline' },
  { label: 'Modules', href: '/#modules' },
  { label: 'Research', href: '/#research' },
  { label: 'Docs', href: '/modules/code-reviewer/docs' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 transition-opacity hover:opacity-80', className)}>
      <img src="/logo.svg" alt="" className="h-7 w-7 rounded-md" />
      <span className="text-[15px] tracking-tight text-white">ProdSuite</span>
      <span className="hidden rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-gray-400 sm:inline">Lab</span>
    </Link>
  )
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500', scrolled || open ? 'border-b border-white/[0.07] bg-[#0a0a0a]/75 backdrop-blur-xl' : 'border-b border-transparent')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(n => (
            <Link key={n.label} href={n.href} className="rounded-full px-3.5 py-1.5 text-[13.5px] text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/sign-in" className="rounded-full px-4 py-1.5 text-[13.5px] text-gray-300 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link href="/sign-up" className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[13.5px] text-black transition-all hover:bg-[#ffc285]">
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button onClick={() => setOpen(o => !o)} className="rounded-lg p-2 text-gray-300 md:hidden" aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/[0.07] px-4 pb-6 pt-2 md:hidden">
          {NAV.map(n => (
            <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="block border-b border-white/[0.05] py-3 text-[15px] text-gray-300">
              {n.label}
            </Link>
          ))}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/sign-in" className="rounded-full border border-white/15 py-2.5 text-center text-sm text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-full bg-white py-2.5 text-center text-sm text-black">
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

const FOOTER_COLS = [
  { title: 'Modules', links: [['Research Assistant', '/modules/research-assistant'], ['Code Reviewer', '/modules/code-reviewer'], ['Web Research Agent', '/modules/web-research-agent'], ['Prompt Playground', '/modules/prompt-playground'], ['Workflow Automation', '/modules/workflow-automation']] },
  { title: 'Developers', links: [['Reviewer docs', '/modules/code-reviewer/docs'], ['Integrations', '/modules/code-reviewer/integrations'], ['CLI · ai-reviewer', '/modules/code-reviewer/docs']] },
  { title: 'Lab', links: [['Agent architecture', '/#agents'], ['Review pipeline', '/#pipeline'], ['Research principles', '/#research']] },
  { title: 'Account', links: [['Sign in', '/sign-in'], ['Create account', '/sign-up'], ['Settings', '/modules/settings']] },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] bg-[#070708]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Logo />
            <p className="mt-5 max-w-[320px] text-[14px] leading-relaxed text-gray-500">
              A multi-agent research environment. Specialist models that plan, retrieve, critique and synthesise — with every step observable.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              All agents operational
            </div>
          </div>
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h4 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-gray-500">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[13.5px] text-gray-400 transition-colors hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 overflow-hidden">
          <p className="lab-text-gradient select-none text-center text-[18vw] leading-[0.85] tracking-[-0.06em] opacity-[0.12] lg:text-[200px]">ProdSuite</p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="text-[12.5px] text-gray-600">© {new Date().getFullYear()} ProdSuite Lab. Built with LangGraph, FastAPI &amp; Next.js.</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-600">Observable · Grounded · Verified</p>
        </div>
      </div>
    </footer>
  )
}
