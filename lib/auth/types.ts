// ─── Auth Types (Frontend-Only) ───
// These types define the auth contract for the UI layer.
// When a backend is added, these remain the same — only the provider implementation changes.

export type AuthProvider = 'email' | 'google' | 'github'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  provider: AuthProvider
  createdAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthContextType extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: string }>
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; error?: string }>
  signInWithProvider: (provider: AuthProvider) => Promise<{ success: boolean; error?: string }>
  signOut: () => void
}
