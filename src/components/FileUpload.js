// src/components/FileUpload.js

import React, { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config';
import '../styles/fileUpload.css';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('dermnet'); // 'dermnet', 'acne', 'hair'
  const [diagnosis, setDiagnosis] = useState('');
  const [confidence, setConfidence] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState('');
  const [geminiAdvice, setGeminiAdvice] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDiagnosis('');
    setConfidence('');
    setError('');
  };

  const handleModeChange = (e) => {
    setMode(e.target.value);
    setDiagnosis('');
    setConfidence('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDiagnosis('');
    setConfidence('');
    setLoading(true);
    if (!file) {
      setError('Please select an image file.');
      setLoading(false);
      return;
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
        setGeminiAdvice(response.data.gemini_advice);
      } else if (mode === 'hair' && response.data.overlay_image) {
        setResultImage(`data:image/png;base64,${response.data.overlay_image}`);
        setGeminiAdvice(response.data.gemini_advice);
      } else {
        setDiagnosis(response.data.condition);
        setConfidence(response.data.confidence);
      }
    } catch (err) {
      setError('Failed to get diagnosis. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="file-upload-container">
      <h1>AI Skin Diagnosis</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Select Diagnosis:&nbsp;
          <select value={mode} onChange={handleModeChange}>
            <option value="dermnet">General Skin Disease</option>
            <option value="acne">Acne</option>
            <option value="hair">Hair Loss / Gender</option>
          </select>
        </label>
        <br /><br />
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Get Diagnosis'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {diagnosis && (
        <div className="result">
          <h2>Diagnosis Result</h2>
          <p><strong>Predicted Condition:</strong> {diagnosis}</p>
          {confidence && (
            <p><strong>Confidence:</strong> {(confidence * 100).toFixed(2)}%</p>
          )}
        </div>
      )}
      {resultImage && (
        <div className="result-image">
          <h2>Result Image</h2>
          <img src={resultImage} alt="Result" />
          {geminiAdvice && (
            <div className="ai-advice">
              <h3>AI Response</h3>
              <p>{geminiAdvice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;





