import { supabase } from '../config/supabase'

const getMissingConfigError = () =>
  new Error(
    'Authentication is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in the frontend environment.'
  )

export const supabaseAuth = {
  // Sign up with email and password
  signUp: async (email, password) => {
    try {
      if (!supabase) {
        throw getMissingConfigError()
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    try {
      if (!supabase) {
        throw getMissingConfigError()
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in with Google OAuth
  signInWithGoogle: async () => {
    try {
      if (!supabase) {
        throw getMissingConfigError()
      }

      console.log('Initiating Google OAuth sign-in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Force fresh authentication and ensure proper redirect
          skipBrowserRedirect: false,
        }
      })
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error
      }
      
      console.log('Google OAuth initiated successfully');
      return { data, error: null }
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { data: null, error }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      if (!supabase) {
        return { error: null }
      }

      // Clear any local storage before signing out
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-udvgkyzzpiuacczwodda-auth-token');
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, clear local state
        return { error: null }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error);
      return { error }
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      if (!supabase) {
        throw getMissingConfigError()
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        throw error
      }
      
      return { user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  },

  // Get current session
  getSession: async () => {
    try {
      if (!supabase) {
        return { session: null, error: getMissingConfigError() }
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw error
      }
      
      return { session, error: null }
    } catch (error) {
      return { session: null, error }
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    if (!supabase) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }
    }

    return supabase.auth.onAuthStateChange(callback)
  }
}
