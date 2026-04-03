import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Footer from './components/Footer';
import Home from './components/Home';
import About from './components/About';
import Contact from './components/Contact';
import TreatmentOptions from './components/TreatmentOptions';
import ConnectDoctor from './components/ConnectDoctor';
import DermAiChatbot from './components/DermAiChatbot';
import Diagnosis from './components/Diagnosis';
import FileUpload from './components/FileUpload';
import SearchResults from './components/SearchResult';// Import the new upload page component
import AIDiagnosis from './components/AIDiagnosis';
import Analytics from './components/Analytics';
import './styles/global.css';
import './styles/chatbot.css';
import './styles/treatment.css';
import './styles/diagnosis.css';
import Navbar from './components/Navbar';
import BlogDetail from './components/BlogDetail';
import DoctorList from './components/DoctorList';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import PubMedSearchPage from './components/PubMedSearch';

// New RAG-Enhanced Components
import EnhancedDermAiChatbot from './components/EnhancedDermAiChatbot';
import KnowledgeManagement from './components/KnowledgeManagement';


const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          {/* Keep Header only if it does NOT contain navigation */}
          {/* <Header /> */}
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/treatment-options" element={<TreatmentOptions />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/dermai-chatbot" element={<DermAiChatbot fullscreen />} />
              <Route path="/diagnosis" element={<Diagnosis />} />
              <Route path="/search" element={<SearchResults />} />{/* Only show FileUpload here */}
              <Route path="/ai-diagnosis" element={<ProtectedRoute><AIDiagnosis /></ProtectedRoute>} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/doctor-list" element={<ProtectedRoute><DoctorList /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Google OAuth routes removed from frontend */}
            <Route path="/pubmed" element={<PubMedSearchPage />} />
            
            {/* RAG-Enhanced Routes */}
            <Route path="/enhanced-chatbot" element={<ProtectedRoute><EnhancedDermAiChatbot /></ProtectedRoute>} />
            <Route path="/knowledge-management" element={<ProtectedRoute><KnowledgeManagement /></ProtectedRoute>} />
            
            {/* Protected routes */}
            <Route path="/upload" element={<ProtectedRoute><FileUpload /></ProtectedRoute>} />
            <Route path="/connect-doctor" element={<ProtectedRoute><ConnectDoctor /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  </AuthProvider>
  );
};

export default App;





