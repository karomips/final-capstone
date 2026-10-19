import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CalendarDays, CarFront, Check,
  ChevronDown, ClipboardCheck, Menu, Plus, X
} from 'lucide-react';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import drivingIllustration from '../../assets/driving-lesson.svg';
import './LandingPage.css';

const steps = [
  { title: 'Create your account', description: 'Complete your student details and verify your email to register.' },
  { title: 'Get approved', description: 'The school reviews your registration before you can book lessons.' },
  { title: 'Book your lessons', description: 'Choose a lesson, available instructor, and schedule that works for you.' },
  { title: 'Keep moving forward', description: 'View upcoming sessions and follow your progress from your dashboard.' }
];

const questions = [
  {
    question: 'How do I get started?',
    answer: 'Create an account using the registration form, complete your student information, and verify your email. Once the school approves your account, sign in to book your first lesson.'
  },
  {
    question: 'What lessons can I book?',
    answer: 'The portal offers theoretical classroom lessons and practical driving lessons. After signing in, you can explore lesson options, available instructors, vehicles, and course packages.'
  },
  {
    question: 'Can I choose a manual or automatic vehicle?',
    answer: 'Yes. When booking practical lessons, select your preferred transmission to see the available instructors and vehicles. Options depend on availability for your chosen schedule.'
  },
  {
    question: 'Where can I find my schedule and progress?',
    answer: 'Sign in to view your dashboard and My Sessions page. You can check upcoming lessons, booking details, and practical course progress in one place.'
  }
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        document.getElementById('landing-menu-toggle')?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  return (
    <div className="landing-page" id="top">
      <a className="landing-skip-link" href="#main-content">Skip to content</a>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link className="landing-brand" to="/" aria-label="Easy Drive Driving School home">
            <img src={EasyDriveLogo} alt="" width="43" height="43" />
            <span>Easy Drive<small>DRIVING SCHOOL</small></span>
          </Link>

          <button
            className="landing-menu-toggle"
            id="landing-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav
            className={`landing-navigation${menuOpen ? ' is-open' : ''}`}
            id="landing-navigation"
            aria-label="Main navigation"
            onClick={(event) => {
              if (event.target.closest('a')) setMenuOpen(false);
            }}
          >
            <div className="landing-nav-links">
              <a href="#courses">Our courses</a>
              <a href="#how-it-works">How it works</a>
              <a href="#faqs">FAQs</a>
            </div>
            <div className="landing-nav-actions">
              <Link className="landing-sign-in" to="/login">Sign in</Link>
              <Link className="landing-button landing-button-small" to="/signup">
                Create an account <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex="-1">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><span /> YOUR ROAD TO CONFIDENCE</p>
              <h1 id="landing-title">Good driving<br />starts with<br /><span>the right guidance.</span></h1>
              <p className="landing-hero-description">
                Take the first step with Easy Drive. Explore our driving courses,
                book your lessons, and keep track of your progress in one simple place.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button" to="/signup">
                  Start your journey <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="landing-text-link" href="#courses">
                  Explore courses <ChevronDown size={17} aria-hidden="true" />
                </a>
              </div>
              <p className="landing-hero-note"><Check size={16} aria-hidden="true" /> New student? Register online to get started.</p>
            </div>

            <figure className="landing-hero-visual">
              <div className="landing-visual-heading">
                <span className="landing-eyebrow">A CLEAR ROAD AHEAD</span>
                <p>A little guidance.<br />A lot more confidence.</p>
              </div>
              <img src={drivingIllustration} alt="A blue learner car on a calm road, with a learner sign on its roof" width="560" height="330" fetchPriority="high" />
              <figcaption>
                <span className="landing-visual-icon"><CarFront size={23} aria-hidden="true" /></span>
                <span><strong>Learn. Practice. Drive.</strong><small>With you, from the very first lesson.</small></span>
                <ArrowRight size={20} aria-hidden="true" />
              </figcaption>
            </figure>
          </div>
        </section>

        <div className="landing-benefits">
          <div className="landing-container landing-benefits-grid">
            <div><CalendarDays size={23} aria-hidden="true" /><span><strong>Simple online booking</strong><small>Your lessons, on your schedule.</small></span></div>
            <div><BookOpen size={23} aria-hidden="true" /><span><strong>Theory to real-world practice</strong><small>Build knowledge and driving skills.</small></span></div>
            <div><ClipboardCheck size={23} aria-hidden="true" /><span><strong>Progress in one place</strong><small>Know what comes next.</small></span></div>
          </div>
        </div>

        <section className="landing-section landing-courses" id="courses" aria-labelledby="courses-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div><p className="landing-eyebrow">OUR COURSES</p><h2 id="courses-title">Build your skills.<br />Find your confidence.</h2></div>
              <p>From understanding the rules to getting behind the wheel, take your next step with a clear learning path.</p>
            </div>

            <div className="landing-course-grid">
              <article className="landing-course">
                <div className="landing-course-top"><span className="landing-course-icon"><BookOpen size={27} aria-hidden="true" /></span><span className="landing-course-label">THE FOUNDATION</span></div>
                <h3>Theoretical driving</h3>
                <p>Get to know the road before you take the wheel. Build an understanding of road rules, signs, and responsible driving.</p>
                <ul>
                  <li><Check size={17} aria-hidden="true" /> Traffic rules and road signs</li>
                  <li><Check size={17} aria-hidden="true" /> Road safety and driver awareness</li>
                  <li><Check size={17} aria-hidden="true" /> Classroom-based learning</li>
                </ul>
                <Link className="landing-course-link" to="/signup">Get started with theory <ArrowRight size={18} aria-hidden="true" /></Link>
              </article>
              <article className="landing-course">
                <div className="landing-course-top"><span className="landing-course-icon"><CarFront size={27} aria-hidden="true" /></span><span className="landing-course-label">BEHIND THE WHEEL</span></div>
                <h3>Practical driving</h3>
                <p>Put your knowledge into practice. Develop vehicle control and road confidence with guidance from your instructor.</p>
                <ul>
                  <li><Check size={17} aria-hidden="true" /> Manual and automatic options</li>
                  <li><Check size={17} aria-hidden="true" /> Vehicle basics and road maneuvers</li>
                  <li><Check size={17} aria-hidden="true" /> Instructor-guided driving sessions</li>
                </ul>
                <Link className="landing-course-link" to="/signup">Get started with practical <ArrowRight size={18} aria-hidden="true" /></Link>
              </article>
            </div>
            <p className="landing-course-note">Already registered? <Link to="/login">Sign in to see available schedules and packages.</Link></p>
          </div>
        </section>

        <section className="landing-section landing-steps-section" id="how-it-works" aria-labelledby="steps-title">
          <div className="landing-container">
            <p className="landing-eyebrow">HOW IT WORKS</p>
            <h2 id="steps-title">Your next step is a simple one.</h2>
            <p className="landing-section-description">A straightforward process, from registration to your first lesson.</p>
            <ol className="landing-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="landing-step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section" id="faqs" aria-labelledby="faqs-title">
          <div className="landing-container landing-faq-grid">
            <div className="landing-faq-heading">
              <p className="landing-eyebrow">A LITTLE MORE CLARITY</p>
              <h2 id="faqs-title">Good questions.<br />Simple answers.</h2>
              <p>Here are a few things to know before you begin your driving journey.</p>
            </div>
            <div className="landing-faq-list">
              {questions.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}<Plus className="landing-faq-plus" size={19} aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-container landing-final-cta" aria-labelledby="cta-title">
          <div><p className="landing-eyebrow">LET'S GET YOU STARTED</p><h2 id="cta-title">Your first step toward<br />a more confident drive.</h2><p>Create your student account. We'll guide you from there.</p></div>
          <Link className="landing-button landing-button-light" to="/signup">Create an account <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link className="landing-brand" to="/" aria-label="Easy Drive Driving School home">
            <img src={EasyDriveLogo} alt="" width="38" height="38" loading="lazy" />
            <span>Easy Drive<small>DRIVING SCHOOL</small></span>
          </Link>
          <p>Learn with confidence. Drive with care.</p>
          <nav aria-label="Footer navigation"><a href="#courses">Courses</a><a href="#faqs">FAQs</a><Link to="/login">Sign in</Link></nav>
        </div>
        <div className="landing-container landing-footer-bottom"><p>&copy; {new Date().getFullYear()} Easy Drive Driving School.</p><a href="#top">Back to top ↑</a></div>
      </footer>
    </div>
  );
}

export default LandingPage;
