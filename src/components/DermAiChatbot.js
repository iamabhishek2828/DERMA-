import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FaArrowUp } from 'react-icons/fa';

import botLogo from '../assets/chat-bot-3d-illustration-png.webp';
import { buildApiUrl } from '../config';
import '../styles/chatbot.css';

const initialGreeting = {
  from: 'bot',
  text: 'Hi, I’m DermAi. Ask about skin, hair, nails, symptoms, routines, or whether it may be time to speak to a dermatologist.',
};

const DermAiChatbot = ({ fullscreen = false, onClose }) => {
  const [messages, setMessages] = useState([initialGreeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    setMessages((current) => [...current, { from: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(buildApiUrl('/chatbot'), { message: trimmed });
      setMessages((current) => [
        ...current,
        { from: 'bot', text: response.data.reply || "I couldn't generate a response right now." },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { from: 'bot', text: "Sorry, I couldn't process your request right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chatbotUI = (
    <div className={`dermai-assistant${fullscreen ? ' dermai-assistant--fullscreen' : ''}`}>
      <div className={`dermai-assistant__card${fullscreen ? ' dermai-assistant__card--fullscreen' : ''}`}>
        {!!onClose && (
          <button className="dermai-assistant__close" type="button" aria-label="Close chatbot" onClick={onClose}>
            ×
          </button>
        )}

        <div className="dermai-assistant__header">
          <div className="dermai-assistant__identity">
            <img src={botLogo} alt="DermAi bot" className="dermai-assistant__avatar" />
            <div>
              <strong>DermAi Assistant</strong>
              <span>Private support for skin, hair, and nail questions</span>
            </div>
          </div>
        </div>

        <div className="dermai-assistant__stream">
          {messages.map((message, index) => (
            <div key={`${message.from}-${index}`} className={`dermai-assistant__bubble dermai-assistant__bubble--${message.from}`}>
              {message.from === 'bot' && <img src={botLogo} alt="" className="dermai-assistant__bubble-avatar" />}
              <p>{message.text}</p>
            </div>
          ))}

          {loading && (
            <div className="dermai-assistant__bubble dermai-assistant__bubble--bot dermai-assistant__bubble--loading">
              <img src={botLogo} alt="" className="dermai-assistant__bubble-avatar" />
              <p>DermAi is thinking…</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="dermai-assistant__composer">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !loading) {
                sendMessage();
              }
            }}
            disabled={loading}
            placeholder="Ask your question..."
          />
          <button type="button" onClick={sendMessage} disabled={loading || !input.trim()}>
            <FaArrowUp />
          </button>
        </div>
      </div>
    </div>
  );

  if (!fullscreen) {
    return typeof document !== 'undefined' ? createPortal(chatbotUI, document.body) : chatbotUI;
  }

  return <div className="derma-page-shell dermai-assistant-page"><div className="derma-page-container">{chatbotUI}</div></div>;
};

export default DermAiChatbot;
