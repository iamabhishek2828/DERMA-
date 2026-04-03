import React from 'react';
import { Link } from 'react-router-dom';
import { FaBookMedical, FaComments, FaLaptopMedical, FaRegChartBar, FaShieldAlt } from 'react-icons/fa';

import ceoImage from '../assets/images/ceo.jpg';
import ctoImage from '../assets/images/cto copy.jpg';
import cmoImage from '../assets/images/CMO.jpg';
import '../styles/About.css';

const valueCards = [
  {
    icon: <FaLaptopMedical />,
    title: 'AI-guided first response',
    copy: 'We make the first step feel structured and calm, giving users faster direction before they lose confidence.',
  },
  {
    icon: <FaBookMedical />,
    title: 'Evidence-backed guidance',
    copy: 'DermAi is built to feel medically literate, not like a generic chatbot wearing a healthcare label.',
  },
  {
    icon: <FaComments />,
    title: 'Conversation-led care',
    copy: 'Digital triage should still feel human. Every screen is designed to reduce friction and increase clarity.',
  },
  {
    icon: <FaRegChartBar />,
    title: 'Trackable progress',
    copy: 'We connect diagnosis, follow-up, and progress views into the same experience so users can return with context.',
  },
];

const team = [
  {
    name: 'Abhishek',
    title: 'Founder & Product Lead',
    img: ceoImage,
    desc: 'Driving the vision for a more polished and trustworthy AI dermatology experience.',
  },
  {
    name: 'Jane Smith',
    title: 'AI Engineering Lead',
    img: ctoImage,
    desc: 'Focused on turning machine learning workflows into interfaces people can actually trust and use.',
  },
  {
    name: 'Emily Johnson',
    title: 'Clinical Advisor',
    img: cmoImage,
    desc: 'Ensuring the product direction stays grounded in safe, credible dermatology communication.',
  },
];

const About = () => (
  <div className="about-page derma-page-shell">
    <div className="derma-page-container about-page__layout">
      <section className="about-hero derma-page-panel">
        <div className="about-hero__copy">
          <span className="derma-page-kicker">About DermAi</span>
          <h1 className="derma-section-title">A dermatology product that should feel as refined as the care it points to.</h1>
          <p className="derma-section-copy">
            DermAi exists to make the path from uncertainty to informed next action feel smoother, clearer, and more
            professionally designed than a typical AI health interface.
          </p>
          <div className="derma-chip-list">
            <span className="derma-chip">AI-assisted analysis</span>
            <span className="derma-chip">Doctor escalation</span>
            <span className="derma-chip">Evidence-aware design</span>
          </div>
        </div>

        <div className="about-hero__card">
          <div className="about-hero__metric">
            <strong>Mission</strong>
            <p>Make skin guidance accessible without making it feel cheap, confusing, or visually fragmented.</p>
          </div>
          <div className="about-hero__metric">
            <strong>Approach</strong>
            <p>Blend modern interface design, machine intelligence, and clinically sensible escalation paths.</p>
          </div>
          <div className="about-hero__metric">
            <FaShieldAlt />
            <span>Trust, clarity, and calm decision-making are core product requirements, not optional polish.</span>
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="about-values__heading">
          <span className="derma-page-kicker">What Sets Us Apart</span>
          <h2 className="derma-section-title">The experience is designed like a real digital clinic, not a collection of widgets.</h2>
        </div>

        <div className="about-values__grid">
          {valueCards.map((card) => (
            <article key={card.title} className="about-value-card derma-page-panel">
              <span className="about-value-card__icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-team">
        <div className="about-team__heading">
          <span className="derma-page-kicker">Team</span>
          <h2 className="derma-section-title">The people shaping the product direction.</h2>
        </div>

        <div className="about-team__grid">
          {team.map((member) => (
            <article key={member.name} className="about-team-card derma-page-panel">
              <img src={member.img} alt={member.name} className="about-team-card__image" />
              <h3>{member.name}</h3>
              <span>{member.title}</span>
              <p>{member.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta derma-page-panel">
        <div>
          <span className="derma-page-kicker">Next Step</span>
          <h2 className="derma-section-title">Want to see how the platform handles real care workflows?</h2>
          <p className="derma-section-copy">
            Explore the diagnosis workspace, ask the assistant a question, or reach out directly if you want to talk
            through the product.
          </p>
        </div>

        <div className="about-cta__actions">
          <Link to="/ai-diagnosis" className="derma-button">
            Open diagnosis
          </Link>
          <Link to="/contact" className="derma-button derma-button--secondary">
            Contact DermAi
          </Link>
        </div>
      </section>
    </div>
  </div>
);

export default About;
