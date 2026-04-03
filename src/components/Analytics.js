import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import {
  FaArrowRight,
  FaBrain,
  FaChartLine,
  FaClock,
  FaMagic,
  FaShieldAlt,
} from 'react-icons/fa';

import { useAuth } from '../contexts/AuthContext';
import '../styles/analytics.css';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, ArcElement, BarElement);

const getAnalysisMeta = (type) => {
  const normalized = String(type || '').toLowerCase();

  if (normalized.includes('smart')) {
    return { label: 'Smart Analysis', icon: '🧠', tone: 'smart' };
  }

  if (normalized.includes('acne')) {
    return { label: 'Acne Analysis', icon: '🧴', tone: 'acne' };
  }

  if (normalized.includes('hair')) {
    return { label: 'Hair Analysis', icon: '💇‍♂️', tone: 'hair' };
  }

  return { label: 'General Analysis', icon: '🩺', tone: 'general' };
};

const getEnhancedResults = (analysis) => analysis?.results?.enhancedAnalysis || null;

const getPrimaryConfidence = (analysis) => {
  const values = [
    analysis?.results?.confidence,
    getEnhancedResults(analysis)?.ml_results?.dermnet?.confidence,
    getEnhancedResults(analysis)?.ml_results?.acne?.confidence,
    getEnhancedResults(analysis)?.ml_results?.hair?.confidence,
    getEnhancedResults(analysis)?.rag_analysis?.confidence_score,
  ];

  const match = values.find((value) => Number.isFinite(Number(value)));
  return match === undefined ? null : Number(match);
};

const getConditionList = (analysis) => {
  const conditions = new Set();
  const results = analysis?.results || {};
  const enhanced = getEnhancedResults(analysis);
  const mlResults = enhanced?.ml_results || {};

  if (results.diagnosis) {
    conditions.add(results.diagnosis);
  }

  if (results.condition) {
    conditions.add(results.condition);
  }

  if (mlResults.dermnet?.condition) {
    conditions.add(mlResults.dermnet.condition);
  }

  if (mlResults.acne) {
    conditions.add('Acne Detection');
  }

  if (mlResults.hair) {
    conditions.add('Hair Analysis');
  }

  return Array.from(conditions);
};

const getPrimaryCondition = (analysis) => {
  const conditions = getConditionList(analysis);
  return conditions[0] || 'Analysis completed';
};

const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildStatistics = (history) => {
  if (!history.length) {
    return null;
  }

  const stats = {
    totalAnalyses: history.length,
    analysisTypes: {},
    conditionsDetected: {},
    averageConfidence: 0,
    recentActivity: [...history]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 4),
  };

  let confidenceSum = 0;
  let confidenceCount = 0;

  history.forEach((analysis) => {
    const meta = getAnalysisMeta(analysis.type || analysis.mode);
    stats.analysisTypes[meta.label] = (stats.analysisTypes[meta.label] || 0) + 1;

    getConditionList(analysis).forEach((condition) => {
      stats.conditionsDetected[condition] = (stats.conditionsDetected[condition] || 0) + 1;
    });

    const confidence = getPrimaryConfidence(analysis);
    if (confidence !== null) {
      confidenceSum += confidence;
      confidenceCount += 1;
    }
  });

  stats.averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
  return stats;
};

