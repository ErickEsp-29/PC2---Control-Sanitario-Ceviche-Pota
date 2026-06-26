import { createClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

// Client initialization with Database types for strict type-checking
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export interface DbError extends Error {
  code?: string
  originalError?: unknown
}

/**
 * Centralized database error handler wrapper
 * Logs details and throws a structured error
 */
export const handleSupabaseError = (error: PostgrestError | null | undefined | unknown): never => {
  console.error('Supabase Database Error:', error)
  const pgError = error as PostgrestError | null | undefined
  const message = pgError?.message || 'Ha ocurrido un error inesperado en la base de datos.'
  const code = pgError?.code || 'UNKNOWN_ERROR'
  
  const customError = new Error(message) as DbError
  customError.code = code
  customError.originalError = error
  throw customError
}
