import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, handleSupabaseError } from '@/services/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type UsuarioRow = Database['public']['Tables']['usuarios']['Row']

interface AuthContextType {
  user: User | null
  profile: UsuarioRow | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  registerInspector: (email: string, nombre: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UsuarioRow | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser?.email) {
        const userProfile = await fetchProfile(currentUser.email)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser?.email) {
        const userProfile = await fetchProfile(currentUser.email)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      handleSupabaseError(error)
    }
  }

  const logout = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setLoading(false)
      handleSupabaseError(error)
    }
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      handleSupabaseError(error)
    }
  }

  const registerInspector = async (email: string, nombre: string) => {
    // 1. Insert into public.usuarios table
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        email,
        nombre,
        rol: 'inspector'
      })
    
    if (dbError) {
      handleSupabaseError(dbError)
    }

    // 2. Trigger Supabase Auth signUp
    const { error: authError } = await supabase.auth.signUp({
      email,
      password: 'TemporaryPassword123!',
      options: {
        data: {
          nombre,
          rol: 'inspector'
        }
      }
    })

    if (authError) {
      handleSupabaseError(authError)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        login,
        logout,
        resetPassword,
        registerInspector
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
