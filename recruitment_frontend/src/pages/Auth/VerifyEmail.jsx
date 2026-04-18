import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recruitmentAuthService } from '../../api/recruitmentAuthService';
import logo from '../../assets/worksphere-logo.png';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email address...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                await recruitmentAuthService.verifyEmail(token);
                setStatus('success');
                setMessage('Email verified successfully! You can now log in.');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. The link may satisfy expired or invalid.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="h-screen w-full flex bg-[radial-gradient(circle_at_20%_20%,#e8f1ff_0%,#f7fbff_40%,#ffffff_70%)] overflow-hidden">
            <div className="w-full flex items-center justify-center px-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <img src={logo} alt="WorkSphere India" className="w-48 h-auto object-contain" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h2>

                    {status === 'verifying' && (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-600">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center">
                            <FiCheckCircle className="text-green-500 w-16 h-16 mb-4" />
                            <p className="text-gray-600 mb-6">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center">
                            <FiAlertCircle className="text-red-500 w-16 h-16 mb-4" />
                            <p className="text-red-500 mb-6">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-2.5 px-4 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">© 2026 WorkSphere India. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
