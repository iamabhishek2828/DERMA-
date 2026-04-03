import React, { createContext, useContext, useEffect, useState } from 'react'
import { flaskAuth } from '../services/flaskAuth'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session, error } = await flaskAuth.getSession()
        if (session && !error) {
          setSession(session)
          setUser(session.user)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Handle Google OAuth callback
    const handleGoogleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (token) {
        localStorage.setItem('access_token', token)
        // Remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Refresh user state
        getInitialSession()
      }
    }

    handleGoogleCallback()
  }, [])

  const signUp = async (username, password) => {
    try {
      setLoading(true)
      const result = await flaskAuth.signUp(username, password)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (username, password) => {
    try {
      setLoading(true)
      const result = await flaskAuth.signIn(username, password)
      
      if (result.data && !result.error) {
        // Get user session after successful login
        const { session } = await flaskAuth.getSession()
        setSession(session)
        setUser(session?.user || null)
      }
      
      return result
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    // This will redirect to Google OAuth
    flaskAuth.signInWithGoogle()
    return { data: null, error: null }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await flaskAuth.signOut()
      setSession(null)
      setUser(null)
      return { error: null }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}