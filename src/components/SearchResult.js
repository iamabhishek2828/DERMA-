// src/components/SearchResults.js

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/search-results.css'; // Ensure this path is correct

const SearchResults = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q').toLowerCase();

  // List of pages to search through
  const pages = [
    { title: 'Home', link: '/' },
    { title: 'About', link: '/about' },
    { title: 'Contact', link: '/contact' },
    { title: 'Treatment Options', link: '/treatment-options' },
    { title: 'Connect with Doctor', link: '/connect-doctor' },
    { title: 'DermAi Chatbot', link: '/dermai-chatbot' },
    { title: 'Diagnosis', link: '/diagnosis' },
    { title: 'Upload', link: '/upload' },
  ];

  // Filter pages based on search query
  const results = pages.filter(page =>
    page.title.toLowerCase().includes(query)
  );

  return (
    <div className="search-results">
      <h2>Search Results for "{query}"</h2>
      <ul>
        {results.length > 0 ? (
          results.map((result, index) => (
            <li key={index}>
              <Link to={result.link}>{result.title}</Link>
            </li>
          ))
        ) : (
          <li>No results found</li>
        )}
      </ul>
    </div>
  );
};

export default SearchResults;


