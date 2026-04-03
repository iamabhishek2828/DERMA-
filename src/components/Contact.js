import React, { useRef, useState } from 'react';
import { FaCommentDots, FaEnvelope, FaUser } from 'react-icons/fa';
import emailjs from 'emailjs-com';

import '../styles/contact.css';

const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const USER_ID = process.env.REACT_APP_EMAILJS_USER_ID;

const contactHighlights = [
  'Product feedback, partnership discussions, and support questions all go through one clear channel.',
  'The form is designed for fast outreach instead of feeling like a generic placeholder page.',
  'If EmailJS variables are missing, the page now surfaces that issue cleanly instead of failing silently.',
];

const Contact = () => {
  const formRef = useRef();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setSent(false);
    setError('');

    if (!SERVICE_ID || !TEMPLATE_ID || !USER_ID) {
      setError('EmailJS configuration is missing. Please add the required environment variables.');
      return;
    }

    emailjs
      .sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, USER_ID)
      .then(() => setSent(true))
      .catch((err) => {
        setError(`Failed to send message: ${err.text || err.message || 'Unknown error'}`);
      });
  };

  return (
    <div className="contact-page derma-page-shell">
      <div className="derma-page-container contact-page__layout">
        <section className="contact-page__intro derma-page-panel">
          <span className="derma-page-kicker">Contact DermAi</span>
          <h1 className="derma-section-title">A contact page should feel as polished as the product itself.</h1>
          <p className="derma-section-copy">
            Whether you want support, feedback, or collaboration, this screen now has the same visual quality and
            structure as the rest of the experience.
          </p>

          <div className="contact-page__meta">
            <div>
              <strong>Email</strong>
              <span>info@dermai.com</span>
            </div>
            <div>
              <strong>Response window</strong>
              <span>Usually within 24 hours</span>
            </div>
          </div>

          <div className="contact-page__highlights">
            {contactHighlights.map((point) => (
              <div key={point} className="contact-page__highlight">
                <FaCommentDots />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-page__form derma-page-panel">
          <div className="contact-page__form-heading">
            <span className="derma-page-kicker">Reach Out</span>
            <h2>Send us a message</h2>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="contact-form">
            <label className="contact-form__field">
              <span>
                <FaUser />
              </span>
              <input className="derma-input" type="text" name="name" placeholder="Your Name" autoComplete="off" required />
            </label>

            <label className="contact-form__field">
              <span>
                <FaEnvelope />
              </span>
              <input className="derma-input" type="email" name="email" placeholder="Your Email" autoComplete="off" required />
            </label>

            <label className="contact-form__field contact-form__field--textarea">
              <span>
                <FaCommentDots />
              </span>
              <textarea className="derma-textarea" name="message" placeholder="Tell us how we can help" required />
            </label>

            <button type="submit" className="derma-button contact-form__submit">
              Send Message
            </button>
          </form>

          {sent && <div className="derma-form-success">Message sent successfully.</div>}
          {error && <div className="derma-form-error">{error}</div>}
        </section>
      </div>
    </div>
  );
};

export default Contact;
