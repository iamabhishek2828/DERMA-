// src/components/SymptomChecker.js
import React, { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config';

const SymptomChecker = () => {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    const res = await axios.post(buildApiUrl('/symptom-checker'), { symptoms });
    setResult(res.data.result);
    setLoading(false);
  };

  return (
    <div className="symptom-checker">
      <h2>AI Symptom Checker</h2>
      <textarea
        rows={4}
        value={symptoms}
        onChange={e => setSymptoms(e.target.value)}
        placeholder="Describe your skin symptoms..."
      />
      <button onClick={handleCheck} disabled={loading || !symptoms}>
        {loading ? 'Checking...' : 'Check'}
      </button>
      {result && <div className="result">{result}</div>}
    </div>
  );
};

export default SymptomChecker;
