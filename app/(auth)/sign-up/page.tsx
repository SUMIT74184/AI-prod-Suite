'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Brain, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
]

export default function SignUpPage() {
  const router = useRouter()
  const { signUp, signInWithProvider, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await signUp({ name, email, password, confirmPassword })
    if (result.success) {
      router.push('/modules/research-assistant')
    } else {
      setError(result.error || 'Something went wrong')
    }
  }

  const handleSocial = async (provider: 'google' | 'github') => {
    setError('')
    setSocialLoading(provider)
    const result = await signInWithProvider(provider)
    if (result.success) {
      router.push('/modules/research-assistant')
    } else {
      setError(result.error || 'Something went wrong')
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col selection:bg-white/20">
      {/* Ambient grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute top-0 right-1/3 w-[600px] h-[500px] opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse at center, #ff7a17 0%, transparent 70%)' }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-[#212327] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-white" />
            <span className="text-[15px] font-normal tracking-tight text-white">AI Suite</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] xai-animate-in opacity-0">
          <div className="xai-auth-card">
            <p className="xai-caption-mono text-[#7d8187] mb-3 text-center">Create Account</p>
            <h1 className="xai-display-sm text-white text-center mb-2">Get started</h1>
            <p className="xai-body-sm text-[#7d8187] text-center mb-8">Create your account to begin</p>

            {/* Social buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <button type="button" onClick={() => handleSocial('google')} disabled={isLoading || !!socialLoading} className="xai-social-btn" id="sign-up-google-btn">
                {socialLoading === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                <span>Continue with Google</span>
              </button>
              <button type="button" onClick={() => handleSocial('github')} disabled={isLoading || !!socialLoading} className="xai-social-btn" id="sign-up-github-btn">
                {socialLoading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitHubIcon />}
                <span>Continue with GitHub</span>
              </button>
            </div>

            <div className="xai-divider-text mb-6"><span>or continue with email</span></div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 xai-body-sm text-center">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="sign-up-name" className="xai-caption-mono-sm text-[#7d8187] block mb-2">Full Name</label>
                <input id="sign-up-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" required className="xai-input w-full" />
              </div>
              <div>
                <label htmlFor="sign-up-email" className="xai-caption-mono-sm text-[#7d8187] block mb-2">Email</label>
                <input id="sign-up-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="xai-input w-full" />
              </div>
              <div>
                <label htmlFor="sign-up-password" className="xai-caption-mono-sm text-[#7d8187] block mb-2">Password</label>
                <div className="relative">
                  <input id="sign-up-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required className="xai-input w-full pr-10" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8187] hover:text-white transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength indicators */}
                {password && (
                  <div className="mt-2 flex flex-col gap-1">
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-2">
                        <Check className={`w-3 h-3 ${rule.test(password) ? 'text-emerald-400' : 'text-[#363a3f]'} transition-colors`} />
                        <span className={`text-xs ${rule.test(password) ? 'text-emerald-400' : 'text-[#7d8187]'} transition-colors`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="sign-up-confirm" className="xai-caption-mono-sm text-[#7d8187] block mb-2">Confirm Password</label>
                <input id="sign-up-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required className="xai-input w-full" />
              </div>
              <button type="submit" disabled={isLoading} className="xai-btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2" id="sign-up-submit-btn">
                {isLoading && !socialLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</> : <>Create Account<ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>

            <p className="text-center xai-body-sm text-[#7d8187] mt-8">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-white hover:underline underline-offset-4">Sign in</Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[#212327] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="xai-caption-mono-sm text-[#7d8187]">AI Productivity Suite</p>
          <p className="xai-caption-mono-sm text-[#7d8187]">Secure · Private · Yours</p>
        </div>
      </footer>
    </div>
  )
}
