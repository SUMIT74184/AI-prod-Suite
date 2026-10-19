'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { AuthShell, AuthField, SocialButton, OrDivider, AuthError, SubmitButton, GoogleIcon, GitHubIcon } from '@/components/marketing/auth-shell'

export default function SignInPage() {
  const router = useRouter()
  const { signIn, signInWithProvider, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await signIn({ email, password })
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
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Resume your <span className="lab-serif text-[#ffc285]">research.</span>
        </>
      }
      subtitle="Sign in to your ProdSuite workspace. Your agents kept your context."
      footer={
        <>
          New to ProdSuite?{' '}
          <Link href="/sign-up" className="text-white underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-[#ff7a17]">
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <SocialButton onClick={() => handleSocial('google')} disabled={isLoading || !!socialLoading} id="sign-in-google-btn">
          {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Google
        </SocialButton>
        <SocialButton onClick={() => handleSocial('github')} disabled={isLoading || !!socialLoading} id="sign-in-github-btn">
          {socialLoading === 'github' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />}
          GitHub
        </SocialButton>
      </div>

      <OrDivider />
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField label="Email" id="sign-in-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@lab.ai" autoComplete="email" required />
        <AuthField
          label="Password"
          id="sign-in-password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          aside={
            <button type="button" className="text-[12px] text-gray-500 transition-colors hover:text-white" tabIndex={-1}>
              Forgot password?
            </button>
          }
          trailing={
            <button type="button" onClick={() => setShowPassword(p => !p)} className="text-gray-500 transition-colors hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <SubmitButton disabled={isLoading} id="sign-in-submit-btn">
          {isLoading && !socialLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </SubmitButton>
      </form>
    </AuthShell>
  )
}
