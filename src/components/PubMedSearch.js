import React, { useState } from 'react';
import { buildApiUrl } from '../config';

export default function PubMedSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const resp = await fetch(buildApiUrl(`/pubmed-search?q=${encodeURIComponent(query)}`));
      const data = await resp.json();
      setResults(data);
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)', // Adjust for navbar/footer height
        background: 'linear-gradient(120deg, #e6faff 0%, #f6fcff 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', // Center vertically
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 24,
          boxShadow: '0 8px 32px #b5d0e6, 0 2px 12px #00b4d822',
          padding: '2.5rem 2rem 2rem 2rem',
          maxWidth: 540,
          width: '95vw',
          margin: '0 auto',
          marginBottom: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 10, color: '#3a7bd5' }}>🔬</div>
        <h1
          style={{
            color: '#185a9d',
            fontWeight: 800,
            fontSize: '2rem',
            marginBottom: 10,
            letterSpacing: 1,
          }}
        >
          PubMed Medical Literature Search
        </h1>
        <p
          style={{
            color: '#00b4d8',
            fontWeight: 500,
            fontSize: '1.1rem',
            marginBottom: 24,
          }}
        >
          Search trusted medical literature by symptom or disease.
        </p>
        <div
          style={{
            background: 'rgba(227,240,250,0.92)',
            borderRadius: 16,
            padding: '1.5rem 1.2rem',
            boxShadow: '0 2px 12px #00b4d844',
            maxWidth: 480,
            margin: '0 auto',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter symptom or disease (e.g. fever, eczema)..."
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #b5d0e6',
                background: '#f8fcff',
                fontSize: '1.08rem',
                color: '#185a9d',
                fontWeight: 500,
                outline: 'none',
                transition: 'border 0.2s',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: 'linear-gradient(90deg, #3a7bd5 40%, #00b4d8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '0.7rem 1.3rem',
                fontWeight: 700,
                fontSize: 16,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px #00b4d844',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Searching...' : 'Search PubMed'}
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {results.map(r => (
              <li key={r.uid} style={{
                background: '#fff',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 10,
                boxShadow: '0 1px 4px #b5d0e622',
                color: '#185a9d',
                fontWeight: 500,
                fontSize: 15,
              }}>
                <strong>{r.title}</strong><br />
                <span style={{ color: '#3a7bd5', fontSize: 13 }}>
                  {r.authors?.map(a => a.name).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
