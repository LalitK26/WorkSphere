import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import whiteLogoImage from '../../assets/white_logo1.png';

// Configurable UI text
const UI_TEXT = {
  companyName: 'WORKSPHERE INDIA',
  welcomeHeading: 'Welcome back!',
  loginSubheading: 'Login to your account!',
  helperText: 'Enter your registered email address and password to login!',
  emailLabel: 'Email address',
  passwordLabel: 'Password',
  stayLoggedIn: 'Stay logged in',
  loginButton: 'Log in',
  loginButtonLoading: 'Logging in...',
  helpText: 'Need help? Contact support',
  emailRequired: 'Email address is required',
  emailInvalid: 'Please enter a valid email address',
  passwordRequired: 'Password is required',
  loginFailed: 'Invalid email or password',
  attemptsRemaining: (count) => `${count} attempt${count !== 1 ? 's' : ''} remaining`,
  accountLocked: 'Account temporarily locked due to multiple failed login attempts',
  lockoutMessage: (minutes, seconds) => `Please try again in ${minutes}:${String(seconds).padStart(2, '0')}`,
  lockoutExpired: 'You can now try logging in again',
};

// Security constants
const MAX_ATTEMPTS = 4;
const LOCKOUT_DURATION = 4 * 60 * 1000; // 4 minutes in milliseconds

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const lockoutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Load saved email on mount (NEVER load password from storage)
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedStayLoggedIn = localStorage.getItem('stayLoggedIn') === 'true';

    if (savedStayLoggedIn && savedEmail) {
      setEmail(savedEmail);
      setStayLoggedIn(true);
      // Password is never stored or retrieved for security
    }

    // Check for existing lockout
    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
      const endTime = parseInt(lockoutEndTime, 10);
      const now = Date.now();
      if (endTime > now) {
        setIsLocked(true);
        const remaining = Math.ceil((endTime - now) / 1000);
        setLockoutTimeRemaining(remaining);
        startCountdown(endTime);
      } else {
        localStorage.removeItem('lockoutEndTime');
        localStorage.removeItem('failedAttempts');
      }
    }

    // Restore failed attempts count
    const savedAttempts = localStorage.getItem('failedAttempts');
    if (savedAttempts) {
      const attempts = parseInt(savedAttempts, 10);
      setFailedAttempts(attempts);
      setAttemptsRemaining(MAX_ATTEMPTS - attempts);
    }

    return () => {
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const startCountdown = (endTime) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining <= 0) {
        setIsLocked(false);
        setLockoutTimeRemaining(0);
        setFailedAttempts(0);
        setAttemptsRemaining(MAX_ATTEMPTS);
        localStorage.removeItem('lockoutEndTime');
        localStorage.removeItem('failedAttempts');
        clearInterval(countdownIntervalRef.current);
      } else {
        setLockoutTimeRemaining(remaining);
      }
    }, 1000);
  };

  const validateEmail = (emailValue) => {
    if (!emailValue.trim()) {
      setEmailError(UI_TEXT.emailRequired);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError(UI_TEXT.emailInvalid);
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    validateEmail(email);
  };

  const handleLockout = () => {
    const endTime = Date.now() + LOCKOUT_DURATION;
    setIsLocked(true);
    setLockoutTimeRemaining(Math.ceil(LOCKOUT_DURATION / 1000));
    localStorage.setItem('lockoutEndTime', endTime.toString());
    startCountdown(endTime);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only clear email validation error, keep login error visible until we have a result
    setEmailError('');

    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    if (!password.trim()) {
      setError(UI_TEXT.passwordRequired);
      return;
    }

    // Check if account is locked
    if (isLocked) {
      return;
    }

    setLoading(true);
    // Clear previous error only right before attempting login
    setError('');

    try {
      await login(email, password);
      
      // Save email only if "Stay logged in" is checked (NEVER store password)
      if (stayLoggedIn) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('stayLoggedIn', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('stayLoggedIn');
      }

      // Reset failed attempts on successful login
      setFailedAttempts(0);
      setAttemptsRemaining(MAX_ATTEMPTS);
      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockoutEndTime');

      navigate('/dashboard');
    } catch (err) {
      const newFailedAttempts = failedAttempts + 1;
      const newAttemptsRemaining = MAX_ATTEMPTS - newFailedAttempts;
      
      setFailedAttempts(newFailedAttempts);
      setAttemptsRemaining(newAttemptsRemaining);
      localStorage.setItem('failedAttempts', newFailedAttempts.toString());

      if (newFailedAttempts >= MAX_ATTEMPTS) {
        handleLockout();
        setError(UI_TEXT.accountLocked);
      } else {
        // Extract actual error message from backend if available
        const backendErrorMessage = err?.response?.data?.message || err?.message || null;
        const errorMessage = backendErrorMessage 
          ? `${backendErrorMessage}. ${UI_TEXT.attemptsRemaining(newAttemptsRemaining)}`
          : `${UI_TEXT.loginFailed}. ${UI_TEXT.attemptsRemaining(newAttemptsRemaining)}`;
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = () => {
    const minutes = Math.floor(lockoutTimeRemaining / 60);
    const seconds = lockoutTimeRemaining % 60;
    return UI_TEXT.lockoutMessage(minutes, seconds);
  };

  // Prevent scrolling on login page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left Branding Panel - Hidden on mobile/tablet */}
      <div
        className="hidden lg:block w-1/2 h-full overflow-hidden relative"
        style={{
          backgroundImage: `url('/branding_panel.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
      </div>

      {/* Right Login Section */}
      <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center px-6 py-6 overflow-hidden">
        {/* Login Card */}
        <div className="w-full max-w-[420px] bg-white rounded-xl shadow-lg p-8 mx-auto">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src={whiteLogoImage}
              alt="WorkSphere Logo"
              className="h-8 w-8 object-contain bg-blue-600 rounded p-1"
            />
            <h1 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              {UI_TEXT.companyName}
            </h1>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {UI_TEXT.welcomeHeading}
            </h2>
            <h3 className="text-lg text-gray-700 mb-3">
              {UI_TEXT.loginSubheading}
            </h3>
            <p className="text-sm text-gray-500 opacity-75">
              {UI_TEXT.helperText}
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {UI_TEXT.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="name@gmail.com"
                aria-label={UI_TEXT.emailLabel}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                disabled={isLocked || loading}
              />
              {emailError && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {UI_TEXT.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 ${
                    error && !emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  aria-label={UI_TEXT.passwordLabel}
                  disabled={isLocked || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                  disabled={isLocked || loading}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* Stay Logged In Checkbox */}
            <div className="flex items-center">
              <input
                id="stayLoggedIn"
                name="stayLoggedIn"
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLocked || loading}
              />
              <label htmlFor="stayLoggedIn" className="ml-2 block text-sm text-gray-700">
                {UI_TEXT.stayLoggedIn}
              </label>
            </div>

            {/* Error Messages */}
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Lockout Message */}
            {isLocked && (
              <div
                className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm"
                role="alert"
                aria-live="polite"
              >
                <p className="font-medium mb-1">{UI_TEXT.accountLocked}</p>
                <p>{formatLockoutTime()}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className={`w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                loading ? 'cursor-wait' : ''
              }`}
              aria-label={loading ? UI_TEXT.loginButtonLoading : UI_TEXT.loginButton}
            >
              {loading ? UI_TEXT.loginButtonLoading : UI_TEXT.loginButton}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Need help?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