const buildTrendData = (history) =>
  [...history]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-10)
    .map((analysis, index) => ({
      id: analysis.id || index,
      label: new Date(analysis.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      date: formatDateTime(analysis.timestamp),
      condition: getPrimaryCondition(analysis),
      confidence: getPrimaryConfidence(analysis) ?? 0,
    }));

const createSampleHistory = (userId) => [
  {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    userId,
    type: 'smart',
    results: {
      confidence: 0.87,
      enhancedAnalysis: {
        ml_results: {
          dermnet: { condition: 'Healthy Skin', confidence: 0.87, gemini_advice: 'Maintain hydration and consistent SPF use.' },
          acne: { confidence: 0.74, gemini_advice: 'No significant acne activity detected.' },
        },
        rag_analysis: {
          comprehensive_analysis: 'Your recent scans suggest stable skin with low visible inflammation and no urgent dermatological signals.',
          confidence_score: 0.83,
          sources: [],
        },
        rag_status: 'success',
      },
    },
    imageName: 'sample-scan-01.jpg',
    imageSize: 912400,
  },
  {
    id: Date.now() + 1,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    userId,
    type: 'dermnet',
    results: {
      diagnosis: 'Mild Irritation',
      confidence: 0.72,
      geminiAdvice: 'Keep the area moisturized and monitor any worsening redness.',
    },
    imageName: 'sample-scan-02.jpg',
    imageSize: 845320,
  },
];

const Analytics = ({ userId }) => {
  const [trends, setTrends] = useState([]);
  const [geminiSummary, setGeminiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);

  const { user } = useAuth();

  const hydrateAnalyticsState = useCallback((history) => {
    const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAnalysisHistory(sortedHistory);
    setStatisticsData(buildStatistics(sortedHistory));
    setTrends(buildTrendData(sortedHistory));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);

      try {
        const storedHistory = JSON.parse(localStorage.getItem('dermAI_analysis_history') || '[]');
        const filteredHistory = storedHistory.filter((analysis) => !user?.id || analysis.userId === user.id);
        hydrateAnalyticsState(filteredHistory);
      } catch (error) {
        console.error('Analytics data fetch error:', error);
        hydrateAnalyticsState([]);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [userId, user, hydrateAnalyticsState]);

  const saveAnalysisToHistory = useCallback(
    (analysisData) => {
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        userId: user?.id || 'guest',
        type: analysisData.type || analysisData.mode,
        results: analysisData.results,
        imageName: analysisData.imageName,
        imageSize: analysisData.imageSize,
      };

      const existingHistory = JSON.parse(localStorage.getItem('dermAI_analysis_history') || '[]');
      const updatedHistory = [historyEntry, ...existingHistory].slice(0, 100);
      localStorage.setItem('dermAI_analysis_history', JSON.stringify(updatedHistory));

      const filteredHistory = updatedHistory.filter((analysis) => !user?.id || analysis.userId === user.id);
      hydrateAnalyticsState(filteredHistory);
    },
    [user, hydrateAnalyticsState]
  );

  useEffect(() => {
    window.saveAnalysisToHistory = saveAnalysisToHistory;
    return () => {
      delete window.saveAnalysisToHistory;
    };
  }, [saveAnalysisToHistory]);

  const handleGeminiAnalyze = async () => {
    setLoading(true);
    setGeminiSummary('');

    try {
      if (analysisHistory.length > 0) {
        const latest =
          analysisHistory.find(
            (item) =>
              item.results?.enhancedAnalysis?.rag_analysis?.comprehensive_analysis ||
              item.results?.enhancedAnalysis?.ml_results?.dermnet?.gemini_advice ||
              item.results?.geminiAdvice
          ) || analysisHistory[0];

        const advice =
          latest.results?.enhancedAnalysis?.rag_analysis?.comprehensive_analysis ||
          latest.results?.enhancedAnalysis?.ml_results?.dermnet?.gemini_advice ||
          latest.results?.geminiAdvice ||
          '';

        setGeminiSummary(
          advice || 'No Gemini or evidence-layer advice was found in your most recent analysis yet.'
        );
      } else {
        setGeminiSummary(
          'Start using the diagnosis workspace to build your analytics history. Once scans are available, DermAi can summarize recent trends and advice here.'
        );
      }
    } catch (error) {
      console.warn('Gemini analytics error:', error);
      setGeminiSummary(
        'Analytics insights are generated from your stored analysis history. Use AI Diagnosis to build a stronger dataset over time.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddSampleData = () => {
    const sampleHistory = createSampleHistory(user?.id || 'test-user');
    localStorage.setItem('dermAI_analysis_history', JSON.stringify(sampleHistory));
    hydrateAnalyticsState(sampleHistory);
    setGeminiSummary('');
  };

  const chartData = {
    labels: trends.map((trend) => trend.label),
    datasets: [
      {
        label: 'Confidence',
        data: trends.map((trend) => Number((trend.confidence * 100).toFixed(1))),
        fill: true,
        borderColor: '#2f6df6',
        backgroundColor: 'rgba(47, 109, 246, 0.12)',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#1bb5d8',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 46, 0.92)',
        padding: 12,
        titleColor: '#ffffff',
        bodyColor: '#eaf1ff',
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#5e6d89' },
        grid: { color: 'rgba(111, 134, 182, 0.12)' },
      },
      x: {
        ticks: { color: '#5e6d89' },
        grid: { display: false },
      },
    },
  };

  const statCards = [
    {
      label: 'Total analyses',
      value: statisticsData?.totalAnalyses || 0,
      tone: 'blue',
    },
    {
      label: 'Conditions tracked',
      value: statisticsData ? Object.keys(statisticsData.conditionsDetected).length : 0,
      tone: 'pink',
    },
    {
      label: 'Average confidence',
      value: `${((statisticsData?.averageConfidence || 0) * 100).toFixed(1)}%`,
      tone: 'cyan',
    },
    {
      label: 'Analysis types',
      value: statisticsData ? Object.keys(statisticsData.analysisTypes).length : 0,
      tone: 'gold',
    },
  ];

  const selectedMeta = selectedAnalysis ? getAnalysisMeta(selectedAnalysis.type) : null;
  const selectedEnhanced = selectedAnalysis ? getEnhancedResults(selectedAnalysis) : null;

  return (
    <div className="analytics-page derma-page-shell">
      <div className="derma-page-container analytics-page__layout">
        <section className="analytics-hero">
          <div className="analytics-hero__copy">
            <span className="derma-page-kicker">Analytics</span>
            <h1 className="derma-section-title">Skin health analytics that finally feel like part of the product.</h1>
            <p className="derma-section-copy">
              This page now reads as a professional dashboard, with cleaner hierarchy for your history, confidence
              trends, and evidence-backed summaries.
            </p>
            <div className="derma-chip-list">
              <span className="derma-chip">
                <FaChartLine />
                Confidence tracking
              </span>
              <span className="derma-chip">
                <FaBrain />
                AI summary layer
              </span>
              <span className="derma-chip">
                <FaShieldAlt />
                Private local history
              </span>
            </div>
          </div>

          <aside className="analytics-hero__aside derma-page-panel">
            <div className="analytics-hero__aside-card">
              <strong>Recent activity</strong>
              {statisticsData?.recentActivity?.length ? (
                <ul>
                  {statisticsData.recentActivity.map((analysis) => (
                    <li key={analysis.id}>
                      <span>{getAnalysisMeta(analysis.type).label}</span>
                      <small>{formatDateTime(analysis.timestamp)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No analysis history yet. Start with the diagnosis workspace.</p>
              )}
            </div>
          </aside>
        </section>

        <section className="analytics-stats-grid">
          {statCards.map((card) => (
            <article key={card.label} className={`analytics-stat-card analytics-stat-card--${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </section>

        {statisticsData && Object.keys(statisticsData.conditionsDetected).length > 0 && (
          <section className="analytics-condition-strip derma-page-panel">
            <div className="analytics-condition-strip__header">
              <span className="derma-page-kicker">Condition Distribution</span>
              <h2>Conditions appearing across your saved analysis history</h2>
            </div>
            <div className="analytics-condition-strip__chips">
              {Object.entries(statisticsData.conditionsDetected).map(([condition, count]) => (
                <span key={condition}>{`${condition} · ${count}`}</span>
              ))}
            </div>
          </section>
        )}

        <div className="analytics-main-grid">
          <section className="analytics-history derma-page-panel">
            <div className="analytics-panel-heading">
              <div>
                <span className="derma-page-kicker">Analysis History</span>
                <h2>Detailed saved reports</h2>
              </div>
              <p>Open any saved entry to review the full report, model outputs, and advice.</p>
            </div>

            {fetching ? (
              <div className="analytics-empty-state">
                <div className="analytics-empty-state__icon">⏳</div>
                <h3>Loading your analytics history</h3>
                <p>DermAi is preparing the dashboard data for this account.</p>
              </div>
            ) : analysisHistory.length === 0 ? (
              <div className="analytics-empty-state">
                <div className="analytics-empty-state__icon">📸</div>
                <h3>No saved analysis history yet</h3>
                <p>Upload and analyze images in AI Diagnosis to populate this dashboard with real results.</p>
                <div className="analytics-empty-state__actions">
                  <button type="button" className="derma-button derma-button--secondary" onClick={handleAddSampleData}>
                    Add Sample Data
                  </button>
                  <Link to="/ai-diagnosis" className="derma-button">
                    Start Analysis
                    <FaArrowRight />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="analytics-history-list">
                {analysisHistory.map((analysis, index) => {
                  const meta = getAnalysisMeta(analysis.type);
                  const confidence = getPrimaryConfidence(analysis);
                  return (
                    <article
                      key={analysis.id || index}
                      className={`analytics-history-card analytics-history-card--${meta.tone}`}
                      onClick={() => {
                        setSelectedAnalysis(analysis);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="analytics-history-card__top">
                        <div>
                          <span className="analytics-history-card__label">
                            {meta.icon} {meta.label}
                          </span>
                          <h3>{getPrimaryCondition(analysis)}</h3>
                        </div>
                        <span className="analytics-history-card__badge">{meta.label}</span>
                      </div>

                      <div className="analytics-history-card__meta">
                        <span>
                          <FaClock />
                          {formatDateTime(analysis.timestamp)}
                        </span>
                        {confidence !== null && <span>{`${(confidence * 100).toFixed(1)}% confidence`}</span>}
                      </div>

                      <p className="analytics-history-card__summary">
                        {getEnhancedResults(analysis)
                          ? 'Includes multi-model results with an evidence-aware summary layer.'
                          : 'Includes a direct diagnosis result with AI-generated follow-up guidance.'}
                      </p>

                      {analysis.imageName && (
                        <div className="analytics-history-card__file">
                          {`${analysis.imageName}${analysis.imageSize ? ` · ${(analysis.imageSize / 1024 / 1024).toFixed(1)} MB` : ''}`}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="analytics-side-column">
            <section className="analytics-panel derma-page-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="derma-page-kicker">Trends</span>
                  <h2>Confidence trend line</h2>
                </div>
                <p>Track how recent analysis confidence changes over time.</p>
              </div>

              {trends.length === 0 ? (
                <div className="analytics-mini-empty">
                  <p>No trend data yet. Once scans are saved, your confidence trend line will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="analytics-chart-shell">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                  <div className="analytics-trend-list">
                    {trends.slice(-4).reverse().map((trend) => (
                      <div key={trend.id} className="analytics-trend-row">
                        <div>
                          <strong>{trend.condition}</strong>
                          <span>{trend.date}</span>
                        </div>
                        <small>{`${(trend.confidence * 100).toFixed(1)}%`}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="analytics-panel derma-page-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="derma-page-kicker">DermAi Summary</span>
                  <h2>Recent insight</h2>
                </div>
                <p>Ask DermAi to summarize the most recent advice in your analytics history.</p>
              </div>

              <button type="button" className="derma-button analytics-summary-button" onClick={handleGeminiAnalyze} disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze with DermAi'}
              </button>

              {geminiSummary ? (
                <div className="analytics-summary-card">
                  <div className="analytics-summary-card__header">
                    <FaMagic />
                    <strong>DermAi insight</strong>
                  </div>
                  <p>{geminiSummary}</p>
                </div>
              ) : (
                <div className="analytics-mini-empty">
                  <p>Run DermAi summary to pull the latest advice or evidence note from your saved reports.</p>
                </div>
              )}
            </section>
          </aside>
        </div>

        {showDetailModal && selectedAnalysis && (
          <div className="analytics-modal" onClick={() => setShowDetailModal(false)}>
            <div className="analytics-modal__card" onClick={(event) => event.stopPropagation()}>
              <div className="analytics-modal__header">
                <div>
                  <span className="derma-page-kicker">Detailed Report</span>
                  <h2>{`${selectedMeta.icon} ${selectedMeta.label}`}</h2>
                  <p>{formatDateTime(selectedAnalysis.timestamp)}</p>
                </div>
                <button type="button" className="analytics-modal__close" onClick={() => setShowDetailModal(false)}>
                  ×
                </button>
              </div>

              <div className="analytics-modal__overview">
                <div>
                  <strong>Primary condition</strong>
                  <span>{getPrimaryCondition(selectedAnalysis)}</span>
                </div>
                <div>
                  <strong>Confidence</strong>
                  <span>
                    {getPrimaryConfidence(selectedAnalysis) !== null
                      ? `${(getPrimaryConfidence(selectedAnalysis) * 100).toFixed(1)}%`
                      : 'Not available'}
                  </span>
                </div>
                <div>
                  <strong>Image</strong>
                  <span>{selectedAnalysis.imageName || 'No image name stored'}</span>
                </div>
              </div>

              {selectedEnhanced ? (
                <div className="analytics-modal__section-stack">
                  {selectedEnhanced.ml_results?.smart_analysis && (
                    <section className="analytics-modal__section">
                      <h3>Analysis strategy</h3>
                      <div className="analytics-modal__two-column">
                        <div>
                          <strong>Image type</strong>
                          <span>{selectedEnhanced.ml_results.smart_analysis.image_type}</span>
                        </div>
                        <div>
                          <strong>Models used</strong>
                          <span>{selectedEnhanced.ml_results.smart_analysis.models_used?.join(', ')}</span>
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="analytics-modal__section">
                    <h3>Model outputs</h3>
                    <div className="analytics-modal__model-grid">
                      {selectedEnhanced.ml_results?.dermnet && (
                        <article className="analytics-model-card">
                          <strong>General Dermatology</strong>
                          <span>{selectedEnhanced.ml_results.dermnet.condition}</span>
                          <p>{`${(selectedEnhanced.ml_results.dermnet.confidence * 100).toFixed(1)}% confidence`}</p>
                          {selectedEnhanced.ml_results.dermnet.gemini_advice && <p>{selectedEnhanced.ml_results.dermnet.gemini_advice}</p>}
                        </article>
                      )}

                      {selectedEnhanced.ml_results?.acne && (
                        <article className="analytics-model-card">
                          <strong>Acne Detection</strong>
                          <p>{`${(selectedEnhanced.ml_results.acne.confidence * 100).toFixed(1)}% confidence`}</p>
                          {selectedEnhanced.ml_results.acne.gemini_advice && <p>{selectedEnhanced.ml_results.acne.gemini_advice}</p>}
                          {selectedEnhanced.ml_results.acne.detection_image && (
                            <img
                              src={`data:image/png;base64,${selectedEnhanced.ml_results.acne.detection_image}`}
                              alt="Acne detection"
                            />
                          )}
                        </article>
                      )}

                      {selectedEnhanced.ml_results?.hair && (
                        <article className="analytics-model-card">
                          <strong>Hair Analysis</strong>
                          <p>{`${(selectedEnhanced.ml_results.hair.confidence * 100).toFixed(1)}% confidence`}</p>
                          {selectedEnhanced.ml_results.hair.gemini_advice && <p>{selectedEnhanced.ml_results.hair.gemini_advice}</p>}
                          {selectedEnhanced.ml_results.hair.overlay_image && (
                            <img
                              src={`data:image/png;base64,${selectedEnhanced.ml_results.hair.overlay_image}`}
                              alt="Hair analysis overlay"
                            />
                          )}
                        </article>
                      )}
                    </div>
                  </section>

                  {selectedEnhanced.rag_analysis && (
                    <section className="analytics-modal__section analytics-modal__section--insight">
                      <h3>{selectedEnhanced.rag_analysis.error ? 'Limited RAG Insight' : 'Evidence-Based Insight'}</h3>
                      {selectedEnhanced.rag_analysis.comprehensive_analysis && (
                        <p>{selectedEnhanced.rag_analysis.comprehensive_analysis}</p>
                      )}
                      {selectedEnhanced.rag_analysis.confidence_score && (
                        <span className="analytics-modal__footnote">
                          {`${(selectedEnhanced.rag_analysis.confidence_score * 100).toFixed(1)}% evidence confidence`}
                        </span>
                      )}
                      {selectedEnhanced.rag_analysis.sources && selectedEnhanced.rag_analysis.sources.length > 0 && (
                        <ul className="analytics-modal__sources">
                          {selectedEnhanced.rag_analysis.sources.slice(0, 3).map((source, index) => (
                            <li key={`${source.content?.slice(0, 20) || 'source'}-${index}`}>
                              {source.content?.slice(0, 220)}...
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
              ) : (
                <div className="analytics-modal__section-stack">
                  <section className="analytics-modal__section">
                    <h3>Direct diagnosis result</h3>
                    <div className="analytics-modal__two-column">
                      <div>
                        <strong>Diagnosis</strong>
                        <span>{selectedAnalysis.results?.diagnosis || selectedAnalysis.results?.condition || 'Not available'}</span>
                      </div>
                      <div>
                        <strong>Confidence</strong>
                        <span>
                          {selectedAnalysis.results?.confidence
                            ? `${(selectedAnalysis.results.confidence * 100).toFixed(1)}%`
                            : 'Not available'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {selectedAnalysis.results?.geminiAdvice && (
                    <section className="analytics-modal__section analytics-modal__section--insight">
                      <h3>AI-generated advice</h3>
                      <p>{selectedAnalysis.results.geminiAdvice}</p>
                    </section>
                  )}
                </div>
              )}

              <div className="analytics-modal__footer">
                <button type="button" className="derma-button" onClick={() => setShowDetailModal(false)}>
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
