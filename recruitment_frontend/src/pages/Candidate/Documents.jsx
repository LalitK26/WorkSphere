import React, { useState, useEffect } from 'react';
import { FiFileText } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';
import Documents from '../../components/Profile/Documents';

const DocumentsPage = () => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        resumeUrl: '',
        portfolioUrl: '',
        linkedInUrl: '',
        experienceLetterUrl: ''
    });
    const [experienceType, setExperienceType] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'primary',
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
        const fetchDocuments = async () => {
            try {
                setInitialLoading(true);
                const response = await recruitmentCandidateService.getProfile();
                const profile = response.profile || response;
                if (profile) {
                    setFormData(prev => ({
                        ...prev,
                        resumeUrl: profile.resumeUrl || '',
                        portfolioUrl: profile.portfolioUrl || '',
                        linkedInUrl: profile.linkedInUrl || '',
                        experienceLetterUrl: profile.experienceLetterUrl || ''
                    }));
                    if (profile.fresherYears !== null && profile.fresherYears !== undefined) {
                        setExperienceType('fresher');
                    } else if (profile.experiencedYears !== null && profile.experiencedYears !== undefined) {
                        setExperienceType('experienced');
                    }
                }
            } catch (error) {
                console.error('Error loading documents:', error);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    const updateFormData = (newData) => {
        setFormData(prev => ({ ...prev, ...newData }));
        const newErrors = { ...errors };
        Object.keys(newData).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    const buildProfilePayload = () => {
        return {
            resumeUrl: formData.resumeUrl || null,
            portfolioUrl: formData.portfolioUrl || null,
            linkedInUrl: formData.linkedInUrl || null,
            experienceLetterUrl: formData.experienceLetterUrl || null,
            isCompleted: false // Don't change completion status when editing
        };
    };

    const initiateSave = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Confirm Save',
            message: 'Are you sure you want to save your document changes?',
            confirmText: 'Save',
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
                title: 'Documents Updated',
                message: 'Your documents have been updated successfully!',
                onOk: closeSuccess
            });
        } catch (error) {
            setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
            console.error('Error saving documents:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save documents. Please try again.';
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
                    <p className="mt-4 text-gray-600">Loading documents...</p>
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
                            <FiFileText className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">My Documents</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                                Upload and manage your documents
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={initiateSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl">
                    <Documents data={formData} updateData={updateFormData} errors={errors} experienceType={experienceType} />
                </div>

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
        </div>
    );
};

export default DocumentsPage;

