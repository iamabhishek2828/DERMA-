import React, { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config';
import '../styles/treatment.css';

const TreatmentOptions = () => {
  const [condition, setCondition] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdvice('');
    setError('');
    if (!condition) return;
    setLoading(true);
    try {
      const res = await axios.post(buildApiUrl('/gemini-diagnosis'), { diagnosis: condition });
      setAdvice(res.data.reply);
    } catch (err) {
      setError('Could not fetch advice. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="treatment-page">
      <div className="treatment-card">
        <h1>Treatment Options</h1>
        <p>Enter your skin condition to get AI-powered treatment advice, precautions, and food suggestions.</p>
        <form onSubmit={handleSubmit} className="treatment-form">
          <input
            type="text"
            placeholder="e.g. eczema, acne, mel, bcc, etc."
            value={condition}
            onChange={e => setCondition(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" disabled={loading || !condition}>
            {loading ? 'Loading...' : 'Get Advice'}
          </button>
        </form>
        {error && <div className="treatment-error">{error}</div>}
        {advice && (
          <div className="treatment-advice">
            <h2>Gemini's Advice</h2>
            <pre>{advice}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentOptions;
