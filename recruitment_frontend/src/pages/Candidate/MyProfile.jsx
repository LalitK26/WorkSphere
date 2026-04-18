import React, { useState, useEffect } from 'react';
import { FiUser } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';
import PersonalInformation from '../../components/Profile/PersonalInformation';
import ExperienceInformation from '../../components/Profile/ExperienceInformation';
import AddressInformation from '../../components/Profile/AddressInformation';
import EducationDetails from '../../components/Profile/EducationDetails';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const MyProfile = () => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
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
        education: []
    });
    const [aadhaarVerified, setAadhaarVerified] = useState(false);
    const [aadhaarVerifiedFields, setAadhaarVerifiedFields] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'warning',
        isLoading: false,
        onConfirm: () => { }
    });

    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onOk: () => { }
    });

    const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    const closeSuccess = () => setSuccessModal(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setInitialLoading(true);
                const response = await recruitmentCandidateService.getProfile();
                const profile = response.profile || response;
                if (profile) {
                    // Determine experience type from profile data
                    let experienceType = null;
                    let fresherYears = null;
                    let experiencedYears = null;

                    // Check fresherYears first (even if 0, it indicates fresher)
                    if (profile.fresherYears !== null && profile.fresherYears !== undefined) {
                        experienceType = 'fresher';
                        fresherYears = profile.fresherYears;
                    } else if (profile.experiencedYears !== null && profile.experiencedYears !== undefined) {
                        experienceType = 'experienced';
                        experiencedYears = profile.experiencedYears;
                    }

                    // Check Aadhaar verification status
                    const isAadhaarVerified = profile.candidate?.aadhaarVerified || false;
                    setAadhaarVerified(isAadhaarVerified);

                    // Get Aadhaar-verified field flags
                    const verifiedFields = {
                        firstName: profile.aadhaarVerifiedFirstName || false,
                        middleName: profile.aadhaarVerifiedMiddleName || false,
                        lastName: profile.aadhaarVerifiedLastName || false,
                        dateOfBirth: profile.aadhaarVerifiedDateOfBirth || false,
                        streetAddress: profile.aadhaarVerifiedStreetAddress || false,
                        city: profile.aadhaarVerifiedCity || false,
                        state: profile.aadhaarVerifiedState || false,
                        zipCode: profile.aadhaarVerifiedZipCode || false
                    };
                    setAadhaarVerifiedFields(verifiedFields);

                    // Format date of birth for display
                    let dateOfBirth = '';
                    if (profile.candidate?.dateOfBirth) {
                        const dob = new Date(profile.candidate.dateOfBirth);
                        dateOfBirth = dob.toISOString().split('T')[0];
                    }

                    setFormData(prev => ({
                        ...prev,
                        firstName: profile.candidate?.firstName || '',
                        middleName: profile.candidate?.middleName || '',
                        lastName: profile.candidate?.lastName || '',
                        email: profile.candidate?.email || '',
                        phoneNumber: profile.candidate?.phoneNumber || '',
                        dateOfBirth: dateOfBirth,
                        experienceType: experienceType,
                        fresherYears: fresherYears,
                        experiencedYears: experiencedYears,
                        streetAddress: profile.streetAddress || '',
                        city: profile.city || '',
                        state: profile.state || '',
                        zipCode: profile.zipCode || '',
                        country: profile.country || '',
                        education: profile.education || []
                    }));
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const updateFormData = (newData) => {
        setFormData(prev => ({ ...prev, ...newData }));
        const newErrors = { ...errors };
        Object.keys(newData).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    const buildProfilePayload = () => {
        return {
            firstName: formData.firstName,
            middleName: formData.middleName || null,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            // If fresher is selected, send fresherYears as 0 (or existing value if set)
            // If experienced is selected, send experiencedYears
            // If neither is selected, send null for both (preserves existing state)
            fresherYears: formData.experienceType === 'fresher' ? (formData.fresherYears !== null && formData.fresherYears !== undefined ? formData.fresherYears : 0) : null,
            experiencedYears: formData.experienceType === 'experienced' ? (formData.experiencedYears !== null && formData.experiencedYears !== undefined ? formData.experiencedYears : null) : null,
            streetAddress: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country || null,
            education: formData.education && formData.education.length > 0 ? formData.education : null,
            isCompleted: false // Don't change completion status when editing
        };
    };

    const initiateSave = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Update Profile',
            message: 'Are you sure you want to update your profile details?',
            confirmText: 'Save Changes',
            type: 'primary',
            isLoading: false,
            onConfirm: executeSave
        });
    };

    const executeSave = async () => {
        try {
            setConfirmationModal(prev => ({ ...prev, isLoading: true }));
            setLoading(true);

            await recruitmentCandidateService.saveProfile(buildProfilePayload());

            setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

            setSuccessModal({
                isOpen: true,
                title: 'Profile Updated',
                message: 'Your profile has been updated successfully.',
                onOk: () => {
                    closeSuccess();
                }
            });
        } catch (error) {
            setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
            console.error('Error saving profile:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save profile. Please try again.';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm mt-0.5">
                            <FiUser className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                                Manage your personal information and details
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    <PersonalInformation 
                        data={formData} 
                        updateData={updateFormData} 
                        errors={errors}
                        aadhaarVerified={aadhaarVerified}
                        aadhaarVerifiedFields={aadhaarVerifiedFields}
                    />
                    <ExperienceInformation data={formData} updateData={updateFormData} errors={errors} />
                    <AddressInformation 
                        data={formData} 
                        updateData={updateFormData} 
                        errors={errors}
                        aadhaarVerified={aadhaarVerified}
                        aadhaarVerifiedFields={aadhaarVerifiedFields}
                    />
                    <EducationDetails data={formData} updateData={updateFormData} errors={errors} />
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={initiateSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Modals */}
                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    onClose={closeConfirmation}
                    onConfirm={confirmationModal.onConfirm}
                    title={confirmationModal.title}
                    message={confirmationModal.message}
                    confirmText={confirmationModal.confirmText}
                    cancelText={confirmationModal.cancelText}
                    type={confirmationModal.type}
                    isLoading={confirmationModal.isLoading}
                />

                <SuccessModal
                    isOpen={successModal.isOpen}
                    onClose={successModal.onOk}
                    title={successModal.title}
                    message={successModal.message}
                    buttonText="OK"
                />
            </div>
        </div >
    );
};

export default MyProfile;

