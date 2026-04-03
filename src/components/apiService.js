import { buildApiUrl } from '../config';
import { supabaseAuth } from '../services/supabaseAuth';

const API_URL = buildApiUrl('/api/predict');

// Helper function to get auth token from Supabase
const getAuthToken = async () => {
    try {
        const { session } = await supabaseAuth.getSession();
        return session?.access_token;
    } catch (error) {
        console.error('Failed to get Supabase token:', error);
        return null;
    }
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = await getAuthToken();
    const headers = {
        ...options.headers,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Supabase-Token'] = token; // Send Supabase token to Flask backend
    }
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (response.status === 401) {
        // Token expired or invalid, redirect to login
        window.location.href = '/login';
        throw new Error('Authentication required');
    }
    
    return response;
};

export const getPrediction = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await makeAuthenticatedRequest(API_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
};

// RAG Chat API
export const sendChatMessage = async (message) => {
    const response = await makeAuthenticatedRequest(buildApiUrl('/api/rag/chat'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error('Chat request failed');
    }

    return await response.json();
};

// PubMed Search API
export const searchPubMed = async (query, maxResults = 5) => {
    const response = await makeAuthenticatedRequest(
        buildApiUrl(`/pubmed-search?q=${encodeURIComponent(query)}&max=${maxResults}`)
    );

    if (!response.ok) {
        throw new Error('PubMed search failed');
    }

    return await response.json();
};
