'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2, ShieldAlert } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))

    if (email === 'Timi84@gmail.com' && password === 'Rais2330') {
      // Mock successful login
      localStorage.setItem('prodsuite_admin_auth', 'true')
      router.push('/admin/dashboard')
    } else {
      setError('Invalid admin credentials')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen text-white selection:bg-red-500/30 font-sans flex flex-col">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 grayscale opacity-80"
        style={{ pointerEvents: 'none' }}
      >
        <source src="/no_watermakr_space.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for admin aesthetic */}
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(30, 10, 10, 0.6) 0%, rgba(10, 5, 5, 0.9) 70%, rgba(5, 0, 0, 0.98) 100%)',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-red-500/20 bg-black/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/ProdSuite.png" alt="ProdSuite Logo" className="w-8 h-8 rounded shadow-lg border border-red-500/20 object-cover" />
            <span className="text-lg font-medium tracking-wide">ProdSuite <span className="text-red-500 font-mono text-sm ml-2">ADMIN</span></span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] animate-in fade-in zoom-in duration-500">
          <div className="bg-red-950/20 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 md:p-10 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden">
            {/* Ambient Glow inside card */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-[60px]" />

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center backdrop-blur-md">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                </div>
              </div>
              
              <h1 className="text-3xl font-semibold text-white text-center mb-2 tracking-tight">Admin Portal</h1>
              <p className="text-sm text-red-300/70 text-center mb-8">Restricted access area.</p>

              {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm text-center font-medium backdrop-blur-md">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="admin-email" className="text-xs font-mono uppercase tracking-widest text-red-300/70 block mb-2">Admin Email</label>
                  <input 
                    id="admin-email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="admin@prodsuite.ai" 
                    autoComplete="email" 
                    required 
                    className="w-full bg-black/60 border border-red-500/20 rounded-xl px-4 py-2.5 text-white placeholder-red-300/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="admin-password" className="text-xs font-mono uppercase tracking-widest text-red-300/70">Passcode</label>
                  </div>
                  <div className="relative">
                    <input 
                      id="admin-password" 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      autoComplete="current-password" 
                      required 
                      className="w-full bg-black/60 border border-red-500/20 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-red-300/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" 
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400/50 hover:text-red-400 transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-full py-3 text-sm font-medium transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]" 
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Authenticating…</> : <>Authorize Access<ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              <div className="mt-8 flex justify-center">
                <Link href="/" className="text-xs font-mono text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-widest">
                  &larr; Return to Application
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-red-500/20 bg-black/40 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-red-500/50">ProdSuite Admin</p>
          <p className="text-xs font-mono text-red-500/40 uppercase tracking-widest">Internal Use Only</p>
        </div>
      </footer>
    </div>
  )
}
