import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';
import { FiUser, FiBook, FiFileText, FiCheckCircle, FiLogOut } from 'react-icons/fi';
import PersonalInformation from '../../components/Profile/PersonalInformation';
import ExperienceInformation from '../../components/Profile/ExperienceInformation';
import AddressInformation from '../../components/Profile/AddressInformation';
import EducationDetails from '../../components/Profile/EducationDetails';
import Documents from '../../components/Profile/Documents';
import Review from '../../components/Profile/Review';
import AadhaarKyc from '../../components/Profile/AadhaarKyc';
import SuccessModal from '../../components/SuccessModal';
import Toast from '../../components/Toast';
import ConfirmationModal from '../../components/ConfirmationModal';

const CompleteProfile = () => {
    const { user, loading: authLoading, refreshUser, logout } = useAuth();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(0); // 0 = Aadhaar KYC, 1 = Personal Info, etc.
    const [aadhaarVerified, setAadhaarVerified] = useState(false);
    const [aadhaarData, setAadhaarData] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        experienceType: null,
        fresherYears: null,
        experiencedYears: null,
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        education: [],
        resumeUrl: '',
        portfolioUrl: '',
        linkedInUrl: '',
        experienceLetterUrl: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [progressPercentage, setProgressPercentage] = useState(0);
    const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const [aadhaarVerifiedFields, setAadhaarVerifiedFields] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (user) {
                    // Fetch existing profile data if any
                    try {
                        const response = await recruitmentCandidateService.getProfile();
                        const profile = response.profile || response;
                        const progress = response.progressPercentage !== undefined ? response.progressPercentage : 0;

                        setProgressPercentage(progress);

                        // Check if profile is already 100% complete, redirect to dashboard
                        if (progress >= 100) {
                            const storedUser = JSON.parse(localStorage.getItem('recruitment_user'));
                            if (storedUser) {
                                storedUser.isProfileComplete = true;
                                localStorage.setItem('recruitment_user', JSON.stringify(storedUser));
                                refreshUser();
                            }
                            navigate('/dashboard');
                            return;
                        }

                        // Get candidate data from profile (which now always has candidate set)
                        const candidate = profile?.candidate || {};

                        // Determine experience type from profile data
                        let experienceType = null;
                        let fresherYears = null;
                        let experiencedYears = null;

                        if (profile?.fresherYears !== null && profile?.fresherYears !== undefined) {
                            experienceType = 'fresher';
                            fresherYears = profile.fresherYears;
                        } else if (profile?.experiencedYears !== null && profile?.experiencedYears !== undefined) {
                            experienceType = 'experienced';
                            experiencedYears = profile.experiencedYears;
                        }

                        // Check Aadhar verification status
                        const verifiedFields = {};
                        let isVerified = false;

                        if (profile?.aadhaarVerifiedFirstName) verifiedFields.firstName = true;
                        if (profile?.aadhaarVerifiedMiddleName) verifiedFields.middleName = true;
                        if (profile?.aadhaarVerifiedLastName) verifiedFields.lastName = true;
                        if (profile?.aadhaarVerifiedDateOfBirth) verifiedFields.dateOfBirth = true;
                        if (profile?.aadhaarVerifiedStreetAddress) verifiedFields.streetAddress = true;
                        if (profile?.aadhaarVerifiedCity) verifiedFields.city = true;
                        if (profile?.aadhaarVerifiedState) verifiedFields.state = true;
                        if (profile?.aadhaarVerifiedZipCode) verifiedFields.zipCode = true;

                        // If any critical field is verified, consider Aadhar verified
                        if (Object.keys(verifiedFields).length > 0) {
                            setIsVerified(true);
                            setAadhaarVerified(true);
                            setAadhaarVerifiedFields(verifiedFields);

                            // If currently on step 0, skip to step 1
                            if (currentStep === 0) {
                                setCurrentStep(1);
                            }
                        }

                        // Update form data with candidate information and profile data
                        const updatedFormData = {
                            firstName: candidate.firstName || '',
                            middleName: candidate.middleName || '',
                            lastName: candidate.lastName || '',
                            email: candidate.email || user.email || '',
                            phoneNumber: candidate.phoneNumber || '',
                            experienceType: experienceType,
                            fresherYears: fresherYears,
                            experiencedYears: experiencedYears,
                            streetAddress: profile?.streetAddress || '',
                            city: profile?.city || '',
                            state: profile?.state || '',
                            zipCode: profile?.zipCode || '',
                            country: profile?.country || '',
                            resumeUrl: profile?.resumeUrl || '',
                            portfolioUrl: profile?.portfolioUrl || '',
                            linkedInUrl: profile?.linkedInUrl || '',
                            experienceLetterUrl: profile?.experienceLetterUrl || '',
                            education: profile?.education || []
                        };

                        setFormData(updatedFormData);
                        // Always calculate progress from updated form data to ensure accuracy
                        const calculatedProgress = calculateProgress(updatedFormData);
                        setProgressPercentage(calculatedProgress);

                        // Check if calculated progress is 100%, redirect to dashboard
                        if (calculatedProgress >= 100) {
                            const storedUser = JSON.parse(localStorage.getItem('recruitment_user'));
                            if (storedUser) {
                                storedUser.isProfileComplete = true;
                                localStorage.setItem('recruitment_user', JSON.stringify(storedUser));
                                refreshUser();
                            }
                            navigate('/dashboard');
                            return;
                        }

                        // Helper to set verified locally strictly for this render (in case state update is async/batched)
                        function setIsVerified(val) {
                            if (val && currentStep === 0) setCurrentStep(1);
                        }

                    } catch (err) {
                        console.error("No existing profile found or error fetching", err);
                        // If profile fetch fails, still try to use user data
                        setFormData(prev => ({
                            ...prev,
                            email: user.email || '',
                        }));
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setInitialLoading(false);
            }
        };

        if (!authLoading) {
            fetchProfile();
        }
    }, [user, authLoading]);

    // Recalculate progress whenever formData changes (but not on initial load)
    useEffect(() => {
        if (!initialLoading) {
            const calculatedProgress = calculateProgress(formData);
            setProgressPercentage(calculatedProgress);
        }
    }, [formData.firstName, formData.lastName, formData.phoneNumber, formData.experienceType, formData.experiencedYears, formData.streetAddress, formData.city, formData.state, formData.zipCode, formData.education, formData.resumeUrl, formData.experienceLetterUrl, initialLoading]);

    // Calculate progress percentage based on form data
    const calculateProgress = (data) => {
        let completedFields = 0;
        const totalMandatoryFields = 7;

        // Personal Information (3 fields)
        if (data.firstName && data.firstName.trim() !== '') completedFields++;
        if (data.lastName && data.lastName.trim() !== '') completedFields++;
        if (data.phoneNumber && data.phoneNumber.trim() !== '') completedFields++;

        // Experience Information (1 field - either fresher or experienced with years)
        if (data.experienceType === 'fresher') {
            completedFields++;
        } else if (data.experienceType === 'experienced' && data.experiencedYears !== null && data.experiencedYears !== undefined && data.experiencedYears !== '') {
            completedFields++;
        }

        // Address Information (1 field)
        if (data.streetAddress && data.streetAddress.trim() !== '') completedFields++;

        // Education (1 field - at least one valid education entry)
        if (data.education && Array.isArray(data.education) && data.education.length > 0) {
            const hasValidEducation = data.education.some(edu => {
                return edu &&
                    edu.collegeName && edu.collegeName.trim() !== '' &&
                    edu.university && edu.university.trim() !== '' &&
                    edu.degree && edu.degree.trim() !== '' &&
                    edu.major && edu.major.trim() !== '' &&
                    edu.startDate &&
                    edu.endDate &&
                    edu.cgpaOrPercentage && edu.cgpaOrPercentage.trim() !== '' &&
                    edu.studyMode && edu.studyMode.trim() !== '' &&
                    edu.city && edu.city.trim() !== '' &&
                    edu.state && edu.state.trim() !== '' &&
                    edu.country && edu.country.trim() !== '' &&
                    edu.passingYear;
            });
            if (hasValidEducation) completedFields++;
        }

        // Documents (1 field - resume URL)
        if (data.resumeUrl && data.resumeUrl.trim() !== '') completedFields++;

        return Math.round((completedFields / totalMandatoryFields) * 100);
    };

    const updateFormData = (newData) => {
        const updatedData = { ...formData, ...newData };
        setFormData(updatedData);
        // Update progress in real-time
        const newProgress = calculateProgress(updatedData);
        setProgressPercentage(newProgress);

        // Clear errors for fields being updated
        const newErrors = { ...errors };
        Object.keys(newData).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    // Helper function to build clean payload for API
    const buildProfilePayload = (isCompleted = false) => {
        return {
            firstName: formData.firstName,
            middleName: formData.middleName || null,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            fresherYears: formData.experienceType === 'fresher' ? (formData.fresherYears !== null && formData.fresherYears !== undefined ? formData.fresherYears : 0) : null,
            experiencedYears: formData.experienceType === 'experienced' ? (formData.experiencedYears !== null && formData.experiencedYears !== undefined ? formData.experiencedYears : null) : null,
            streetAddress: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country || null,
            resumeUrl: formData.resumeUrl || null,
            portfolioUrl: formData.portfolioUrl || null,
            linkedInUrl: formData.linkedInUrl || null,
            experienceLetterUrl: formData.experienceLetterUrl || null,
            education: formData.education && formData.education.length > 0 ? formData.education : null,
            isCompleted: isCompleted
        };
    };

    const validateStep = (step) => {
        const newErrors = {};
        let isValid = true;

        if (step === 1) {
            // Personal Info Validation
            if (!formData.firstName) newErrors.firstName = 'First Name is required';
            if (!formData.lastName) newErrors.lastName = 'Last Name is required';
            if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone Number is required';

            // Experience Info Validation
            if (!formData.experienceType) {
                newErrors.experienceType = 'Please select your experience level';
            } else if (formData.experienceType === 'experienced') {
                if (!formData.experiencedYears || formData.experiencedYears === '') {
                    newErrors.experiencedYears = 'Please select years of experience';
                }
            }

            // Address Info Validation
            if (!formData.streetAddress) newErrors.streetAddress = 'Address is required';
            // Country is optional, not required
        } else if (step === 2) {
            if (!formData.education || formData.education.length === 0) {
                newErrors.education = 'At least one education entry is required';
            }
        } else if (step === 3) {
            if (!formData.resumeUrl) newErrors.resumeUrl = 'Resume is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
    };

    const handleNext = async () => {
        if (!validateStep(currentStep)) {
            return;
        }

        setLoading(true);
        try {
            // Save the current step data before advancing
            const response = await recruitmentCandidateService.saveProfile(buildProfilePayload(false));
            const progress = response.progressPercentage !== undefined ? response.progressPercentage : calculateProgress(formData);
            setProgressPercentage(progress);

            // Check if progress reached 100%, redirect to dashboard
            if (progress >= 100) {
                const storedUser = JSON.parse(localStorage.getItem('recruitment_user'));
                if (storedUser) {
                    storedUser.isProfileComplete = true;
                    localStorage.setItem('recruitment_user', JSON.stringify(storedUser));
                    refreshUser();
                }
                navigate('/dashboard');
                return;
            }

            // Only advance to next step if save is successful
            window.scrollTo(0, 0);
            setCurrentStep(prev => prev + 1);
        } catch (error) {
            console.error('Error saving profile:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save profile. Please try again.';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        window.scrollTo(0, 0);
        if (currentStep === 1 && aadhaarVerified) {
            // If going back from step 1 and Aadhaar was verified, don't go back to Aadhaar step
            setCurrentStep(1);
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            const response = await recruitmentCandidateService.saveProfile(buildProfilePayload(false));
            const progress = response.progressPercentage !== undefined ? response.progressPercentage : calculateProgress(formData);
            setProgressPercentage(progress);

            // Check if progress reached 100%, redirect to dashboard
            if (progress >= 100) {
                const storedUser = JSON.parse(localStorage.getItem('recruitment_user'));
                if (storedUser) {
                    storedUser.isProfileComplete = true;
                    localStorage.setItem('recruitment_user', JSON.stringify(storedUser));
                    refreshUser();
                }
                navigate('/dashboard');
                return;
            }

            setShowSaveDraftModal(true);
        } catch (error) {
            console.error('Error saving draft:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save draft.';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await recruitmentCandidateService.saveProfile(buildProfilePayload(true));
            const progress = response.progressPercentage !== undefined ? response.progressPercentage : calculateProgress(formData);
            setProgressPercentage(progress);

            // Update local user state to reflect completion
            const storedUser = JSON.parse(localStorage.getItem('recruitment_user'));
            if (storedUser) {
                storedUser.isProfileComplete = true;
                if (formData.phoneNumber) storedUser.phoneNumber = formData.phoneNumber;
                localStorage.setItem('recruitment_user', JSON.stringify(storedUser));
                refreshUser();
            }

            // Navigate to dashboard
            navigate('/dashboard');

        } catch (error) {
            console.error('Error submitting profile:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to submit profile. Please try again.';
            setToast({ message: errorMessage, type: 'error' });
            setLoading(false);
        }
    };

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutModal(false);
        logout();
        navigate('/login');
    };

    if (initialLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
                        <p className="text-gray-600 mt-2">Help us understand your background better to match you with the right opportunities</p>
                    </div>
                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-200 hover:border-red-300"
                    >
                        <FiLogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>

                {/* Profile Completion Progress Bar */}
                <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile Completion</h3>
                        <span className="text-sm font-bold text-blue-600">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {progressPercentage < 100
                            ? `Complete ${10 - Math.round((100 - progressPercentage) / 100 * 10)} of 10 mandatory fields to finish your profile`
                            : 'All mandatory fields completed! Your profile is ready.'}
                    </p>
                </div>

                {/* Step Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-300" style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>

                        {[
                            { num: 0, label: 'Aadhaar KYC', icon: FiUser, show: true },
                            { num: 1, label: 'Personal Information', icon: FiUser },
                            { num: 2, label: 'Education', icon: FiBook },
                            { num: 3, label: 'Documents', icon: FiFileText },
                            { num: 4, label: 'Review', icon: FiCheckCircle }
                        ].filter(s => s.num !== 0 || !aadhaarVerified).map((s) => (
                            <div key={s.num} className="flex flex-col items-center bg-gray-50 px-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition-colors ${currentStep === s.num ? 'bg-green-500 text-white shadow-lg ring-4 ring-green-100' :
                                    currentStep > s.num ? 'bg-green-500 text-white' : 'bg-white text-gray-400 border-2 border-gray-200'
                                    }`}>
                                    {currentStep > s.num ? <FiCheckCircle className="text-xl" /> : <s.icon className="text-xl" />}
                                </div>
                                <span className={`text-xs font-semibold uppercase tracking-wider ${currentStep >= s.num ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="mb-8">
                    {currentStep === 0 && (
                        <AadhaarKyc
                            onVerificationSuccess={(data) => {
                                setAadhaarVerified(true);
                                setAadhaarData(data);

                                // Set verified fields for current session
                                const newVerifiedFields = {};
                                if (data) {
                                    if (data.firstName) newVerifiedFields.firstName = true;
                                    if (data.middleName) newVerifiedFields.middleName = true;
                                    if (data.lastName) newVerifiedFields.lastName = true;
                                    if (data.dateOfBirth) newVerifiedFields.dateOfBirth = true;
                                    if (data.address) newVerifiedFields.streetAddress = true;
                                    // Assuming address covers city/state/zip or they are also in data
                                    if (data.city) newVerifiedFields.city = true;
                                    if (data.state) newVerifiedFields.state = true;
                                    if (data.zipCode) newVerifiedFields.zipCode = true;
                                }
                                setAadhaarVerifiedFields(newVerifiedFields);

                                // Auto-populate form data from Aadhaar
                                if (data) {
                                    const updatedData = { ...formData };
                                    if (data.firstName) updatedData.firstName = data.firstName;
                                    if (data.middleName) updatedData.middleName = data.middleName;
                                    if (data.lastName) updatedData.lastName = data.lastName;
                                    if (data.dateOfBirth) updatedData.dateOfBirth = data.dateOfBirth;
                                    if (data.address) updatedData.streetAddress = data.address;

                                    // Map additional address fields
                                    if (data.pincode) updatedData.zipCode = data.pincode;
                                    if (data.state) updatedData.state = data.state;
                                    if (data.district) updatedData.city = data.district;

                                    setFormData(updatedData);
                                }
                                // Move to next step
                                setCurrentStep(1);
                            }}

                        />
                    )}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <PersonalInformation
                                data={formData}
                                updateData={updateFormData}
                                errors={errors}
                                aadhaarVerified={aadhaarVerified}
                                aadhaarData={aadhaarData}
                                aadhaarVerifiedFields={aadhaarVerifiedFields}
                            />
                            <ExperienceInformation data={formData} updateData={updateFormData} errors={errors} />
                            <AddressInformation
                                data={formData}
                                updateData={updateFormData}
                                errors={errors}
                                aadhaarVerified={aadhaarVerified}
                                aadhaarData={aadhaarData}
                                aadhaarVerifiedFields={aadhaarVerifiedFields}
                            />
                        </div>
                    )}
                    {currentStep === 2 && <EducationDetails data={formData} updateData={updateFormData} errors={errors} />}
                    {currentStep === 3 && <Documents data={formData} updateData={updateFormData} errors={errors} experienceType={formData.experienceType} />}
                    {currentStep === 4 && <Review data={formData} setStep={setCurrentStep} />}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <button
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2"
                    >
                        Save Draft
                    </button>

                    <div className="flex space-x-4">
                        {currentStep > (aadhaarVerified ? 1 : 0) && (
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Back
                            </button>
                        )}

                        {currentStep === 0 ? (
                            // Aadhaar KYC step - buttons handled by component
                            <div></div>
                        ) : currentStep < 4 ? (
                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center"
                            >
                                Save & Continue <span className="ml-2">→</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center"
                            >
                                {loading ? 'Submitting...' : 'Submit Profile'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SuccessModal
                isOpen={showSaveDraftModal}
                onClose={() => setShowSaveDraftModal(false)}
                title="Draft Saved"
                message="Your profile draft has been saved successfully."
                buttonText="OK"
            />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogoutConfirm}
                title="Confirm Logout"
                message="Are you sure you want to log out? You will need to sign in again to access your account."
                confirmText="Logout"
                cancelText="Cancel"
                type="warning"
            />
        </div>
    );
};

export default CompleteProfile;
