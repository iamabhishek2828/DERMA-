import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DermaLogo = () => (
  <span className="derma-logo-svg" aria-label="DermAi logo">
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="dermaLogoA" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f6df6" />
          <stop offset="1" stopColor="#1bb5d8" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="16" fill="url(#dermaLogoA)" />
      <ellipse cx="18" cy="18" rx="8" ry="13" fill="#fff" opacity="0.28" />
      <circle cx="18" cy="10" r="3" fill="#fff" opacity="0.82" />
      <circle cx="14" cy="23" r="1.9" fill="#fff" opacity="0.36" />
      <circle cx="22.5" cy="20" r="1.2" fill="#fff" opacity="0.28" />
    </svg>
  </span>
);

const Navbar = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEnhancedDropdown, setShowEnhancedDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const baseLinks = useMemo(
    () => [
      { to: '/', label: 'Home' },
      { to: '/ai-diagnosis', label: 'AI Diagnosis' },
      ...(user ? [{ to: '/analytics', label: 'Analytics' }] : []),
      { to: '/connect-doctor', label: 'Doctors' },
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
    [user]
  );

  const enhancedActive = ['/enhanced-chatbot', '/knowledge-management'].includes(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setShowMenu(false);
    setShowEnhancedDropdown(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className={`derma-navbar-glass${scrolled ? ' scrolled' : ''}`}>
      <div className="derma-navbar-inner">
        <Link to="/" className="derma-navbar-logo">
          <DermaLogo />
          <span className="derma-navbar-title">DermAi</span>
        </Link>

        <button
          className="derma-navbar-toggle"
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setShowMenu((value) => !value)}
        >
          <span className="hamburger-icon">{showMenu ? '✕' : '☰'}</span>
        </button>

        <div className={`derma-navbar-drawer${showMenu ? ' show' : ''}`}>
          <ul className="derma-navbar-menu">
            {baseLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`derma-navbar-link${location.pathname === link.to ? ' is-active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {user && (
              <li className="derma-navbar-dropdown">
                <button
                  type="button"
                  className={`derma-navbar-link derma-navbar-link--button${enhancedActive ? ' is-active' : ''}`}
                  onClick={() => setShowEnhancedDropdown((value) => !value)}
                >
                  Enhanced AI
                  <span>{showEnhancedDropdown ? '▴' : '▾'}</span>
                </button>
                <ul className={`dropdown-menu${showEnhancedDropdown ? ' show' : ''}`}>
                  <li>
                    <Link
                      to="/enhanced-chatbot"
                      className={location.pathname === '/enhanced-chatbot' ? 'active' : ''}
                    >
                      Evidence Chat
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/knowledge-management"
                      className={location.pathname === '/knowledge-management' ? 'active' : ''}
                    >
                      Knowledge Base
                    </Link>
                  </li>
                </ul>
              </li>
            )}
          </ul>

          <div className="derma-navbar-actions">
            {!loading && (
              <>
                {user ? (
                  <div className="derma-user-chip">
                    <span className="derma-user-avatar">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="derma-user-email">{user.email}</span>
                    <button className="derma-user-logout" type="button" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className={`derma-navbar-link derma-navbar-link--subtle${
                        location.pathname === '/login' ? ' is-active' : ''
                      }`}
                    >
                      Login
                    </Link>
                    <Link to="/signup" className="derma-button">
                      Create Account
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
