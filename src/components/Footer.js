import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedinIn, FaStethoscope, FaTwitter } from 'react-icons/fa';

import '../styles/Footer.css';

const Footer = () => (
  <footer className="footer-premium">
    <div className="derma-page-container footer-premium__shell">
      <div className="footer-premium__intro">
        <div className="footer-premium__brand">
          <span className="footer-premium__logo">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
              <defs>
                <linearGradient id="footerLogoGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2f6df6" />
                  <stop offset="1" stopColor="#1bb5d8" />
                </linearGradient>
              </defs>
              <circle cx="18" cy="18" r="16" fill="url(#footerLogoGrad)" />
              <ellipse cx="18" cy="18" rx="8" ry="13" fill="#fff" opacity="0.25" />
              <circle cx="18" cy="10" r="3" fill="#fff" opacity="0.82" />
            </svg>
          </span>
          <div>
            <h3>DermAi</h3>
            <p>AI-assisted dermatology, shaped like a premium patient experience.</p>
          </div>
        </div>

        <div className="footer-premium__note">
          <span className="footer-premium__note-icon">
            <FaStethoscope />
          </span>
          Educational guidance only. Always confirm diagnosis and treatment with a licensed dermatologist.
        </div>
      </div>

      <div className="footer-premium__grid">
        <div className="footer-premium__column">
          <h4>Platform</h4>
          <Link to="/">Home</Link>
          <Link to="/ai-diagnosis">AI Diagnosis</Link>
          <Link to="/enhanced-chatbot">Enhanced AI</Link>
        </div>

        <div className="footer-premium__column">
          <h4>Care Paths</h4>
          <Link to="/connect-doctor">Find Doctors</Link>
          <Link to="/pubmed">PubMed Search</Link>
          <Link to="/about">About DermAi</Link>
        </div>

        <div className="footer-premium__column">
          <h4>Support</h4>
          <Link to="/contact">Contact</Link>
          <a href="mailto:info@dermai.com">info@dermai.com</a>
          <span>Response window: within 24 hours</span>
        </div>

        <div className="footer-premium__column">
          <h4>Connect</h4>
          <div className="footer-premium__socials">
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub />
            </a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedinIn />
            </a>
            <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-premium__bottom">
        <p>© {new Date().getFullYear()} DermAi. Crafted for trustworthy, modern skin care experiences.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
