// src/services/flaskAuth.js
import { API_BASE_URL } from '../config'

export const flaskAuth = {
  // Sign up
  signUp: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.msg || 'Signup failed')
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in
  signIn: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.msg || 'Login failed')
      }
      
      // Store token in localStorage
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in with Google (redirect to Flask Google OAuth)
  signInWithGoogle: () => {
    window.location.href = `${API_BASE_URL}/login/google`
  },

  // Sign out
  signOut: async () => {
    localStorage.removeItem('access_token')
    return { error: null }
  },

  // Get current session
  getSession: async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      // Verify token is still valid by making a test request
      try {
        const response = await fetch(`${API_BASE_URL}/api/verify-token`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          return { session: { access_token: token, user: userData }, error: null }
        } else {
          localStorage.removeItem('access_token')
          return { session: null, error: null }
        }
      } catch (error) {
        localStorage.removeItem('access_token')
        return { session: null, error }
      }
    }
    return { session: null, error: null }
  },

  // Get current user
  getUser: () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        // Decode JWT to get user info (basic decoding, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]))
        return { user: { id: payload.sub, email: payload.identity }, error: null }
      } catch (error) {
        return { user: null, error }
      }
    }
    return { user: null, error: null }
  }
}