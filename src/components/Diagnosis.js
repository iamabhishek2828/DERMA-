import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../config';

const Diagnosis = () => {
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [geminiAdvice, setGeminiAdvice] = useState('');
  const [loading, setLoading] = useState(true);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDiagnosisData = async () => {
      try {
        const response = await fetch(buildApiUrl('/diagnosis'));
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setDiagnosisData(data);
        setLoading(false);

        // Fetch Gemini advice after diagnosis is loaded
        if (data.condition) {
          setAdviceLoading(true);
          const geminiRes = await fetch(buildApiUrl('/gemini-diagnosis'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diagnosis: data.condition }),
          });
          const geminiData = await geminiRes.json();
          setGeminiAdvice(geminiData.reply);
          setAdviceLoading(false);
        }
      } catch (error) {
        setError(error.message);
        setLoading(false);
        setAdviceLoading(false);
      }
    };

    fetchDiagnosisData();
  }, []);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="diagnosis-page">
      <div className="diagnosis-card">
        <h1>Diagnosis Result</h1>
        {diagnosisData && (
          <>
            <h2>{diagnosisData.condition || "No condition detected"}</h2>
            <p>
              <strong>Confidence:</strong>{" "}
              {diagnosisData.confidence !== undefined && !isNaN(diagnosisData.confidence)
                ? (diagnosisData.confidence * 100).toFixed(2) + "%"
                : "N/A"}
            </p>
            <p>
              <strong>Details:</strong> {diagnosisData.details || "No details available."}
            </p>
          </>
        )}
        <div className="gemini-advice-section">
          <h2>Gemini's Advice</h2>
          {adviceLoading && <div className="loader">Loading advice...</div>}
          {geminiAdvice && (
            <div className="gemini-advice">
              <pre>{geminiAdvice}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Diagnosis;
