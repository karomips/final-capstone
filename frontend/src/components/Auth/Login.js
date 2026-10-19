import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import { ArrowLeft, ArrowRight, CalendarClock, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSwitchingAuthPage, setIsSwitchingAuthPage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.remove('auth-transition-out');
    document.body.classList.add('auth-transition-in');

    const timer = setTimeout(() => {
      document.body.classList.remove('auth-transition-in');
    }, 320);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('auth-transition-in');
    };
  }, []);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
    }
  }, [location.state]);

  const handleAuthPageSwitch = (e, targetPath) => {
    e.preventDefault();

    if (isSwitchingAuthPage) {
      return;
    }

    setIsSwitchingAuthPage(true);
    document.body.classList.add('auth-transition-out');

    setTimeout(() => {
      navigate(targetPath);
    }, 190);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const loginResult = await login(email, password);
      setSuccessMessage('');
      
      console.log('Login result:', loginResult);
      
      // Get the actual account role from database
      let actualRole = 'user'; // Default to user
      if (email.toLowerCase() === 'admin@gmail.com' || loginResult?.userDoc?.role === 'admin') {
        actualRole = 'admin';
      } else if (loginResult?.userDoc?.role === 'instructor') {
        actualRole = 'instructor';
      }
      
      console.log('Auto-detected role:', actualRole);
      
      // Auto-route based on actual role
      if (actualRole === 'admin') {
        navigate('/admin');
      } else if (actualRole === 'instructor') {
        navigate('/instructor');
      } else {
        navigate('/user-dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message.includes('Invalid credentials') || error.message.includes('user')) {
        setError('Invalid email or password');
      } else if (error.message.includes('email')) {
        setError('Invalid email address');
      } else if (error.message.includes('not approved')) {
        setError('Your account is pending approval. Please contact the administrator.');
      } else {
        setError('Failed to log in: ' + error.message);
      }
    }
    
    setLoading(false);
  };

  const togglePasswordVisibility = () => {
    const input = document.getElementById('password');
    let saved = null;
    if (input) {
      saved = {
        scroll: input.scrollLeft,
        selStart: input.selectionStart,
        selEnd: input.selectionEnd,
      };
    }

    const newShow = !showPassword;
    setShowPassword(newShow);

    // fallback to type change if text-security isn't supported
    if (input && input.style.webkitTextSecurity === undefined) {
      input.type = newShow ? 'text' : 'password';
    }

    // restore position after DOM updates
    setTimeout(() => {
      if (input && saved) {
        input.scrollLeft = saved.scroll;
        try {
          input.setSelectionRange(saved.selStart, saved.selEnd);
        } catch {}
      }
    }, 0);
  };

  return (
    <div className="auth-container login-page">
      <div className="login-stage">
        <Link className="auth-home-link login-home-link" to="/"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
        <div className="login-panel">
          <aside className="login-brand">
            <p className="login-brand-kicker">Easy Drive Driving School</p>
            <div className="login-logo">
              <img src={EasyDriveLogo} alt="Easy Drive Driving School Logo" />
            </div>
            <h2>Ready when you are.</h2>
            <p className="login-brand-copy">
              Book lessons, track progress, and stay connected with your instructor — all from one place.
            </p>
            <ul className="login-highlights">
              <li>
                <CalendarClock size={18} />
                Flexible lesson scheduling
              </li>
              <li>
                <ShieldCheck size={18} />
                Licensed professional instructors
              </li>
            </ul>
          </aside>

          <section className="login-form-wrap">
            <div className="login-header">
              <p className="login-eyebrow">Welcome back</p>
              <h1>Sign in</h1>
              <p className="login-subtitle">Use your Easy Drive account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form login-form">
              {successMessage && <div className="success-message">{successMessage}</div>}
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon login-input">
                  <span className="login-input-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon login-input">
                  <span className="login-input-icon" aria-hidden="true">
                    <Lock size={18} />
                  </span>
                  <input
                    type="text" /* remain text for stable layout */
                    className={showPassword ? '' : 'password-hidden'}
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="remember-me login-remember">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember">Keep me signed in</label>
              </div>

              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight size={18} />}
              </button>

              <div className="auth-footer login-footer">
                <span>New student?</span>
                <Link to="/signup" onClick={(e) => handleAuthPageSwitch(e, '/signup')}>
                  Create an account
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;
