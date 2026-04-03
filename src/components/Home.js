import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBookMedical,
  FaMicroscope,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaUserMd,
} from 'react-icons/fa';

import { useAuth } from '../contexts/AuthContext';
import DermAiChatbot from './DermAiChatbot';
import botLogo from '../assets/chat-bot-3d-illustration-png.webp';
import img1 from '../assets/teenage-girl-acne-problem-visiting-260nw-1768934066-removebg-preview.png';
import img2 from '../assets/untit__1_-removebg-preview.png';
import img3 from '../assets/6626a763ac5980b73f5aba7d_6426543485efe6e4e2e36f5d_Dermatology3hra2.webp';
import '../styles/Home.css';

const heroStats = [
  { value: '60s', label: 'average triage flow' },
  { value: '24/7', label: 'assistant availability' },
  { value: '1', label: 'connected care workspace' },
];

const productAreas = [
  {
    icon: <FaMicroscope />,
    title: 'AI Skin Analysis',
    description: 'Upload a photo and receive an immediate first-pass assessment with clarity and confidence scoring.',
    route: '/ai-diagnosis',
    requiresAuth: true,
  },
  {
    icon: <FaRobot />,
    title: 'Always-On Guidance',
    description: 'Keep a private conversation open for skin, hair, and nail questions whenever you need support.',
    route: '/dermai-chatbot',
    requiresAuth: false,
  },
  {
    icon: <FaUserMd />,
    title: 'Doctor Connection',
    description: 'Escalate from digital triage to certified specialists without leaving the same product flow.',
    route: '/connect-doctor',
    requiresAuth: true,
  },
  {
    icon: <FaSearch />,
    title: 'Research Layer',
    description: 'Search PubMed-backed literature and give the experience a stronger evidence-based edge.',
    route: '/pubmed',
    requiresAuth: false,
  },
];

const carePrograms = [
  {
    title: 'Consult-first dermatology',
    copy: 'Human review, care planning, and follow-up are presented as part of one premium clinical pathway.',
    accent: 'Signature Program',
  },
  {
    title: 'Acne, scar, and pigment care',
    copy: 'Focused flows for the most common high-frequency conditions that users want clear direction on.',
    accent: 'High-demand track',
  },
  {
    title: 'Hair and scalp evaluation',
    copy: 'Dedicated analysis experiences for hair loss and scalp-related concerns, not an afterthought.',
    accent: 'Specialty track',
  },
];

const insightCards = [
  {
    eyebrow: 'Patient trust',
    title: 'A calmer first step for people who need answers quickly.',
    copy: 'DermAi turns uncertain symptom checking into a guided workflow that feels structured, modern, and safe.',
  },
  {
    eyebrow: 'Team efficiency',
    title: 'One interface for triage, research, and escalation.',
    copy: 'Instead of separate pages feeling unrelated, the platform now reads like a digital clinic with a consistent operational rhythm.',
  },
];

const blogList = [
  {
    title: 'Summer Skin Care: Top 5 Tips',
    description: 'Protect the skin barrier, use sunscreen consistently, and build routines that hold up in hot weather.',
    link: '/blog/summer-skin-care',
  },
  {
    title: 'How AI Is Changing Dermatology',
    description: 'See how modern diagnosis support can improve response time and keep care journeys better organized.',
    link: '/blog/ai-in-dermatology',
  },
  {
    title: 'Foods for Healthy Skin',
    description: 'A practical look at the nutrition habits that help with acne, dryness, and long-term skin resilience.',
    link: '/blog/skin-nutrition',
  },
];

const testimonials = [
  {
    name: 'Amit S.',
    title: 'Remote care user',
    quote: 'The platform feels polished and reassuring. I went from uncertainty to a clear next step in one sitting.',
  },
  {
    name: 'Priya K.',
    title: 'Ongoing treatment tracking',
    quote: 'What stands out is the flow. The design makes the technology feel trustworthy instead of overwhelming.',
  },
];

const trustPoints = [
  'Private conversations and secure handling of sensitive health context',
  'Designed to combine AI triage with dermatologist-backed next steps',
  'Structured enough for repeat use, simple enough for first-time visitors',
];

