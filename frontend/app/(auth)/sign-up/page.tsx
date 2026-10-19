'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthShell, AuthField, SocialButton, OrDivider, AuthError, SubmitButton, GoogleIcon, GitHubIcon } from '@/components/marketing/auth-shell'

// Mirrors validatePassword() in lib/auth/auth-context.tsx
const RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
]

export default function SignUpPage() {
  const router = useRouter()
  const { signUp, signInWithProvider, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const passed = RULES.filter(r => r.test(password)).length
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await signUp({ email, password, name, confirmPassword })
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

  const eye = (
    <button type="button" onClick={() => setShowPassword(p => !p)} className="text-gray-500 transition-colors hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  return (
    <AuthShell
      eyebrow="Join the lab"
      title={
        <>
          Assemble your <span className="lab-serif text-[#ffc285]">agent team.</span>
        </>
      }
      subtitle="Create a workspace for research, code review and automation."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-white underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-[#ff7a17]">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <SocialButton onClick={() => handleSocial('google')} disabled={isLoading || !!socialLoading} id="sign-up-google-btn">
          {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Google
        </SocialButton>
        <SocialButton onClick={() => handleSocial('github')} disabled={isLoading || !!socialLoading} id="sign-up-github-btn">
          {socialLoading === 'github' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />}
          GitHub
        </SocialButton>
      </div>

      <OrDivider />
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField label="Full name" id="sign-up-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" required />
        <AuthField label="Email" id="sign-up-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@lab.ai" autoComplete="email" required />

        <div>
          <AuthField
            label="Password"
            id="sign-up-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            trailing={eye}
          />
          {/* Strength meter */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {RULES.map((_, i) => (
              <span key={i} className={cn('h-1 rounded-full transition-all duration-500', i < passed ? (passed === RULES.length ? 'bg-emerald-400' : 'bg-[#ff7a17]') : 'bg-white/10')} />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {RULES.map(r => {
              const ok = r.test(password)
              return (
                <li key={r.label} className={cn('flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors', ok ? 'text-emerald-300' : 'text-gray-600')}>
                  <Check className={cn('h-3 w-3 transition-opacity', ok ? 'opacity-100' : 'opacity-30')} />
                  {r.label}
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <AuthField
            label="Confirm password"
            id="sign-up-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            aria-invalid={mismatch}
          />
          {mismatch && <p className="lab-line-in mt-2 text-[12.5px] text-red-300">Passwords don&apos;t match yet.</p>}
        </div>

        <SubmitButton disabled={isLoading} id="sign-up-submit-btn">
          {isLoading && !socialLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating workspace…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </SubmitButton>
        <p className="text-center text-[12px] leading-relaxed text-gray-600">By creating an account you agree to the Terms of Service and Privacy Policy.</p>
      </form>
    </AuthShell>
  )
}
