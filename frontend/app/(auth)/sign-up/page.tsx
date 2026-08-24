'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const { signUp, signInWithProvider, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await signUp({
      email, password, name,
      confirmPassword: ''
    })
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
    <div className="relative min-h-screen text-white selection:bg-white/20 font-sans flex flex-col">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none' }}
      >
        <source src="/no_watermakr_space.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for text readability & glassmorphism contrast */}
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(10, 10, 10, 0.3) 0%, rgba(10, 10, 10, 0.85) 70%, rgba(5, 5, 5, 0.95) 100%)',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/ProdSuite.png" alt="ProdSuite Logo" className="w-8 h-8 rounded shadow-lg border border-white/10 object-cover" />
            <span className="text-lg font-medium tracking-wide">ProdSuite</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] xai-animate-in opacity-0">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_0_40px_rgba(255,255,255,0.05)] relative overflow-hidden">
            {/* Ambient Glow inside card */}
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />

            <div className="relative z-10">
              <p className="text-purple-400 text-xs font-mono uppercase tracking-widest text-center mb-3">Join Us</p>
              <h1 className="text-3xl font-semibold text-white text-center mb-2 tracking-tight">Create an account</h1>
              <p className="text-sm text-gray-400 text-center mb-8">Enter your details to get started</p>

              {/* Social buttons */}
              <div className="flex flex-col gap-3 mb-6">
                <button type="button" onClick={() => handleSocial('google')} disabled={isLoading || !!socialLoading} className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 text-white rounded-full py-2.5 text-sm font-medium transition-all" id="sign-up-google-btn">
                  {socialLoading === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                  <span>Sign up with Google</span>
                </button>
                <button type="button" onClick={() => handleSocial('github')} disabled={isLoading || !!socialLoading} className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 text-white rounded-full py-2.5 text-sm font-medium transition-all" id="sign-up-github-btn">
                  {socialLoading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitHubIcon />}
                  <span>Sign up with GitHub</span>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6 opacity-50">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-xs font-mono uppercase tracking-widest text-white">or</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="sign-up-name" className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-2">Full Name</label>
                  <input id="sign-up-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all" />
                </div>
                <div>
                  <label htmlFor="sign-up-email" className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-2">Email</label>
                  <input id="sign-up-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all" />
                </div>
                <div>
                  <label htmlFor="sign-up-password" className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-2">Password</label>
                  <div className="relative">
                    <input id="sign-up-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all" />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 rounded-full py-3 text-sm font-medium transition-all active:scale-95" id="sign-up-submit-btn">
                  {isLoading && !socialLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</> : <>Create Account<ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-8">
                Already have an account?{' '}
                <Link href="/sign-in" className="text-white hover:text-blue-400 transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">ProdSuite</p>
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Secure · Private · Yours</p>
        </div>
      </footer>
    </div>
  )
}
