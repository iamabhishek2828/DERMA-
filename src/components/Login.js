import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setMsg('');
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setMsg(error.message || 'Login failed');
        return;
      }

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setMsg('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page derma-page-shell">
      <div className="derma-page-container auth-page__layout">
        <section className="auth-page__intro">
          <span className="derma-page-kicker">Welcome Back</span>
          <h1 className="derma-section-title">Sign in to continue your DermAi workflow.</h1>
          <p className="derma-section-copy">
            Access your diagnosis workspace, saved history, doctor connection flow, and enhanced AI tools from one
            cleaner account experience.
          </p>
          <div className="auth-page__meta">
            <div className="auth-page__meta-item">
              <FaShieldAlt />
              <span>Private account flow designed for healthcare-adjacent use</span>
            </div>
            <div className="auth-page__meta-item">
              <FaLock />
              <span>Your saved analysis history stays tied to your authenticated session</span>
            </div>
          </div>
        </section>

        <section className="auth-card derma-page-panel">
          <div className="auth-card__heading">
            <span className="derma-page-kicker">Login</span>
            <h2>{loading ? 'Checking session...' : 'Sign in'}</h2>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <input
              className="derma-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading || loading}
            />
            <input
              className="derma-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading || loading}
            />
            <button type="submit" className="derma-button auth-form__button" disabled={isLoading || loading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          {msg && <div className="derma-form-error">{msg}</div>}

          <p className="auth-card__switch">
            Don’t have an account? <Link to="/signup">Create one</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Login;
