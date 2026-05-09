import { createContext } from "react"
import type { AuthError, Session, User } from "@supabase/supabase-js"

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: Record<string, unknown>) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
