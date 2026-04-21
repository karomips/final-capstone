import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import { Eye, EyeOff } from "lucide-react";

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

  return (
    <div className="auth-container">
      <div className="auth-split-left">
  <div className="auth-logo-section">
    <div className="auth-logo">
      <img src={EasyDriveLogo} alt="Easy Drive Driving School Logo" />
    </div>

    <div className="auth-tagline">
      Drive Smart. Drive Safe.<br />
      <span style={{ fontWeight: '600' }}>Professional Driving Education</span>
    </div>
  </div>
</div>

      <div className="auth-split-right">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Log In</h1>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type="email"
                  id="email"
                  placeholder=""
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type="text" /* remain text for stable layout */
                  className={showPassword ? '' : 'password-hidden'}
                  id="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => {
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
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="remember-me">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Remember me</label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing In...' : 'Log In'}
            </button>

            <div className="auth-footer">
              <Link to="/signup" onClick={(e) => handleAuthPageSwitch(e, '/signup')}>
                Register →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
