import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaComments, FaStethoscope, FaUserMd } from 'react-icons/fa';

import { buildApiUrl } from '../config';
import '../styles/connectdoctor.css';

const doctorBenefits = [
  'Ask the assistant first, then escalate to a specialist when needed.',
  'Keep the experience focused on skin, hair, and nail concerns.',
  'Present doctor access as part of the same premium workflow, not a disconnected page.',
];

const ConnectDoctor = () => {
  const [question, setQuestion] = useState('');
  const [geminiReply, setGeminiReply] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAskGemini = async (event) => {
    event.preventDefault();
    setGeminiReply('');
    setLoading(true);

    try {
      const response = await axios.post(buildApiUrl('/chatbot'), { message: question });
      setGeminiReply(response.data.reply);
    } catch {
      setGeminiReply('DermAi could not answer that question right now. Please try again or connect with a doctor directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-doctor-page derma-page-shell">
      <div className="derma-page-container connect-doctor-page__layout">
        <section className="connect-doctor-page__intro">
          <span className="derma-page-kicker">Doctor Access</span>
          <h1 className="derma-section-title">A cleaner handoff from AI guidance to specialist care.</h1>
          <p className="derma-section-copy">
            This page now reads like a professional consultation gateway: lighter, more structured, and less like a
            one-off card floating on an empty canvas.
          </p>

          <div className="connect-doctor-page__benefits">
            {doctorBenefits.map((benefit) => (
              <div key={benefit} className="connect-doctor-page__benefit">
                <FaStethoscope />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="connect-doctor-page__cta-card derma-page-panel">
            <span className="connect-doctor-page__cta-icon">
              <FaUserMd />
            </span>
            <div>
              <h2>Need a real dermatologist?</h2>
              <p>Move straight to the specialist directory when you already know you want human follow-up.</p>
            </div>
            <button type="button" className="derma-button" onClick={() => navigate('/doctor-list')}>
              Browse specialists
              <FaArrowRight />
            </button>
          </div>
        </section>

        <section className="connect-doctor-card derma-page-panel">
          <div className="connect-doctor-card__heading">
            <span className="connect-doctor-card__icon">
              <FaComments />
            </span>
            <div>
              <span className="derma-page-kicker">AI Triage</span>
              <h2>Ask DermAi first</h2>
            </div>
          </div>

          <p className="connect-doctor-card__copy">
            Use this as a private first conversation for symptoms, treatment questions, and next-step guidance.
          </p>

          <form className="connect-doctor-form" onSubmit={handleAskGemini}>
            <textarea
              className="derma-textarea"
              placeholder="Describe your skin concern or ask a health question..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={loading}
            />

            <button type="submit" className="derma-button connect-doctor-form__submit" disabled={loading || !question.trim()}>
              {loading ? 'Asking DermAi...' : 'Ask DermAi'}
            </button>
          </form>

          {geminiReply && (
            <div className="connect-doctor-card__reply">
              <strong>DermAi reply</strong>
              <p>{geminiReply}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConnectDoctor;
