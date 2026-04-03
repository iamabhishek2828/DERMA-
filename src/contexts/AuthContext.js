import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { supabaseAuth } from '../services/supabaseAuth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh auth state
  const refreshAuth = async () => {
    try {
      if (!supabase) {
        setUser(null);
        setSession(null);
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error refreshing auth:', error);
        setUser(null);
        setSession(null);
      } else {
        setUser(session?.user || null);
        setSession(session);
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      setUser(null);
      setSession(null);
    }
  };

  // Sign up function
  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAuth.signUp(email, password, userData);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAuth.signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAuth.signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear access token from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-udvgkyzzpiuacczwodda-auth-token');
      
      const { error } = await supabaseAuth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear user state
      setUser(null);
      setSession(null);
      
      return { error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return () => {};
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setUser(session?.user || null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed - Event:', event, 'User:', session?.user ? 'Authenticated' : 'Not authenticated');
      
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
        
        // Special handling for Google OAuth users
        if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
          console.log('Google user signed in, preparing interface refresh...');
          
          // Dispatch custom event to notify components
          window.dispatchEvent(new CustomEvent('googleAuthComplete', { 
            detail: { user: session.user } 
          }));
          
          // Small delay to ensure all components are updated
          setTimeout(() => {
            console.log('Forcing page refresh for Google auth user...');
            window.location.reload();
          }, 800);
        } else if (event === 'SIGNED_IN') {
          // For regular email/password login, just update state
          console.log('Regular user signed in');
        }
      } else {
        setUser(null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing local storage...');
          // Clear any remaining auth data
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('sb-udvgkyzzpiuacczwodda-auth-token');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    setUser,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
