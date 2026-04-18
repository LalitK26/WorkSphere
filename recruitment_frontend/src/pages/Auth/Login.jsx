import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { recruitmentAuthService } from '../../api/recruitmentAuthService';
import ForgotPasswordFlow from './ForgotPasswordFlow';
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiBriefcase,
  FiUsers,
  FiCalendar,
  FiShield,
  FiInfo,
} from 'react-icons/fi';
import { addPendingNotification, mergePendingNotifications } from '../../utils/notificationStorage';
import logo from '../../assets/worksphere-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordChangedMessage, setPasswordChangedMessage] = useState('');
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [showVerifyOtp, setShowVerifyOtp] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState('');

  // Login Attempt State
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 4 * 60 * 1000; // 4 minutes

  const getStoredAttempts = () => {
    const stored = sessionStorage.getItem('remainingAttempts');
    return stored ? parseInt(stored, 10) : MAX_ATTEMPTS;
  };

  const getStoredLockout = () => {
    const stored = sessionStorage.getItem('lockUntilTimestamp');
    return stored ? parseInt(stored, 10) : null;
  };

  const [remainingAttempts, setRemainingAttempts] = useState(getStoredAttempts);
  const [lockUntilTimestamp, setLockUntilTimestamp] = useState(getStoredLockout);
  const [countdown, setCountdown] = useState('');

  // Timer Effect
  useEffect(() => {
    if (!lockUntilTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = lockUntilTimestamp - now;

      if (diff <= 0) {
        setLockUntilTimestamp(null);
        setRemainingAttempts(MAX_ATTEMPTS);
        sessionStorage.removeItem('lockUntilTimestamp');
        sessionStorage.setItem('remainingAttempts', MAX_ATTEMPTS.toString());
        setError('');
        setCountdown('');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockUntilTimestamp]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) return;

    setRegisterData(prev => ({ ...prev, phoneNumber: value }));

    if (value.length > 0 && value.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return null;

    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const lengthValid = pass.length >= 8;

    // Weak: Less than 8 chars OR only letters OR only numbers
    if (!lengthValid || !hasLetters || !hasNumbers) {
      return { label: 'Weak Password', color: 'bg-red-500', textColor: 'text-red-500', width: '33%' };
    }

    // Strong: >= 8 chars, Upper, Lower, Numbers, Special
    if (hasUpper && hasLower && hasNumbers && hasSpecial) {
      return { label: 'Strong Password', color: 'bg-green-500', textColor: 'text-green-500', width: '100%' };
    }

    // Moderate: >= 8 chars, Letters + Numbers
    return { label: 'Moderate Password', color: 'bg-orange-500', textColor: 'text-orange-500', width: '66%' };
  };

  const validateEmail = (emailValue) => {
    // Regex: Valid characters + @ + Valid domain + . + TLD (at least 2 chars)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailValue) {
      setEmailError('');
      return false;
    }

    if (!emailRegex.test(emailValue.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    // Common typo checks
    const lowerEmail = emailValue.trim().toLowerCase();
    if (lowerEmail.endsWith('@gmail.co')) {
      setEmailError('Did you mean @gmail.com?');
      return false;
    }
    if (lowerEmail.endsWith('@yahoo.co')) {
      setEmailError('Did you mean @yahoo.com?');
      return false;
    }
    if (lowerEmail.endsWith('@hotmail.co')) {
      setEmailError('Did you mean @hotmail.com?');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stop any parent form handling

    // Check Lockout
    if (lockUntilTimestamp && Date.now() < lockUntilTimestamp) {
      return;
    }

    setError('');
    setPasswordChangedMessage('');
    setLoading(true);

    try {
      const response = await login(email, password);

      // Success: Reset attempts
      setRemainingAttempts(MAX_ATTEMPTS);
      setLockUntilTimestamp(null);
      sessionStorage.removeItem('remainingAttempts');
      sessionStorage.removeItem('lockUntilTimestamp');

      if (response.role === 'CANDIDATE' && response.userId) {
        mergePendingNotifications(String(response.userId));
      }
      if (response.role === 'CANDIDATE' && !response.isProfileComplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Failure Handling
      const newAttempts = remainingAttempts - 1;
      setRemainingAttempts(newAttempts);
      sessionStorage.setItem('remainingAttempts', newAttempts.toString());

      if (newAttempts <= 0) {
        const lockTime = Date.now() + LOCKOUT_DURATION;
        setLockUntilTimestamp(lockTime);
        sessionStorage.setItem('lockUntilTimestamp', lockTime.toString());
        setError(''); // Clear standard error, lockout UI takes over
      } else {
        const attemptText = newAttempts === 1 ? 'attempt' : 'attempts';
        setError(`Incorrect password. ${newAttempts} ${attemptText} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setPasswordMatchError('');

    if (!confirmPassword) {
      setPasswordMatchError('Please confirm your password');
      return;
    }

    if (registerData.password !== confirmPassword) {
      setPasswordMatchError('Passwords do not match');
      return;
    }

    const isEmailValid = validateEmail(registerData.email);
    if (!isEmailValid) {
      return;
    }


    setRegisterLoading(true);

    try {
      await recruitmentAuthService.registerCandidate(registerData);
      setShowVerifyOtp(true);
      setResendTimer(60);
      setRegisterError('');
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      await recruitmentAuthService.verifyRegistration(registerData.email, verifyOtp);
      addPendingNotification({
        title: 'Account created successfully',
        message: 'Your candidate account has been created. You can now sign in.',
      });
      setShowRegister(false);
      setShowVerifyOtp(false);
      setVerifyOtp('');
      setEmail(registerData.email);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      await recruitmentAuthService.resendRegistrationOtp(registerData.email);
      setResendTimer(60);
      setVerifyError('');
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Resend failed');
    }
  };

  const handleForgotPasswordSuccess = () => {
    setShowForgotPassword(false);
    setPasswordChangedMessage('Password updated successfully. You can now sign in with your new password.');
  };

  if (showForgotPassword) {
    return (
      <div className="h-screen w-full flex flex-col lg:flex-row bg-[radial-gradient(circle_at_20%_20%,#e8f1ff_0%,#f7fbff_40%,#ffffff_70%)] overflow-hidden">
        <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-center px-6 xl:px-8 2xl:px-12 py-4">
          <div className="w-full max-w-lg 2xl:max-w-xl space-y-2.5 xl:space-y-3 2xl:space-y-4">
            <div className="flex justify-center">
              <img
                src={logo}
                alt="WorkSphere India"
                className="w-44 xl:w-48 2xl:w-56 h-auto object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900 leading-tight">Careers at WorkSphere India</h1>
            </div>
            <div className="space-y-2 xl:space-y-2.5 2xl:space-y-3 text-left pt-1">
              <div>
                <p className="text-xs xl:text-sm 2xl:text-base text-gray-700 leading-snug">
                  Welcome to the official hiring portal of WorkSphere India.
                  This platform is the single place where we share our current job openings and manage applications from talented individuals who want to grow with us.
                </p>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiBriefcase className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Simple & Transparent Application Process</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Apply online, track your application status, and stay informed at every stage of the hiring process.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiUsers className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Fair & Structured Hiring</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Our recruitment process is designed to be clear, unbiased, and focused on finding the right fit — for both you and our team.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiCalendar className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Build Your Career With Us</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">We're always looking for passionate people who want to learn, innovate, and make an impact.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <FiShield className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs 2xl:text-sm text-gray-600">Enterprise-grade security & compliance</p>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 h-screen flex items-center justify-center px-4 sm:px-6 py-4 overflow-y-auto">
          <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} onSuccess={handleForgotPasswordSuccess} />
        </div>
      </div>
    );
  }

  if (showRegister) {
    if (showVerifyOtp) {
      return (
        <div className="h-screen w-full flex flex-col lg:flex-row bg-[radial-gradient(circle_at_20%_20%,#e8f1ff_0%,#f7fbff_40%,#ffffff_70%)] overflow-hidden">
          <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-center px-6 xl:px-8 2xl:px-12 py-4">
            <div className="w-full max-w-lg 2xl:max-w-xl space-y-2.5 xl:space-y-3 2xl:space-y-4">
              <div className="flex justify-center">
                <img src={logo} alt="WorkSphere India" className="w-44 xl:w-48 2xl:w-56 h-auto object-contain" />
              </div>
              <div className="text-center">
                <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900 leading-tight">Careers at WorkSphere India</h1>
              </div>
              {/* Same features as main login */}
              <div className="space-y-2 xl:space-y-2.5 2xl:space-y-3 text-left pt-1">
                <div>
                  <p className="text-xs xl:text-sm 2xl:text-base text-gray-700 leading-snug">
                    Welcome to the official hiring portal of WorkSphere India.
                    Please verify your email to complete the registration process.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 h-screen flex items-center justify-center px-4 sm:px-6 py-4 overflow-y-auto">
            <div className="w-full max-w-[380px] 2xl:max-w-[420px] bg-white rounded-xl shadow-lg p-5 sm:p-6 2xl:p-8 my-auto">
              <div className="mb-4 flex flex-col items-center lg:hidden">
                <img src={logo} alt="WorkSphere India" className="w-32 sm:w-36 h-auto object-contain mb-2" />
              </div>
              <div className="mb-4 2xl:mb-5">
                <h2 className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900 mb-1.5 2xl:mb-2 text-center">Verify Your Email</h2>
                <p className="text-xs sm:text-sm 2xl:text-base text-gray-600 text-center">
                  We've sent a code to <span className="font-medium text-gray-900">{registerData.email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-3 2xl:space-y-4">
                <div>
                  <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Enter OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-lg font-bold"
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                  />
                </div>

                {verifyError && <p className="text-red-500 text-xs 2xl:text-sm text-center">{verifyError}</p>}

                <button
                  type="submit"
                  disabled={verifyLoading || verifyOtp.length !== 6}
                  className="w-full py-2 2xl:py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify Account'}
                </button>

                <div className="text-center text-xs 2xl:text-sm text-gray-600 mt-4">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <button
                    type="button"
                    onClick={() => setShowVerifyOtp(false)}
                    className="text-xs 2xl:text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to Signup
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }
    const strength = getPasswordStrength(registerData.password);
    return (
      <div className="h-screen w-full flex flex-col lg:flex-row bg-[radial-gradient(circle_at_20%_20%,#e8f1ff_0%,#f7fbff_40%,#ffffff_70%)] overflow-hidden">
        {/* Branding Panel (desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-center px-6 xl:px-8 2xl:px-12 py-4">
          <div className="w-full max-w-lg 2xl:max-w-xl space-y-2.5 xl:space-y-3 2xl:space-y-4">
            {/* Logo - Centered */}
            <div className="flex justify-center">
              <img
                src={logo}
                alt="WorkSphere India"
                className="w-44 xl:w-48 2xl:w-56 h-auto object-contain"
              />
            </div>

            {/* Title and Subtitle - Centered */}
            <div className="text-center">
              <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900 leading-tight">Careers at WorkSphere India</h1>
            </div>

            {/* Features - Left aligned with balanced spacing */}
            <div className="space-y-2 xl:space-y-2.5 2xl:space-y-3 text-left pt-1">
              <div>
                <p className="text-xs xl:text-sm 2xl:text-base text-gray-700 leading-snug">
                  Welcome to the official hiring portal of WorkSphere India.
                  This platform is the single place where we share our current job openings and manage applications from talented individuals who want to grow with us.
                </p>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiBriefcase className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Simple & Transparent Application Process</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Apply online, track your application status, and stay informed at every stage of the hiring process.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiUsers className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Fair & Structured Hiring</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Our recruitment process is designed to be clear, unbiased, and focused on finding the right fit — for both you and our team.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 2xl:gap-3">
                <FiCalendar className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Build Your Career With Us</p>
                  <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">We're always looking for passionate people who want to learn, innovate, and make an impact.</p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <FiShield className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs 2xl:text-sm text-gray-600">Enterprise-grade security & compliance</p>
            </div>
          </div>
        </div>

        {/* Register Card */}
        <div className="w-full lg:w-1/2 h-screen flex items-center justify-center px-4 sm:px-6 py-4 overflow-y-auto">
          <div className="w-full max-w-[380px] 2xl:max-w-[420px] bg-white rounded-xl shadow-lg p-5 sm:p-6 2xl:p-8 my-auto">
            <div className="mb-4 flex flex-col items-center lg:hidden">
              <img
                src={logo}
                alt="WorkSphere India"
                className="w-32 sm:w-36 h-auto object-contain mb-2"
              />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 text-center">Careers at WorkSphere India</h1>
            </div>
            <div className="mb-4 2xl:mb-5">
              <h2 className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900 mb-1.5 2xl:mb-2 text-center">Create Account</h2>
              <p className="text-xs sm:text-sm 2xl:text-base text-blue-600 text-center">For candidates applying through Recruitment Desk</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-3 2xl:space-y-4">
              <div>
                <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Email</label>
                <input
                  type="email"
                  required
                  className={`w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  value={registerData.email}
                  onChange={(e) => {
                    setRegisterData({ ...registerData, email: e.target.value });
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(registerData.email)}
                />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    className="w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm pr-10"
                    value={registerData.password}
                    onChange={(e) => {
                      setRegisterData({ ...registerData, password: e.target.value });
                      if (passwordMatchError) setPasswordMatchError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showRegisterPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {strength && (
                  <div className="mt-2 text-left">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300 ease-out`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className={`text-xs mt-1 font-medium ${strength.textColor}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm pr-10 ${passwordMatchError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordMatchError) setPasswordMatchError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordMatchError && <p className="text-red-500 text-xs mt-1">{passwordMatchError}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 2xl:gap-4">
                <div>
                  <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 2xl:px-4 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium border-r border-gray-300 pr-2 text-xs 2xl:text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    className="w-full pl-12 2xl:pl-14 pr-3 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm text-gray-900 placeholder-gray-400"
                    value={registerData.phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                  />
                </div>
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>
              {registerError && <p className="text-red-500 text-xs 2xl:text-sm">{registerError}</p>}
              <button
                type="submit"
                disabled={registerLoading || !!phoneError || registerData.phoneNumber.length !== 10}
                className="w-full py-2 2xl:py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs 2xl:text-sm"
              >
                {registerLoading ? 'Creating...' : 'Create Account'}
              </button>
              <p className="text-center text-xs 2xl:text-sm text-gray-600">
                Already a registered user?{' '}
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Please sign in
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-[radial-gradient(circle_at_20%_20%,#e8f1ff_0%,#f7fbff_40%,#ffffff_70%)] overflow-hidden">
      {/* Branding Panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-center px-6 xl:px-8 2xl:px-12 py-4">
        <div className="w-full max-w-lg 2xl:max-w-xl space-y-2.5 xl:space-y-3 2xl:space-y-4">
          {/* Logo - Centered */}
          <div className="flex justify-center">
            <img
              src={logo}
              alt="WorkSphere India"
              className="w-44 xl:w-48 2xl:w-56 h-auto object-contain"
            />
          </div>

          {/* Title and Subtitle - Centered */}
          <div className="text-center">
            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900 leading-tight">Careers at WorkSphere India</h1>
          </div>

          {/* Features - Left aligned with balanced spacing */}
          <div className="space-y-2 xl:space-y-2.5 2xl:space-y-3 text-left pt-1">
            <div>
              <p className="text-xs xl:text-sm 2xl:text-base text-gray-700 leading-snug">
                Welcome to the official hiring portal of WorkSphere India.
                This platform is the single place where we share our current job openings and manage applications from talented individuals who want to grow with us.
              </p>
            </div>

            <div className="flex items-start gap-2.5 2xl:gap-3">
              <FiBriefcase className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Simple & Transparent Application Process</p>
                <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Apply online, track your application status, and stay informed at every stage of the hiring process.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 2xl:gap-3">
              <FiUsers className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Fair & Structured Hiring</p>
                <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">Our recruitment process is designed to be clear, unbiased, and focused on finding the right fit — for both you and our team.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 2xl:gap-3">
              <FiCalendar className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-900">Build Your Career With Us</p>
                <p className="text-xs 2xl:text-sm text-gray-600 mt-0.5 leading-snug">We're always looking for passionate people who want to learn, innovate, and make an impact.</p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <FiShield className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-600 flex-shrink-0" />
            <p className="text-xs 2xl:text-sm text-gray-600">Enterprise-grade security & compliance</p>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full lg:w-1/2 h-screen flex items-center justify-center px-4 sm:px-6 py-4 overflow-y-auto">
        <div className="w-full max-w-[380px] 2xl:max-w-[420px] bg-white rounded-xl shadow-lg p-5 sm:p-6 2xl:p-8 my-auto">
          {/* Mobile Branding Header */}
          <div className="mb-4 flex flex-col items-center lg:hidden">
            <img
              src={logo}
              alt="WorkSphere India"
              className="w-32 sm:w-36 h-auto object-contain mb-2"
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 text-center">Careers at WorkSphere India</h1>
          </div>

          {/* Card Header - Centered */}
          <div className="mb-4 2xl:mb-5">
            <h2 className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900 mb-1.5 2xl:mb-2 text-center">Sign in to your account</h2>
            <p className="text-xs sm:text-sm 2xl:text-base text-blue-600 text-center leading-snug">Access your application, track progress, and stay connected with our hiring team.</p>
          </div>

          {passwordChangedMessage && (
            <div className="mb-3 2xl:mb-4 p-2.5 2xl:p-3 bg-green-50 border border-green-200 rounded-lg text-xs 2xl:text-sm text-green-800" role="status">
              {passwordChangedMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 2xl:space-y-4">
            <div>
              <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Email Address *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FiMail className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </span>
                <input
                  type="email"
                  required
                  className="w-full pl-9 2xl:pl-11 pr-3 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPasswordChangedMessage(''); }}
                  placeholder="your.email@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs 2xl:text-sm font-medium text-gray-700 mb-1.5 2xl:mb-2">Password *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <FiLock className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-9 2xl:pl-11 pr-9 2xl:pr-11 py-2 2xl:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-sm"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordChangedMessage(''); }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 2xl:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4 2xl:w-5 2xl:h-5" /> : <FiEye className="w-4 h-4 2xl:w-5 2xl:h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message & Lockout Display */}
            {(error || lockUntilTimestamp) && (
              <div className="text-red-500 text-xs 2xl:text-sm font-medium mt-2" role="alert">
                {lockUntilTimestamp ? (
                  <div className="space-y-1">
                    <p>Too many failed attempts.</p>
                    <p>Please try again in 4 minutes.</p>
                    <p className="font-bold">Login disabled for {countdown}</p>
                  </div>
                ) : (
                  <p>{error}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs 2xl:text-sm flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 text-gray-700">
                <input type="checkbox" className="h-3.5 w-3.5 2xl:h-4 2xl:w-4 text-blue-600 border-gray-300 rounded" />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(''); setPasswordChangedMessage(''); }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </button>
            </div>



            <button
              type="submit"
              disabled={loading || !!lockUntilTimestamp}
              className="w-full py-2 2xl:py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs 2xl:text-sm"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 2xl:p-3 flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5 text-blue-600">
                <FiInfo className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
              </div>
              <p className="text-xs 2xl:text-sm text-gray-700 leading-snug">
                This system is restricted to authorized personnel. All activities are monitored for security purposes.
              </p>
            </div>

            <p className="text-center text-xs 2xl:text-sm text-gray-600">
              Not a registered user yet?{' '}
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create an account to apply
              </button>
            </p>
          </form>

          <div className="mt-4 2xl:mt-5 text-center space-y-1.5">
            <p className="text-xs 2xl:text-sm text-blue-600">Need access? Contact your system administrator</p>
            <p className="text-xs 2xl:text-sm text-gray-500">© 2026 WorkSphere India. All rights reserved.</p>
          </div>
        </div>
      </div >
    </div >
  );
};

export default Login;

