import React, { useEffect, useRef, useState } from 'react';
import { FaBookMedical, FaMagic } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config';
import '../styles/enhanced-chatbot.css';

const starterSuggestions = [
  'What are the early signs of melanoma?',
  'How can I reduce acne scarring?',
  'Best routine for sensitive skin',
  'Difference between eczema and psoriasis',
  'When should I see a dermatologist?',
  'How to prevent premature aging',
];

const EnhancedDermAiChatbot = () => {
  const [messages, setMessages] = useState([
    {
      text: "Hello. I'm your enhanced DermAi assistant. I provide evidence-aware educational guidance about skin conditions, treatment options, and skincare decisions.",
      sender: 'bot',
      timestamp: new Date(),
      sources: [],
      confidence: 1,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) {
      return 'High';
    }

    if (confidence >= 0.6) {
      return 'Medium';
    }

    return 'Low';
  };

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = {
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(buildApiUrl('/chatbot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          text: data.reply || data.response || data.message || 'I could not generate a response right now.',
          sender: 'bot',
          timestamp: new Date(),
          sources: [],
          confidence: 0.8,
          contextCount: 0,
        },
      ]);
    } catch (error) {
      console.error('Enhanced chatbot error:', error);
      setMessages((current) => [
        ...current,
        {
          text: 'I am having trouble reaching the assistant service right now. Please try again shortly or consult a dermatologist for urgent concerns.',
          sender: 'bot',
          timestamp: new Date(),
          isError: true,
          sources: [],
          confidence: 0,
          contextCount: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="assistant-page derma-page-shell">
      <div className="derma-page-container assistant-page__layout">
        <section className="assistant-page__hero">
          <div className="assistant-page__copy">
            <span className="derma-page-kicker">Enhanced AI</span>
            <h1 className="derma-section-title">Evidence-aware conversation, presented like a serious product workspace.</h1>
            <p className="derma-section-copy">
              This screen now has a clearer hierarchy, a tighter conversation layout, and styling that feels aligned
              with the rest of the platform instead of a separate demo page.
            </p>
            <div className="derma-chip-list">
              <span className="derma-chip">
                <FaBookMedical />
                Literature-informed guidance
              </span>
              <span className="derma-chip">
                <FaMagic />
                {user ? 'Personalized mode active' : 'Guest mode active'}
              </span>
            </div>
          </div>

          <div className="assistant-page__status derma-page-panel">
            <strong>{user ? 'Personalized mode' : 'Guest mode'}</strong>
            <p>{user ? 'You are signed in, so the assistant can fit more naturally into your overall product flow.' : 'You can explore the assistant now and sign in later for a fuller DermAi workflow.'}</p>
          </div>
        </section>

        <section className="assistant-workspace derma-page-panel">
          <div className="assistant-workspace__header">
            <div>
              <span className="derma-page-kicker">Conversation</span>
              <h2>DermAi Evidence Assistant</h2>
            </div>
            <div className="assistant-workspace__badge">{user ? 'Signed in' : 'Guest access'}</div>
          </div>

          <div className="assistant-workspace__messages">
            {messages.map((message, index) => (
              <article
                key={`${message.sender}-${index}`}
                className={`assistant-message assistant-message--${message.sender}${message.isError ? ' assistant-message--error' : ''}`}
              >
                <div className="assistant-message__content">
                  <p>{message.text}</p>

                  {message.sender === 'bot' && typeof message.confidence === 'number' && (
                    <div className="assistant-message__meta">
                      <span className="assistant-message__confidence">
                        Confidence: {getConfidenceText(message.confidence)} ({Math.round(message.confidence * 100)}%)
                      </span>
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="assistant-message__sources">
                      <h4>Sources</h4>
                      <ul>
                        {message.sources.map((source, sourceIndex) => (
                          <li key={`${source.metadata?.title || 'source'}-${sourceIndex}`}>
                            <strong>{source.metadata?.title || 'Medical literature'}</strong>
                            <span>{source.source}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <span className="assistant-message__time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </article>
            ))}

            {isLoading && (
              <div className="assistant-message assistant-message--bot assistant-message--loading">
                <div className="assistant-message__content">
                  <p>DermAi is analyzing your question…</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="assistant-suggestions">
              <h3>Try asking about</h3>
              <div className="assistant-suggestions__grid">
                {starterSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => setInputMessage(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="assistant-composer">
            <textarea
              className="assistant-composer__input"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about skin conditions, treatment options, or skincare decisions..."
              disabled={isLoading}
            />
            <button type="button" className="derma-button assistant-composer__button" disabled={isLoading || !inputMessage.trim()} onClick={handleSendMessage}>
              {isLoading ? 'Thinking...' : 'Send question'}
            </button>
          </div>

          <div className="assistant-disclaimer">
            Educational information only. Always consult a qualified dermatologist for medical diagnosis, treatment, or urgent concerns.
          </div>
        </section>
      </div>
    </div>
  );
};

export default EnhancedDermAiChatbot;
