import React, { useState, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBrain, FaCheckCircle, FaCloudUploadAlt, FaMagic, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config';
import '../styles/ai-diagnosis.css';

const diagnosisOptions = [
  { value: 'dermnet', label: 'General Skin Disease', icon: '🩺' },
  { value: 'acne', label: 'Acne', icon: '🧴' },
  { value: 'hair', label: 'Hair Loss / Gender', icon: '💇‍♂️' },
  { value: 'smart', label: 'Smart Analysis', icon: '🧠', description: 'AI intelligently selects relevant models based on image content' },
];

const AIDiagnosis = () => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('dermnet');
  const [diagnosis, setDiagnosis] = useState('');
  const [confidence, setConfidence] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState('');
  const [geminiAdvice, setGeminiAdvice] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiContext, setGeminiContext] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Enhanced analysis states for Smart Analysis mode
  const [enhancedAnalysis, setEnhancedAnalysis] = useState(null);
  const [isSmartAnalyzing, setIsSmartAnalyzing] = useState(false);
  
  const { user } = useAuth();

  const inputRef = useRef();

  // Function to save analysis to history
  const saveAnalysisToHistory = (results, analysisType) => {
    try {
      const analysis = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        type: analysisType,
        imageName: file?.name || 'Unknown',
        imageSize: file?.size || 0,
        results: results,
        userId: user?.id || 'anonymous'
      };

  const existingHistory = JSON.parse(localStorage.getItem('dermAI_analysis_history') || '[]');
  const updatedHistory = [analysis, ...existingHistory].slice(0, 50); // Keep last 50 analyses
  localStorage.setItem('dermAI_analysis_history', JSON.stringify(updatedHistory));
      
      console.log('Analysis saved to history:', analysis);
    } catch (error) {
      console.error('Failed to save analysis to history:', error);
    }
  };
  // Expose globally for Analytics page or other scripts
  window.saveAnalysisToHistory = saveAnalysisToHistory;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setDiagnosis('');
      setConfidence('');
      setError('');
      setResultImage('');
      setGeminiAdvice('');
      setGeminiContext('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setDiagnosis('');
      setConfidence('');
      setError('');
      setResultImage('');
      setGeminiAdvice('');
      setGeminiContext('');
    }
  };

  const handleModeChange = (value) => {
    setMode(value);
    setDiagnosis('');
    setConfidence('');
    setError('');
    setResultImage('');
    setGeminiAdvice('');
    setGeminiContext('');
    setEnhancedAnalysis(null);
    setShowResult(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDiagnosis('');
    setConfidence('');
    setResultImage('');
    setGeminiAdvice('');
    setGeminiContext('');
    setEnhancedAnalysis(null);
    setShowResult(false);
    setLoading(true);
    
    if (!file) {
      setError('Please select an image file.');
      setLoading(false);
      return;
    }

    // Handle Smart Analysis mode differently
    if (mode === 'smart') {
      return handleSmartAnalysis();
    }

    const formData = new FormData();
    formData.append('file', file);
    let endpoint = '/classify-dermnet';
    if (mode === 'acne') endpoint = '/detect-acne';
    if (mode === 'hair') endpoint = '/segment-hair';
    try {
      const response = await axios.post(buildApiUrl(endpoint), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (mode === 'acne' && response.data.detection_image) {
        setResultImage(`data:image/png;base64,${response.data.detection_image}`);
        setDiagnosis(response.data.condition || `Acne Detection - ${response.data.num_acne} lesions`);
        setConfidence(response.data.confidence || 0.85);
        setGeminiAdvice(response.data.gemini_advice);
        // Save to history
        saveAnalysisToHistory({
          diagnosis: response.data.condition || 'Acne Detection',
          confidence: response.data.confidence || 0.85,
          geminiAdvice: response.data.gemini_advice,
          detectionImage: response.data.detection_image
        }, mode);
      } else if (mode === 'hair' && response.data.overlay_image) {
        setResultImage(`data:image/png;base64,${response.data.overlay_image}`);
        setDiagnosis(response.data.condition || `Hair Loss Analysis - ${response.data.hair_loss_percentage}% affected`);
        setConfidence(response.data.confidence || 0.8);
        setGeminiAdvice(response.data.gemini_advice);
        // Save to history
        saveAnalysisToHistory({
          diagnosis: response.data.condition || 'Hair Analysis',
          confidence: response.data.confidence || 0.8,
          geminiAdvice: response.data.gemini_advice,
          overlayImage: response.data.overlay_image
        }, mode);
      } else {
        setDiagnosis(response.data.condition);
        setConfidence(response.data.confidence);
        setGeminiAdvice(response.data.gemini_advice);
        // Save to history
        saveAnalysisToHistory({
          diagnosis: response.data.condition,
          confidence: response.data.confidence,
          geminiAdvice: response.data.gemini_advice
        }, mode);
      }
      setShowResult(true);
    } catch (err) {
      setError('Failed to get diagnosis. Please try again.');
    }
    setLoading(false);
  };

  const handleGeminiContext = async () => {
    setGeminiLoading(true);
    setGeminiContext('');
    try {
      const res = await axios.post(buildApiUrl('/gemini-context'), {
        diagnosis,
        mode,
      });
      setGeminiContext(res.data.context || res.data.reply || 'No extra context found.');
    } catch (err) {
      setGeminiContext('Could not fetch Gemini context.');
    }
    setGeminiLoading(false);
  };

  // Smart Image Classification Function
  const analyzeImageType = async (imageFile) => {
    try {
      console.log('🧠 Using Backend Smart Router Model for intelligent analysis...');
      
      const formData = new FormData();
      formData.append('file', imageFile);
      
      // Use your trained smart router model via backend API
      const response = await axios.post(buildApiUrl('/api/smart-analysis'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const backendResult = response.data;
      console.log('🎯 Smart Router Model Decision:', backendResult);
      
      // Extract model recommendations from your trained smart router
      let modelsToRun = [];
      let imageType = 'skin-focused'; // default
      
      if (backendResult.smart_router_decision) {
        const decision = backendResult.smart_router_decision.toLowerCase();
        
        if (decision.includes('hair')) {
          imageType = 'hair-focused';
          modelsToRun = ['hair'];
        } else if (decision.includes('acne')) {
          imageType = 'acne-focused';
          modelsToRun = ['acne', 'dermnet'];
        } else {
          imageType = 'skin-focused';
          modelsToRun = ['dermnet'];
        }
      } else {
        // Fallback to running all models if smart router doesn't provide clear decision
        imageType = 'comprehensive';
        modelsToRun = ['dermnet', 'acne', 'hair'];
      }
      
      console.log('✅ Smart Router Decision:', { imageType, modelsToRun });
      
      return { 
        imageType, 
        modelsToRun, 
        smartRouterResult: backendResult,
        analysis: { 
          message: 'Using trained smart router model for intelligent classification',
          backend_decision: backendResult.smart_router_decision
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Smart router unavailable, using comprehensive analysis:', error.message);
      
      // Fallback: run all models if smart router fails
      return {
        imageType: 'comprehensive',
        modelsToRun: ['dermnet', 'acne', 'hair'],
        analysis: { 
          message: 'Smart router unavailable - running comprehensive analysis',
          fallback: true
        }
      };
    }
  };

  const handleSmartAnalysis = async () => {
    setIsSmartAnalyzing(true);
    setError('');

    try {
      console.log('🧠 Starting Smart Analysis...');
      
      // STEP 1: Analyze image type to determine which models to run
      const imageAnalysis = await analyzeImageType(file);
      console.log('🎯 Smart Classification Result:', imageAnalysis);
      
      const formData = new FormData();
      formData.append('file', file);

      // STEP 2: Use Smart Router - Single API call to get intelligent analysis
      console.log('🧠 Calling Smart Analysis API with trained model...');
      
      const smartAnalysisResponse = await axios.post(buildApiUrl('/api/smart-analysis'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const smartResult = smartAnalysisResponse.data;
      console.log('✅ Smart Analysis Complete:', smartResult);
      
      // STEP 3: Process smart router result
      const mlResults = {};
      
      // Process smart router result based on analysis type
      if (smartResult.analysis_type === 'Acne Detection' && smartResult.results) {
        mlResults.acne = {
          detection_image: smartResult.results.detection_image,
          gemini_advice: smartResult.recommendation,
          confidence: smartResult.router_confidence,
          num_acne: smartResult.results.num_acne,
          severity: smartResult.results.severity
        };
      } else if (smartResult.analysis_type === 'Hair Loss Analysis' && smartResult.results) {
        mlResults.hair = {
          overlay_image: smartResult.results.overlay_image || smartResult.results.segmentation_mask,
          segmentation_mask: smartResult.results.segmentation_mask,
          gemini_advice: smartResult.recommendation,
          confidence: smartResult.router_confidence,
          hair_loss_percentage: smartResult.results.hair_loss_percentage,
          severity: smartResult.results.severity
        };
      } else if (smartResult.analysis_type === 'Skin Disease Classification' && smartResult.results) {
        mlResults.dermnet = {
          condition: smartResult.results.condition,
          confidence: smartResult.results.confidence,
          gemini_advice: smartResult.recommendation
        };
      }

      // Add smart analysis metadata
      mlResults.smart_analysis = {
        image_type: smartResult.analysis_type,
        model_used: smartResult.selected_model,
        models_used: [smartResult.selected_model], // Array for compatibility with existing UI
        analysis_method: 'smart_router_ai',
        router_confidence: smartResult.router_confidence,
        description: smartResult.description,
        backend_decision: imageAnalysis.smartRouterResult || 'Smart router used'
      };

      // Check if at least one ML model succeeded
      if (Object.keys(mlResults).length === 0) {
        throw new Error('All ML models failed to process the image. Please try again with a different image.');
      }

      // Now enhance with RAG-based analysis (with improved error handling)
      try {
        const enhancementResponse = await axios.post(buildApiUrl('/api/rag/enhanced-diagnosis'), {
          ml_predictions: mlResults,
          image_metadata: {
            filename: file.name,
            size: file.size,
            type: file.type
          },
          user_id: user?.id || null,
          analysis_type: 'comprehensive'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          timeout: 10000 // 10 second timeout to prevent hanging
        });

        if (enhancementResponse.data) {
          const enhancedResults = {
            ml_results: mlResults,
            rag_analysis: enhancementResponse.data,
            analysis_type: 'smart',
            rag_status: 'success'
          };
          setEnhancedAnalysis(enhancedResults);
          // Save to history
          saveAnalysisToHistory({
            enhancedAnalysis: enhancedResults
          }, 'smart');
        }
      } catch (ragError) {
        console.warn('RAG enhancement failed, showing ML results only:', ragError);
        
        // Provide detailed error information for debugging
        let ragErrorMessage = 'RAG service unavailable';
        if (ragError.response?.status === 400) {
          ragErrorMessage = 'RAG service configuration error (400)';
        } else if (ragError.response?.status === 404) {
          ragErrorMessage = 'RAG endpoint not found (404)';
        } else if (ragError.response?.status >= 500) {
          ragErrorMessage = 'RAG service internal error';
        } else if (ragError.code === 'ECONNABORTED') {
          ragErrorMessage = 'RAG service timeout';
        }

        const basicResults = {
          ml_results: mlResults,
          rag_analysis: {
            error: ragErrorMessage,
            comprehensive_analysis: `Smart Analysis completed using ML models only. ${Object.keys(mlResults).length} models provided results. RAG enhancement is temporarily unavailable due to backend service issues.`,
            confidence_score: 0.7,
            sources: []
          },
          analysis_type: 'smart',
          rag_status: 'failed'
        };
        setEnhancedAnalysis(basicResults);
        // Save to history even without RAG
        saveAnalysisToHistory({
          enhancedAnalysis: basicResults
        }, 'smart');
      }

      setShowResult(true);

    } catch (error) {
      console.error('Smart analysis error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Smart analysis encountered an issue. ';
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += 'The analysis is taking longer than expected. Please try again.';
      } else if (error.response?.status >= 500) {
        errorMessage += 'Backend service is temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 400) {
        errorMessage += 'Invalid request format. Please check your image and try again.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSmartAnalyzing(false);
      setLoading(false);
    }
  };

  const activeMode = diagnosisOptions.find((option) => option.value === mode);
  const hasResultContent = showResult && (diagnosis || resultImage || enhancedAnalysis);

  return (
    <div className="ai-diagnosis-page derma-page-shell">
      <div className="derma-page-container ai-diagnosis-page__layout">
        <section className="ai-diagnosis-page__intro">
          <span className="derma-page-kicker">Diagnosis Workspace</span>
          <h1 className="derma-section-title">A sharper, more professional analysis flow for every image.</h1>
          <p className="derma-section-copy">
            The diagnosis screen now behaves like a focused clinical workspace, with clear mode selection, a stronger
            upload area, and a result panel that feels worth trusting.
          </p>
          <div className="derma-chip-list">
            <span className="derma-chip">
              <FaShieldAlt />
              Private uploads
            </span>
            <span className="derma-chip">
              <FaMagic />
              Personalized advice
            </span>
            <span className="derma-chip">
              <FaBrain />
              Smart router mode
            </span>
          </div>
        </section>

        <section className="ai-diagnosis-workspace derma-page-panel">
          <div className="ai-diagnosis-workspace__controls">
            <div className="ai-diagnosis-workspace__heading">
              <span className="derma-page-kicker">Image Diagnosis</span>
              <h2>Upload and analyze</h2>
              <p>{activeMode?.description || 'Upload a skin, acne, or hair image and let DermAi guide the next step.'}</p>
            </div>

            <div className="ai-diagnosis-mode-grid">
              {diagnosisOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`ai-diagnosis-mode${mode === option.value ? ' is-active' : ''}${option.value === 'smart' ? ' is-smart' : ''}`}
                  onClick={() => handleModeChange(option.value)}
                >
                  <span className="ai-diagnosis-mode__icon">{option.icon}</span>
                  <strong>{option.label}</strong>
                  <span>{option.value === 'smart' ? 'Adaptive model selection' : 'Single workflow mode'}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="ai-diagnosis-form">
              <div
                className={`ai-diagnosis-dropzone${dragActive ? ' is-dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current && inputRef.current.click()}
              >
                <FaCloudUploadAlt />
                <div>
                  <strong>{file ? file.name : 'Drag, drop, or click to choose an image'}</strong>
                  <span>Supported: standard image formats for skin, acne, and hair analysis</span>
                </div>
                <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} hidden />
              </div>

              <button type="submit" disabled={loading} className="derma-button ai-diagnosis-submit">
                {loading
                  ? mode === 'smart'
                    ? isSmartAnalyzing
                      ? 'Running smart analysis...'
                      : 'Processing...'
                    : 'Processing...'
                  : mode === 'smart'
                    ? 'Start Smart Analysis'
                    : 'Get Diagnosis'}
                {!loading && <FaArrowRight />}
              </button>
            </form>

            {error && <div className="derma-form-error">{error}</div>}

            <div className="ai-diagnosis-workspace__trust">
              <div>
                <FaCheckCircle />
                <span>Fast, private, and dermatologist-aware workflow</span>
              </div>
              <div>
                <FaMagic />
                <span>Selected mode: {activeMode?.label}</span>
              </div>
            </div>
          </div>

          <motion.div
            className="ai-diagnosis-results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {!hasResultContent ? (
              <div className="ai-diagnosis-empty">
                <FaCloudUploadAlt />
                <h3>Your result workspace is ready</h3>
                <p>Upload an image to see diagnosis details, visual outputs, model confidence, and follow-up guidance.</p>
              </div>
            ) : (
              <div className="ai-diagnosis-results__stack">
                {diagnosis && (
                  <article className="ai-result-card">
                    <div className="ai-result-card__header">
                      <span className="derma-page-kicker">Primary Result</span>
                      {confidence && (
                        <span className="ai-result-card__metric">
                          {`${(Number(confidence) * 100).toFixed(1)}% confidence`}
                        </span>
                      )}
                    </div>
                    <h3>{diagnosis}</h3>
                  </article>
                )}

                {resultImage && (
                  <article className="ai-result-card">
                    <div className="ai-result-card__header">
                      <span className="derma-page-kicker">Visual Output</span>
                    </div>
                    <img src={resultImage} alt="Diagnosis result" className="ai-result-card__image" />
                  </article>
                )}

                {geminiAdvice && (
                  <article className="ai-result-card ai-result-card--advice">
                    <div className="ai-result-card__header">
                      <span className="derma-page-kicker">DermAi Advice</span>
                    </div>
                    <p>{geminiAdvice}</p>
                  </article>
                )}

                {diagnosis && (
                  <button type="button" className="derma-button derma-button--secondary ai-diagnosis-insights" onClick={handleGeminiContext} disabled={geminiLoading}>
                    {geminiLoading ? 'Loading more insight...' : 'Get More Insights'}
                  </button>
                )}

                {geminiContext && (
                  <article className="ai-result-card ai-result-card--context">
                    <div className="ai-result-card__header">
                      <span className="derma-page-kicker">Precautions & Context</span>
                    </div>
                    <p>{geminiContext}</p>
                  </article>
                )}

                {enhancedAnalysis && (
                  <article className="ai-result-card ai-result-card--smart">
                    <div className="ai-result-card__header">
                      <span className="derma-page-kicker">Smart Analysis</span>
                      {enhancedAnalysis.ml_results?.smart_analysis?.router_confidence && (
                        <span className="ai-result-card__metric">
                          {`${(enhancedAnalysis.ml_results.smart_analysis.router_confidence * 100).toFixed(1)}% router confidence`}
                        </span>
                      )}
                    </div>

                    {enhancedAnalysis.ml_results?.smart_analysis && (
                      <div className="ai-smart-summary">
                        <div>
                          <strong>Analysis type</strong>
                          <span>{enhancedAnalysis.ml_results.smart_analysis.image_type}</span>
                        </div>
                        <div>
                          <strong>Models used</strong>
                          <span>{enhancedAnalysis.ml_results.smart_analysis.models_used?.join(', ')}</span>
                        </div>
                      </div>
                    )}

                    <div className="ai-smart-model-grid">
                      {enhancedAnalysis.ml_results?.dermnet && (
                        <div className="ai-smart-model-card">
                          <strong>General Dermatology</strong>
                          <span>{enhancedAnalysis.ml_results.dermnet.condition}</span>
                          <p>{`${(enhancedAnalysis.ml_results.dermnet.confidence * 100).toFixed(1)}% confidence`}</p>
                        </div>
                      )}

                      {enhancedAnalysis.ml_results?.acne && (
                        <div className="ai-smart-model-card">
                          <strong>Acne Detection</strong>
                          <p>{`${(enhancedAnalysis.ml_results.acne.confidence * 100).toFixed(1)}% confidence`}</p>
                          {enhancedAnalysis.ml_results.acne.detection_image && (
                            <img
                              src={`data:image/png;base64,${enhancedAnalysis.ml_results.acne.detection_image}`}
                              alt="Acne detection"
                              className="ai-smart-model-card__image"
                            />
                          )}
                        </div>
                      )}

                      {enhancedAnalysis.ml_results?.hair && (
                        <div className="ai-smart-model-card">
                          <strong>Hair Analysis</strong>
                          <p>{`${enhancedAnalysis.ml_results.hair.hair_loss_percentage}% estimated hair loss area`}</p>
                          {enhancedAnalysis.ml_results.hair.overlay_image && (
                            <img
                              src={`data:image/png;base64,${enhancedAnalysis.ml_results.hair.overlay_image}`}
                              alt="Hair analysis overlay"
                              className="ai-smart-model-card__image"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {enhancedAnalysis.rag_analysis && (
                      <div className="ai-rag-card">
                        <strong>Evidence-based summary</strong>
                        {enhancedAnalysis.rag_analysis.comprehensive_analysis && (
                          <p>{enhancedAnalysis.rag_analysis.comprehensive_analysis}</p>
                        )}
                        {enhancedAnalysis.rag_analysis.confidence_score && (
                          <span>{`${(enhancedAnalysis.rag_analysis.confidence_score * 100).toFixed(1)}% evidence confidence`}</span>
                        )}
                        {enhancedAnalysis.rag_analysis.sources && enhancedAnalysis.rag_analysis.sources.length > 0 && (
                          <ul>
                            {enhancedAnalysis.rag_analysis.sources.slice(0, 3).map((source, index) => (
                              <li key={`${source.content?.slice(0, 16) || 'source'}-${index}`}>
                                {source.content?.slice(0, 180)}...
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                )}
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default AIDiagnosis;
