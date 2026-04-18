import React, { useState } from 'react';
import { FiShield, FiCheckCircle, FiAlertCircle, FiLoader, FiLock } from 'react-icons/fi';
import aadhaarKycService from '../../api/aadhaarKycService';

const AadhaarKyc = ({ onVerificationSuccess, onSkip }) => {
    const [step, setStep] = useState('consent'); // consent, aadhaar-input, otp-verification, success
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [clientId, setClientId] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);
    const [aadhaarData, setAadhaarData] = useState(null);

    const handleConsentAccept = () => {
        if (consentGiven) {
            setStep('aadhaar-input');
            setError('');
        } else {
            setError('Please accept the consent to proceed');
        }
    };

    const handleGenerateOtp = async () => {
        if (!aadhaarNumber || !aadhaarNumber.match(/^\d{12}$/)) {
            setError('Please enter a valid 12-digit Aadhaar number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await aadhaarKycService.generateOtp(aadhaarNumber);
            // console.log('Generate OTP Response:', response);
            // console.log('ClientId from response:', response.clientId);

            // Validate that clientId is present in the response
            if (!response.clientId || response.clientId.trim() === '') {
                console.error('Missing clientId in response:', response);
                setError('Failed to generate OTP session. Please try again.');
                setLoading(false);
                return;
            }

            setClientId(response.clientId);
            setStep('otp-verification');
            setError('');
        } catch (err) {
            console.error('Generate OTP Error:', err);
            setError(err.response?.data?.message || 'Failed to generate OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitOtp = async () => {
        if (!otp || !otp.match(/^\d{6}$/)) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        // console.log('Current clientId state:', clientId);
        // console.log('Current OTP:', otp);

        // Validate clientId is present
        if (!clientId || clientId.trim() === '') {
            console.error('ClientId is missing! Cannot submit OTP.');
            setError('Session expired. Please generate OTP again.');
            setStep('aadhaar-input');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await aadhaarKycService.submitOtp(clientId, otp);
            // console.log('Submit OTP Response:', response);

            if (response.verified && response.aadhaarData) {
                setAadhaarData(response.aadhaarData);
                setStep('success');

                // Call success callback with Aadhaar data
                if (onVerificationSuccess) {
                    onVerificationSuccess(response.aadhaarData);
                }
            } else {
                setError('OTP verification failed. Please try again.');
            }
        } catch (err) {
            console.error('Submit OTP Error:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.message || 'Invalid OTP. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = () => {
        setOtp('');
        setError('');
        setStep('aadhaar-input');
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <FiShield className="text-blue-600 text-xl" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Aadhaar eKYC Verification</h2>
                    <p className="text-gray-500 text-sm">Verify your identity using Aadhaar</p>
                </div>
            </div>

            {/* Consent Step */}
            {step === 'consent' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FiLock className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-900">
                                <p className="font-semibold mb-2">Consent for Aadhaar Verification</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-800">
                                    <li>I consent to share my Aadhaar number for identity verification</li>
                                    <li>I understand that my Aadhaar number will not be stored</li>
                                    <li>I authorize the system to fetch my details from UIDAI for profile completion</li>
                                    <li>I confirm that the Aadhaar number belongs to me</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="consent-checkbox"
                            checked={consentGiven}
                            onChange={(e) => setConsentGiven(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="consent-checkbox" className="text-sm text-gray-700">
                            I accept the terms and conditions for Aadhaar verification
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <FiAlertCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleConsentAccept}
                            disabled={!consentGiven || loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                        {onSkip && (
                            <button
                                onClick={onSkip}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Skip
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Aadhaar Input Step */}
            {step === 'aadhaar-input' && (
                <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                            Enter your 12-digit Aadhaar number. An OTP will be sent to your registered mobile number.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Aadhaar Number *
                        </label>
                        <input
                            type="text"
                            value={aadhaarNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                                setAadhaarNumber(value);
                                setError('');
                            }}
                            placeholder="Enter 12-digit Aadhaar number"
                            maxLength={12}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${error ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Your Aadhaar number will not be stored
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <FiAlertCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setStep('consent');
                                setAadhaarNumber('');
                                setError('');
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleGenerateOtp}
                            disabled={loading || !aadhaarNumber || aadhaarNumber.length !== 12}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <FiLoader className="animate-spin" />
                                    Generating OTP...
                                </>
                            ) : (
                                'Generate OTP'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* OTP Verification Step */}
            {step === 'otp-verification' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800">
                            <FiCheckCircle />
                            <p className="text-sm font-medium">
                                OTP has been sent to your registered mobile number
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enter OTP *
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setOtp(value);
                                setError('');
                            }}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest ${error ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <FiAlertCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleResendOtp}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Resend OTP
                        </button>
                        <button
                            onClick={handleSubmitOtp}
                            disabled={loading || !otp || otp.length !== 6}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <FiLoader className="animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify OTP'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800 mb-2">
                            <FiCheckCircle className="text-xl" />
                            <p className="font-semibold">Aadhaar Verified Successfully!</p>
                        </div>
                        <p className="text-sm text-green-700">
                            Your profile has been automatically populated with verified information from Aadhaar.
                        </p>
                    </div>

                    {aadhaarData && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Verified Information:</p>
                            <div className="space-y-1 text-sm text-gray-600">
                                {aadhaarData.fullName && (
                                    <p><span className="font-medium">Name:</span> {aadhaarData.fullName}</p>
                                )}
                                {aadhaarData.dateOfBirth && (
                                    <p><span className="font-medium">Date of Birth:</span> {aadhaarData.dateOfBirth}</p>
                                )}
                                {aadhaarData.address && (
                                    <p><span className="font-medium">Address:</span> {aadhaarData.address}</p>
                                )}
                                {aadhaarData.pincode && (
                                    <p><span className="font-medium">Pincode:</span> {aadhaarData.pincode}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (onVerificationSuccess) {
                                onVerificationSuccess(aadhaarData);
                            }
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                        Continue to Profile
                    </button>
                </div>
            )}
        </div>
    );
};

export default AadhaarKyc;

