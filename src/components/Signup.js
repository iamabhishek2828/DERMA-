import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaMagic, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSignup = async (event) => {
    event.preventDefault();
    setMsg('');

    if (password !== confirmPassword) {
      setMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMsg('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setMsg(error.message || 'Signup failed');
        return;
      }

      setMsg('Signup successful. Please check your email to confirm your account.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      console.error('Signup error:', error);
      setMsg('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page derma-page-shell">
      <div className="derma-page-container auth-page__layout">
        <section className="auth-page__intro">
          <span className="derma-page-kicker">Create Account</span>
          <h1 className="derma-section-title">Set up your DermAi workspace in one clean step.</h1>
          <p className="derma-section-copy">
            Create an account to unlock saved analysis history, a better assistant workflow, and smoother doctor
            escalation whenever you need it.
          </p>
          <div className="auth-page__meta">
            <div className="auth-page__meta-item">
              <FaShieldAlt />
              <span>Designed for repeat use without losing your diagnostic context</span>
            </div>
            <div className="auth-page__meta-item">
              <FaMagic />
              <span>One account gives you a more connected experience across DermAi’s AI tools</span>
            </div>
          </div>
        </section>

        <section className="auth-card derma-page-panel">
          <div className="auth-card__heading">
            <span className="derma-page-kicker">Sign Up</span>
            <h2>Create your account</h2>
          </div>

          <form className="auth-form" onSubmit={handleSignup}>
            <input
              className="derma-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading}
            />
            <input
              className="derma-input"
              type="password"
              placeholder="Password (minimum 6 characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={isLoading}
            />
            <input
              className="derma-input"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={isLoading}
            />
            <button type="submit" className="derma-button auth-form__button" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {msg && (msg.toLowerCase().includes('successful') ? <div className="derma-form-success">{msg}</div> : <div className="derma-form-error">{msg}</div>)}

          <p className="auth-card__switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Signup;
