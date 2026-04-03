import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config';
import '../styles/theme.css';
import '../styles/enhanced-diagnosis.css';

const EnhancedDiagnosis = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [enhancedAnalysis, setEnhancedAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Reset previous results
      setAnalysisResult(null);
      setEnhancedAnalysis(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const analyzeImage = async () => {
    if (!uploadedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // First, get traditional ML analysis
      const formData = new FormData();
      formData.append('file', uploadedImage);

      const mlResponse = await fetch(buildApiUrl('/api/predict'), {
        method: 'POST',
        body: formData,
      });

      if (!mlResponse.ok) {
        throw new Error(`ML Analysis failed: ${mlResponse.status}`);
      }

      const mlResult = await mlResponse.json();
      setAnalysisResult(mlResult);

      // Then, enhance with RAG-based analysis
      const enhancementResponse = await fetch(buildApiUrl('/api/rag/enhanced-diagnosis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ml_prediction: mlResult.prediction || mlResult.predictions,
          confidence: mlResult.confidence || mlResult.max_confidence || 0.0,
          image_metadata: {
            filename: uploadedImage.name,
            size: uploadedImage.size,
            type: uploadedImage.type
          },
          user_id: user?.id || null
        })
      });

      if (enhancementResponse.ok) {
        const enhancedResult = await enhancementResponse.json();
        setEnhancedAnalysis(enhancedResult);
      } else {
        console.warn('RAG enhancement failed, showing ML results only');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setEnhancedAnalysis(null);
    setError(null);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    return 'Low Confidence - Consult Dermatologist';
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'mild': '#4CAF50',
      'moderate': '#FF9800',
      'severe': '#F44336',
      'unknown': '#9E9E9E'
    };
    
    return (
      <span 
        className="severity-badge"
        style={{ 
          backgroundColor: colors[severity?.toLowerCase()] || colors.unknown,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        {severity || 'Unknown'} Severity
      </span>
    );
  };

  return (
    <div className="enhanced-diagnosis-container">
      <div className="diagnosis-header">
        <div className="responsive-container">
          <h2 className="responsive-text-hero">🔬 Enhanced AI Skin Analysis</h2>
          <p className="diagnosis-subtitle responsive-text-body">
            Advanced ML + RAG-powered dermatological analysis with evidence-based insights
          </p>
        </div>
      </div>
      
      <div className="responsive-container">
        <div className="diagnosis-content">

      {/* Upload Section */}
      <div className="upload-section">
        {!imagePreview ? (
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <div className="dropzone-content">
              <div className="upload-icon">📷</div>
              <h3>Upload Skin Image for Analysis</h3>
              <p>
                {isDragActive 
                  ? "Drop your image here..." 
                  : "Drag & drop an image here, or click to select"}
              </p>
              <div className="supported-formats">
                <small>Supported: JPEG, PNG, GIF, BMP (Max: 10MB)</small>
              </div>
            </div>
          </div>
        ) : (
          <div className="image-preview-section">
            <div className="preview-container">
              <img src={imagePreview} alt="Uploaded skin" className="preview-image" />
              <button className="remove-image-btn" onClick={resetAnalysis}>✕</button>
            </div>
            
            <div className="analysis-actions">
              <button 
                className="analyze-btn primary"
                onClick={analyzeImage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <span className="loading-spinner"></span>
                    Analyzing with AI + RAG...
                  </>
                ) : (
                  <>🚀 Start Enhanced Analysis</>
                )}
              </button>
              
              <button className="reset-btn secondary" onClick={resetAnalysis}>
                🔄 Upload New Image
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div>
              <h4>Analysis Error</h4>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {(analysisResult || enhancedAnalysis) && (
        <div className="results-section">
          
          {/* Traditional ML Results */}
          {analysisResult && (
            <div className="ml-results card">
              <h3>🤖 Traditional ML Analysis</h3>
              
              <div className="prediction-summary">
                <div className="main-prediction">
                  <h4>Primary Prediction:</h4>
                  <div className="prediction-item">
                    <span className="condition-name">
                      {analysisResult.prediction || analysisResult.predictions?.[0]?.class || 'Unknown'}
                    </span>
                    <div className="confidence-container">
                      <span 
                        className="confidence-value"
                        style={{ color: getConfidenceColor(analysisResult.confidence || analysisResult.max_confidence || 0) }}
                      >
                        {Math.round((analysisResult.confidence || analysisResult.max_confidence || 0) * 100)}%
                      </span>
                      <span className="confidence-label">
                        {getConfidenceText(analysisResult.confidence || analysisResult.max_confidence || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multiple Predictions */}
                {analysisResult.predictions && analysisResult.predictions.length > 1 && (
                  <div className="all-predictions">
                    <h4>All Possibilities:</h4>
                    <div className="predictions-list">
                      {analysisResult.predictions.slice(0, 5).map((pred, index) => (
                        <div key={index} className="prediction-item minor">
                          <span className="condition-name">{pred.class}</span>
                          <span className="confidence-value">
                            {Math.round(pred.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced RAG Analysis */}
          {enhancedAnalysis && (
            <div className="rag-results card">
              <h3>🧠 Enhanced RAG Analysis</h3>
              
              <div className="enhanced-summary">
                <div className="condition-overview">
                  <h4>📋 Medical Overview</h4>
                  <div className="overview-content">
                    <p>{enhancedAnalysis.medical_overview}</p>
                    
                    <div className="condition-metadata">
                      {enhancedAnalysis.severity && getSeverityBadge(enhancedAnalysis.severity)}
                      {enhancedAnalysis.urgency && (
                        <span className="urgency-indicator">
                          ⚡ {enhancedAnalysis.urgency} Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Symptoms and Characteristics */}
                {enhancedAnalysis.symptoms && enhancedAnalysis.symptoms.length > 0 && (
                  <div className="symptoms-section">
                    <h4>🔍 Common Symptoms & Characteristics</h4>
                    <ul className="symptoms-list">
                      {enhancedAnalysis.symptoms.map((symptom, index) => (
                        <li key={index}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Treatment Recommendations */}
                {enhancedAnalysis.treatment_recommendations && enhancedAnalysis.treatment_recommendations.length > 0 && (
                  <div className="treatment-section">
                    <h4>💊 Evidence-Based Treatment Options</h4>
                    <div className="treatments-grid">
                      {enhancedAnalysis.treatment_recommendations.map((treatment, index) => (
                        <div key={index} className="treatment-item">
                          <h5>{treatment.category}</h5>
                          <p>{treatment.description}</p>
                          {treatment.effectiveness && (
                            <span className="effectiveness">
                              Effectiveness: {treatment.effectiveness}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prevention Tips */}
                {enhancedAnalysis.prevention_tips && enhancedAnalysis.prevention_tips.length > 0 && (
                  <div className="prevention-section">
                    <h4>🛡️ Prevention & Care Tips</h4>
                    <ul className="prevention-list">
                      {enhancedAnalysis.prevention_tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* When to See Doctor */}
                {enhancedAnalysis.when_to_see_doctor && (
                  <div className="doctor-advice-section">
                    <h4>🏥 When to Consult a Dermatologist</h4>
                    <div className="doctor-advice">
                      <p>{enhancedAnalysis.when_to_see_doctor}</p>
                    </div>
                  </div>
                )}

                {/* Medical Sources */}
                {enhancedAnalysis.sources && enhancedAnalysis.sources.length > 0 && (
                  <div className="sources-section">
                    <h4>📚 Medical Literature Sources</h4>
                    <div className="sources-list">
                      {enhancedAnalysis.sources.map((source, index) => (
                        <div key={index} className="source-item">
                          <div className="source-header">
                            <span className="source-title">
                              {source.metadata?.title || 'Medical Literature'}
                            </span>
                            <span className="relevance-score">
                              {Math.round(source.relevance * 100)}% relevant
                            </span>
                          </div>
                          <div className="source-meta">
                            <span className="source-type">{source.source}</span>
                            <span className="source-category">{source.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Metrics */}
                <div className="confidence-metrics">
                  <div className="metric">
                    <span className="metric-label">RAG Confidence:</span>
                    <span 
                      className="metric-value"
                      style={{ color: getConfidenceColor(enhancedAnalysis.confidence || 0) }}
                    >
                      {Math.round((enhancedAnalysis.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Sources Consulted:</span>
                    <span className="metric-value">
                      {enhancedAnalysis.sources?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Important Disclaimer */}
          <div className="medical-disclaimer">
            <div className="disclaimer-content">
              <span className="disclaimer-icon">⚠️</span>
              <div>
                <h4>Important Medical Disclaimer</h4>
                <p>
                  This AI analysis is for educational purposes only and should not replace professional medical advice. 
                  Always consult a qualified dermatologist for accurate diagnosis and treatment recommendations, 
                  especially for concerning skin changes or symptoms.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDiagnosis;
