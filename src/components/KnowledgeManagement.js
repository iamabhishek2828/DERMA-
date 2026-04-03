import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config';
import '../styles/theme.css';
import '../styles/knowledge-management.css';

const KnowledgeManagement = () => {
  const [knowledgeEntries, setKnowledgeEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    category: 'general',
    source: 'manual',
    tags: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState(null);
  const { user } = useAuth();

  const categories = [
    'general',
    'acne',
    'eczema',
    'psoriasis',
    'melanoma',
    'dermatitis',
    'fungal_infections',
    'bacterial_infections',
    'viral_infections',
    'autoimmune',
    'cancer',
    'cosmetic',
    'pediatric',
    'geriatric',
    'treatments',
    'medications',
    'prevention'
  ];

  const loadKnowledgeEntries = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // This would typically load from your backend
      // For now, we'll simulate with empty array
      setKnowledgeEntries([]);
    } catch (error) {
      console.error('Error loading knowledge entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadKnowledgeEntries();
  }, [loadKnowledgeEntries]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(buildApiUrl('/api/rag/search-knowledge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: searchQuery,
          top_k: 10
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        console.error('Search failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      alert('Please provide both title and content.');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/api/rag/store-knowledge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newEntry.content,
          metadata: {
            title: newEntry.title,
            category: newEntry.category,
            source: newEntry.source,
            tags: newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            added_by: user?.email || 'user',
            date_added: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        await response.json();
        alert('Knowledge entry added successfully!');
        
        // Reset form
        setNewEntry({
          title: '',
          content: '',
          category: 'general',
          source: 'manual',
          tags: ''
        });
        setShowAddForm(false);
        
        // Refresh knowledge entries
        loadKnowledgeEntries();
      } else {
        throw new Error(`Failed to add knowledge entry: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding knowledge:', error);
      alert(`Error adding knowledge entry: ${error.message}`);
    }
  };

  const handleSeedKnowledge = async () => {
    if (!window.confirm('This will seed the knowledge base with curated dermatological information. This process may take several minutes. Continue?')) {
      return;
    }

    setIsSeeding(true);
    setSeedingProgress({ status: 'starting', progress: 0, message: 'Initializing knowledge seeding...' });

    try {
      const response = await fetch(buildApiUrl('/api/rag/seed-knowledge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          categories: categories.filter(cat => cat !== 'general'),
          include_treatments: true,
          include_prevention: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSeedingProgress({ 
          status: 'completed', 
          progress: 100, 
          message: `Successfully seeded ${result.entries_added || 0} knowledge entries!` 
        });
        
        // Refresh knowledge entries after seeding
        setTimeout(() => {
          loadKnowledgeEntries();
          setSeedingProgress(null);
        }, 3000);
      } else {
        throw new Error(`Seeding failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Seeding error:', error);
      setSeedingProgress({ 
        status: 'error', 
        progress: 0, 
        message: `Seeding failed: ${error.message}` 
      });
      setTimeout(() => setSeedingProgress(null), 5000);
    } finally {
      setIsSeeding(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      general: '📋',
      acne: '🔴',
      eczema: '🟠',
      psoriasis: '🔶',
      melanoma: '⚫',
      dermatitis: '🟡',
      fungal_infections: '🟤',
      bacterial_infections: '🦠',
      viral_infections: '🔵',
      autoimmune: '🔬',
      cancer: '🎗️',
      cosmetic: '✨',
      pediatric: '👶',
      geriatric: '👴',
      treatments: '💊',
      medications: '💉',
      prevention: '🛡️'
    };
    return icons[category] || '📄';
  };

  if (!user) {
    return (
      <div className="knowledge-management-container">
        <div className="responsive-container">
          <div className="access-denied">
            <h2>🔒 Access Restricted</h2>
            <p>Please <a href="/login">log in</a> to access the Knowledge Management system.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge-management-container">
      <div className="knowledge-header">
        <div className="responsive-container">
          <h2 className="responsive-text-hero">📚 RAG Knowledge Management</h2>
          <p className="knowledge-subtitle responsive-text-body">
            Manage and search the dermatological knowledge base that powers our RAG system
          </p>
        </div>
      </div>
      
      <div className="responsive-container">
        <div className="knowledge-content">

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn primary"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={isSeeding}
        >
          ➕ Add Knowledge Entry
        </button>
        
        <button
          className="btn secondary"
          onClick={handleSeedKnowledge}
          disabled={isSeeding || isLoading}
        >
          {isSeeding ? '🔄 Seeding...' : '🌱 Seed Knowledge Base'}
        </button>
      </div>

      {/* Seeding Progress */}
      {seedingProgress && (
        <div className={`seeding-progress ${seedingProgress.status}`}>
          <div className="progress-header">
            <span className="progress-icon">
              {seedingProgress.status === 'starting' && '🔄'}
              {seedingProgress.status === 'completed' && '✅'}
              {seedingProgress.status === 'error' && '❌'}
            </span>
            <span className="progress-text">{seedingProgress.message}</span>
          </div>
          {seedingProgress.status === 'starting' && (
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${seedingProgress.progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Add Knowledge Form */}
      {showAddForm && (
        <div className="add-knowledge-form">
          <h3>Add New Knowledge Entry</h3>
          <form onSubmit={handleAddKnowledge}>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={newEntry.title}
                onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                placeholder="e.g., Acne Vulgaris Treatment Options"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {category.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="source">Source</label>
                <select
                  id="source"
                  value={newEntry.source}
                  onChange={(e) => setNewEntry({...newEntry, source: e.target.value})}
                >
                  <option value="manual">Manual Entry</option>
                  <option value="medical_journal">Medical Journal</option>
                  <option value="clinical_study">Clinical Study</option>
                  <option value="textbook">Medical Textbook</option>
                  <option value="guidelines">Clinical Guidelines</option>
                  <option value="expert_review">Expert Review</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                type="text"
                id="tags"
                value={newEntry.tags}
                onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
                placeholder="e.g., topical, antibiotic, severe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content *</label>
              <textarea
                id="content"
                value={newEntry.content}
                onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                placeholder="Enter detailed medical information..."
                rows={8}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn primary">
                💾 Save Knowledge Entry
              </button>
              <button 
                type="button" 
                className="btn secondary"
                onClick={() => setShowAddForm(false)}
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Section */}
      <div className="search-section">
        <h3>🔍 Search Knowledge Base</h3>
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medical knowledge, treatments, conditions..."
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="search-btn"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? '🔄' : '🔍'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>📊 Search Results ({searchResults.length} found)</h4>
            <div className="results-grid">
              {searchResults.map((result, index) => (
                <div key={index} className="result-card">
                  <div className="result-header">
                    <div className="result-title">
                      <span className="category-icon">
                        {getCategoryIcon(result.metadata?.category || 'general')}
                      </span>
                      <h5>{result.metadata?.title || 'Untitled'}</h5>
                    </div>
                    <div className="relevance-score">
                      {Math.round(result.relevance * 100)}% match
                    </div>
                  </div>
                  
                  <div className="result-content">
                    <p>{result.content?.substring(0, 200)}...</p>
                  </div>
                  
                  <div className="result-meta">
                    <span className="source-badge">
                      {result.metadata?.source || 'Unknown'}
                    </span>
                    <span className="category-badge">
                      {(result.metadata?.category || 'general').replace('_', ' ')}
                    </span>
                    {result.metadata?.tags && result.metadata.tags.length > 0 && (
                      <div className="tags-container">
                        {result.metadata.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={tagIndex} className="tag-badge">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="no-results">
            <p>No knowledge entries found for "<strong>{searchQuery}</strong>"</p>
            <p>Try different keywords or consider adding this knowledge to the base.</p>
          </div>
        )}
      </div>

      {/* Knowledge Statistics */}
      <div className="knowledge-stats">
        <h3>📈 Knowledge Base Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-number">{knowledgeEntries.length}</div>
              <div className="stat-label">Total Entries</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏷️</div>
            <div className="stat-content">
              <div className="stat-number">{categories.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <div className="stat-number">{searchResults.length}</div>
              <div className="stat-label">Last Search Results</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-number">RAG</div>
              <div className="stat-label">System Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="system-info">
        <h4>ℹ️ System Information</h4>
        <div className="info-content">
          <p>
            <strong>RAG Technology:</strong> This knowledge management system uses Retrieval-Augmented Generation 
            to provide evidence-based dermatological responses. The knowledge base is vectorized using 
            advanced embedding models for semantic search.
          </p>
          <p>
            <strong>Data Sources:</strong> Knowledge entries can come from medical journals, clinical studies, 
            textbooks, and expert reviews. All entries are categorized and tagged for efficient retrieval.
          </p>
          <p>
            <strong>Search Technology:</strong> Uses cosine similarity with embedding vectors to find the most 
            relevant knowledge entries for user queries and AI-generated responses.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default KnowledgeManagement;
