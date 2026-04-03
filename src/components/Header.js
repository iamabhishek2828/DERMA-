// src/components/Header.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/navbar.css'; // Ensure this path is correct

const Header = () => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery.trim()}`);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <h1 className="navbar-logo"><Link to="/">DermAi</Link></h1>
        <nav className="navbar-nav">
          <ul className="nav-list">
            <li><Link to="/" className="nav-link">Home</Link></li>
            <li className="dropdown">
              <button className="dropbtn" onClick={toggleDropdown}>
                Services <span className="arrow">&#9662;</span>
              </button>
              <div className={`dropdown-content ${isDropdownOpen ? 'show' : ''}`}>
                <Link to="/treatment-options">Treatment Options</Link>
                <Link to="/connect-doctor">Connect with Doctor</Link>
                <Link to="/dermai-chatbot">DermAi Chatbot</Link>
              </div>
            </li>
            <li><Link to="/about" className="nav-link">About</Link></li>
            <li><Link to="/contact" className="nav-link">Contact</Link></li>
            <li><Link to="/diagnosis" className="nav-link">Diagnosis</Link></li>
            <li><Link to="/upload" className="nav-link">Upload</Link></li>
          </ul>
        </nav>
        <div className="navbar-search">
          <form onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={handleSearchChange} 
            />
            <button type="submit" className="search-btn">🔍</button>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;