const riseInView = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showChatbot, setShowChatbot] = React.useState(false);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'google') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleProtectedRoute = (route) => {
    if (user) {
      navigate(route);
      return;
    }

    navigate('/login');
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="derma-page-container home-hero__container">
          <motion.div className="home-hero__copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="derma-page-kicker derma-page-kicker--dark">AI Dermatology Platform</span>
            <h1 className="derma-section-title derma-section-title--light">
              Clinical-grade skin intelligence, designed like a modern digital clinic.
            </h1>
            <p className="derma-section-copy derma-section-copy--light">
              DermAi brings together skin analysis, evidence-backed guidance, and doctor escalation in one
              thoughtful experience that feels premium instead of pieced together.
            </p>

            <div className="home-hero__actions">
              <button className="derma-button" type="button" onClick={() => handleProtectedRoute('/ai-diagnosis')}>
                Start Analysis
                <FaArrowRight />
              </button>
              <button className="derma-button derma-button--ghost home-hero__ghost" type="button" onClick={() => handleProtectedRoute('/connect-doctor')}>
                Talk to a Specialist
              </button>
            </div>

            <div className="home-hero__stats">
              {heroStats.map((stat) => (
                <div key={stat.label} className="home-hero__stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="home-hero__stage" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <div className="home-hero__portrait home-hero__portrait--main">
              <img src={img2} alt="DermAi diagnosis preview" />
            </div>
            <div className="home-hero__portrait home-hero__portrait--left">
              <img src={img1} alt="Skin analysis case" />
            </div>
            <div className="home-hero__portrait home-hero__portrait--right">
              <img src={img3} alt="Dermatology visual" />
            </div>

            <div className="home-hero__signal home-hero__signal--analysis">
              <span>Live workflow</span>
              <strong>AI scan → advice → specialist</strong>
            </div>
            <div className="home-hero__signal home-hero__signal--trust">
              <FaShieldAlt />
              <div>
                <strong>Private by design</strong>
                <span>Built for sensitive health conversations</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="home-overview derma-page-shell">
        <div className="derma-page-container">
          <motion.div className="home-section-heading" {...riseInView}>
            <span className="derma-page-kicker">Platform Capabilities</span>
            <h2 className="derma-section-title">A connected experience instead of disconnected tools.</h2>
            <p className="derma-section-copy">
              Every core workflow is now positioned like part of the same clinical system, with sharper hierarchy,
              better rhythm, and stronger visual discipline.
            </p>
          </motion.div>

          <div className="home-product-grid">
            {productAreas.map((area, index) => (
              <motion.button
                key={area.title}
                type="button"
                className="home-product-card"
                onClick={() => (area.requiresAuth ? handleProtectedRoute(area.route) : navigate(area.route))}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={{ y: -6 }}
              >
                <span className="home-product-card__icon">{area.icon}</span>
                <div>
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                </div>
                <span className="home-product-card__arrow">
                  <FaArrowRight />
                </span>
              </motion.button>
            ))}
          </div>

          <div className="home-insight-grid">
            {insightCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="home-insight-card derma-page-panel"
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <span>{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-programs derma-page-shell">
        <div className="derma-page-container home-programs__layout">
          <motion.div className="home-programs__intro" {...riseInView}>
            <span className="derma-page-kicker">Clinical Programs</span>
            <h2 className="derma-section-title">Professional care pathways, presented with clarity.</h2>
            <p className="derma-section-copy">
              The layout now feels closer to a private clinic brand: cleaner spacing, stronger typography, and
              structured service cards that look intentional instead of generic.
            </p>
            <div className="derma-chip-list">
              <span className="derma-chip">Consultation-led care</span>
              <span className="derma-chip">Condition-specific programs</span>
              <span className="derma-chip">Evidence-aware guidance</span>
            </div>
          </motion.div>

          <div className="home-programs__cards">
            {carePrograms.map((program, index) => (
              <motion.article
                key={program.title}
                className="home-program-card derma-page-panel"
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
              >
                <span>{program.accent}</span>
                <h3>{program.title}</h3>
                <p>{program.copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-proof derma-page-shell">
        <div className="derma-page-container home-proof__grid">
          <motion.div className="home-proof__column" {...riseInView}>
            <span className="derma-page-kicker">Insights</span>
            <h2 className="derma-section-title">Content that supports the care journey.</h2>
            <div className="home-blog-list">
              {blogList.map((blog) => (
                <button key={blog.title} type="button" className="home-blog-card" onClick={() => navigate(blog.link)}>
                  <div>
                    <h3>{blog.title}</h3>
                    <p>{blog.description}</p>
                  </div>
                  <FaArrowRight />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div className="home-proof__column" {...riseInView}>
            <span className="derma-page-kicker">Experience</span>
            <h2 className="derma-section-title">Why the interface should feel trustworthy immediately.</h2>
            <div className="home-testimonial-list">
              {testimonials.map((testimonial) => (
                <article key={testimonial.name} className="home-testimonial-card derma-page-panel">
                  <p>“{testimonial.quote}”</p>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.title}</span>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="home-trust derma-page-shell">
        <div className="derma-page-container">
          <motion.div className="home-trust__panel" {...riseInView}>
            <div className="home-trust__copy">
              <span className="derma-page-kicker home-trust__kicker">Why DermAi</span>
              <h2 className="derma-section-title">Built to feel premium, calm, and clinically credible.</h2>
              <p className="derma-section-copy">
                The experience should reassure users that they are in the right place, whether they want a quick
                answer, a deeper research view, or a direct path to medical help.
              </p>
            </div>

            <div className="home-trust__points">
              {trustPoints.map((point) => (
                <div key={point} className="home-trust__point">
                  <FaBookMedical />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="home-trust__actions">
              <button className="derma-button" type="button" onClick={() => handleProtectedRoute('/ai-diagnosis')}>
                Open the diagnosis workspace
              </button>
              <button className="derma-button derma-button--secondary" type="button" onClick={() => navigate('/about')}>
                Learn more about DermAi
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.button
        className="derma-bot-btn"
        type="button"
        onClick={() => setShowChatbot(true)}
        title="Chat with DermAi"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
      >
        <img src={botLogo} alt="DermAi Bot" className="derma-bot-img" />
      </motion.button>

      {showChatbot && <DermAiChatbot onClose={() => setShowChatbot(false)} />}
    </div>
  );
};

export default Home;
