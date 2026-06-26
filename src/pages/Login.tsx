import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { DbError } from '@/services/supabase'

export const Login: React.FC = () => {
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // View modes: 'login' | 'forgot'
  const [mode, setMode] = useState<'login' | 'forgot'>('login')

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      try {
        await login(email, password)
        navigate(from, { replace: true })
      } catch (err: unknown) {
        console.error(err)
        const dbErr = err as DbError | null
        setError(dbErr?.message || 'Usuario o contraseña incorrectos. Por favor, intente de nuevo.')
      } finally {
        setLoading(false)
      }
    } else {
      try {
        await resetPassword(email)
        setSuccess('Se ha enviado un enlace de recuperación a tu correo electrónico.')
      } catch (err: unknown) {
        console.error(err)
        const dbErr = err as DbError | null
        setError(dbErr?.message || 'Error al intentar enviar el correo de recuperación.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {mode === 'login' ? 'Control Sanitario' : 'Recuperar Contraseña'}
        </h2>
        <p className="text-sm text-muted-foreground max-w">
          {mode === 'login'
            ? 'Ingresa tus credenciales para acceder a la consola municipal'
            : 'Introduce tu correo electrónico registrado para recibir el enlace de restablecimiento'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in">
        <div className="bg-card py-8 px-4 border border-border rounded-lg shadow-sm sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 text-destructive text-sm font-medium animate-pulse">
                {error}
              </div>
            )}
            
            {success && (
              <div className="rounded-md bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-600 text-sm font-medium">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="ejemplo@municipalidad.gob.pe"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot')
                      setError(null)
                      setSuccess(null)
                    }}
                    className="text-sm font-medium text-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
                ) : mode === 'login' ? (
                  'Iniciar Sesión'
                ) : (
                  'Enviar Enlace'
                )}
              </button>
            </div>
          </form>

          {mode === 'forgot' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setSuccess(null)
                }}
                className="text-sm font-medium text-primary hover:underline bg-transparent border-0 cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
