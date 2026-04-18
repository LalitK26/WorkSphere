import { useState, useEffect, useCallback } from 'react';
import { recruitmentAuthService } from '../../api/recruitmentAuthService';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase } from 'react-icons/fi';

const RESEND_THROTTLE_SECONDS = 30;

export default function ForgotPasswordFlow({ onBack, onSuccess }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const startResendCountdown = useCallback(() => {
    setResendCountdown(RESEND_THROTTLE_SECONDS);
  }, []);

  useEffect(() => {
    if (step !== 'otp' || resendCountdown <= 0) return;
    const t = setInterval(() => {
      setResendCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [step, resendCountdown]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const em = email.trim();
    if (!em) {
      setError('Please enter your registered email address.');
      return;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(em)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await recruitmentAuthService.forgotPassword.requestOtp(em);
      setSuccessMessage('If this email is registered, you will receive an OTP shortly. Check your inbox and spam folder.');
      setEmail(em);
      setStep('otp');
      setOtp('');
      startResendCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await recruitmentAuthService.forgotPassword.requestOtp(email);
      setSuccessMessage('A new OTP has been sent to your email.');
      startResendCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const o = otp.replace(/\D/g, '');
    if (o.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await recruitmentAuthService.forgotPassword.verifyOtp(email, o);
      setStep('password');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    const o = otp.replace(/\D/g, '');
    if (o.length !== 6) {
      setError('Session expired. Please start the forgot password flow again.');
      return;
    }
    setLoading(true);
    try {
      await recruitmentAuthService.forgotPassword.changePassword(email, o, newPassword, confirmPassword);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] bg-white rounded-xl shadow-lg p-5 sm:p-6 my-auto">
      <div className="mb-4 flex flex-col items-center lg:hidden">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
          <FiBriefcase className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 text-center">Recruitment Desk</h1>
        <p className="text-xs text-blue-600">Internal Hiring & Talent Management</p>
      </div>
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 text-center">Forgot Password</h2>
        <p className="text-xs sm:text-sm text-blue-600 text-center">
          {step === 'email' && 'Enter your registered email to receive a verification code.'}
          {step === 'otp' && 'Enter the 6-digit code sent to your email.'}
          {step === 'password' && 'Set a new password for your account.'}
        </p>
      </div>

      {step === 'email' && (
        <form onSubmit={handleRequestOtp} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Enter Registered Email *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FiMail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                disabled={loading}
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs" role="alert">{error}</p>}
          {successMessage && <p className="text-green-600 text-xs">{successMessage}</p>}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-xs"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Verification Code *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              autoComplete="one-time-code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-base tracking-widest font-mono"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-gray-500">
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Didn\'t receive?'}
            </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0 || loading}
              className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </div>
          {error && <p className="text-red-500 text-xs" role="alert">{error}</p>}
          {successMessage && <p className="text-green-600 text-xs">{successMessage}</p>}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setSuccessMessage(''); }}
              className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-xs"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || otp.replace(/\D/g, '').length !== 6}
              className="flex-1 py-2 px-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FiLock className="w-4 h-4" />
              </span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm Password *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <FiLock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs" role="alert">{error}</p>}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { setStep('otp'); setError(''); }}
              className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-xs"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="flex-1 py-2 px-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 text-center space-y-1.5">
        <p>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Sign in
          </button>
        </p>
        <p className="text-xs text-blue-600">Need access? Contact your system administrator</p>
        <p className="text-xs text-gray-500">© 2026 Recruitment Desk. All rights reserved.</p>
      </div>
    </div>
  );
}
