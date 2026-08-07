'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { AuthContextType, AuthState, SignInCredentials, SignUpCredentials, AuthProvider, User } from './types'

const AUTH_STORAGE_KEY = 'ai-suite-auth'

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Validation helpers ───
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

// ─── Provider ───
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const user: User = JSON.parse(stored)
        setState({ user, isAuthenticated: true, isLoading: false })
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const persistUser = useCallback((user: User) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    setState({ user, isAuthenticated: true, isLoading: false })
  }, [])

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }))

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800))

    if (!validateEmail(credentials.email)) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: 'Please enter a valid email address' }
    }
    if (!credentials.password) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: 'Password is required' }
    }

    // Frontend-only: accept any valid-looking credentials
    const user: User = {
      id: crypto.randomUUID(),
      email: credentials.email,
      name: credentials.email.split('@')[0],
      provider: 'email',
      createdAt: new Date(),
    }
    persistUser(user)
    return { success: true }
  }, [persistUser])

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }))

    await new Promise(r => setTimeout(r, 800))

    if (!credentials.name.trim()) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: 'Name is required' }
    }
    if (!validateEmail(credentials.email)) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: 'Please enter a valid email address' }
    }
    const passwordError = validatePassword(credentials.password)
    if (passwordError) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: passwordError }
    }
    if (credentials.password !== credentials.confirmPassword) {
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: 'Passwords do not match' }
    }

    const user: User = {
      id: crypto.randomUUID(),
      email: credentials.email,
      name: credentials.name,
      provider: 'email',
      createdAt: new Date(),
    }
    persistUser(user)
    return { success: true }
  }, [persistUser])

  const signInWithProvider = useCallback(async (provider: AuthProvider) => {
    setState(prev => ({ ...prev, isLoading: true }))

    // Simulate OAuth redirect delay
    await new Promise(r => setTimeout(r, 1200))

    const providerNames: Record<AuthProvider, string> = {
      google: 'Google User',
      github: 'GitHub User',
      email: '',
    }

    const user: User = {
      id: crypto.randomUUID(),
      email: `user@${provider}.com`,
      name: providerNames[provider] || provider,
      avatar: undefined,
      provider,
      createdAt: new Date(),
    }
    persistUser(user)
    return { success: true }
  }, [persistUser])

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
