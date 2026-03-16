'use client'

import { supabase } from "@/supabase"
import { createContext, useContext, useEffect, useState } from "react"

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
      setIsLoadingUser(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signup(email, password, name, institution) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id, name, institution,
        team: 'Registrar',
        settings: { darkMode: false, emailAlerts: true, multiUser: true, roleAccess: false, securityLock: true }
      })
    }
    return data
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoadingUser, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
