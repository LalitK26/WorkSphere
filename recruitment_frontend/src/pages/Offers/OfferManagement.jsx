import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import offerService from '../../api/offerService';
import documentService from '../../api/documentService';
import OfferStatusBadge from '../../components/Offers/OfferStatusBadge';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import Modal from '../../components/UI/Modal';
import { useToast } from '../../context/ToastContext';
import { FiBriefcase, FiLoader, FiSend, FiPlus, FiUser, FiCalendar, FiDollarSign, FiFileText, FiEye, FiDownload, FiX, FiFile, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

const OfferManagement = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [offers, setOffers] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sendingOfferId, setSendingOfferId] = useState(null);

    // Modal States
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

    // Documents Modal States
    const [documentsModal, setDocumentsModal] = useState({
        isOpen: false,
        candidateName: '',
        offerId: null
    });
    const [documents, setDocuments] = useState([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [viewingDocumentId, setViewingDocumentId] = useState(null);

    const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    const closeSuccess = () => setSuccessModal(prev => ({ ...prev, isOpen: false }));
    const closeDocumentsModal = () => {
        setDocumentsModal({ isOpen: false, candidateName: '', offerId: null });
        setDocuments([]);
    };

    useEffect(() => {
        fetchAllOffers();
    }, [currentPage]);

    const fetchAllOffers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await offerService.getAllOffers(currentPage, pageSize);
            setOffers(response?.content || []);
            setTotalPages(response?.totalPages || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load offers');
            console.error('Error fetching offers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOfferClick = (offerId) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Confirm Send Offer',
            message: 'Are you sure you want to send this offer to the candidate? This will email the offer letter to them.',
            confirmText: 'Send Offer',
            type: 'primary',
            isLoading: false,
            onConfirm: () => executeSendOffer(offerId)
        });
    };

    const executeSendOffer = async (offerId) => {
        try {
            setConfirmationModal(prev => ({ ...prev, isLoading: true }));
            setSendingOfferId(offerId);

            await offerService.sendOffer(offerId);

            // Update local state
            setOffers(offers.map(offer =>
                offer.id === offerId
                    ? { ...offer, status: 'SENT', sentAt: new Date().toISOString() }
                    : offer
            ));

            setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

            setSuccessModal({
                isOpen: true,
                title: 'Offer Sent',
                message: 'The offer letter has been sent to the candidate successfully.',
                onOk: () => closeSuccess()
            });

        } catch (err) {
            setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
            const errorMessage = err.response?.data?.message || 'Failed to send offer';
            showToast(errorMessage, 'error');
            console.error('Error sending offer:', err);
        } finally {
            setSendingOfferId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Handle View Documents button click
    const handleViewDocumentsClick = async (offer) => {
        setDocumentsModal({
            isOpen: true,
            candidateName: offer.candidateName,
            offerId: offer.id
        });
        setLoadingDocuments(true);

        try {
            const docs = await documentService.getDocumentsByOffer(offer.id);
            setDocuments(docs);
        } catch (err) {
            console.error('Error fetching documents:', err);
            showToast(err.response?.data?.message || 'Failed to load documents', 'error');
            setDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    };

    // Handle View/Download a document
    const handleViewDocument = async (documentId, fileName) => {
        try {
            setViewingDocumentId(documentId);
            const blob = await documentService.viewDocument(documentId);

            // Create a URL for the blob and open in new tab
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Clean up the URL object after a short delay
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('Error viewing document:', err);
            showToast(err.response?.data?.message || 'Failed to view document', 'error');
        } finally {
            setViewingDocumentId(null);
        }
    };

    // Get verification status icon
    const getVerificationStatusIcon = (status) => {
        switch (status) {
            case 'VERIFIED':
                return <FiCheckCircle className="text-green-600" />;
            case 'PENDING':
                return <FiClock className="text-yellow-600" />;
            case 'RESUBMISSION_REQUESTED':
                return <FiAlertCircle className="text-orange-600" />;
            default:
                return <FiClock className="text-gray-500" />;
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiLoader className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading offers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                                <FiBriefcase className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Offer Management</h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage and send offer letters</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/offers/generate')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
                        >
                            <FiPlus />
                            Generate New Offer
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {offers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                            <FiBriefcase className="text-4xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Offers Generated</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Start by generating an offer letter for HR-shortlisted candidates
                        </p>
                        <button
                            onClick={() => navigate('/offers/generate')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Generate First Offer
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Candidate
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Job Applied
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Employee ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Offer Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Joining Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead >
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {offers.map((offer) => (
                                        <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <FiUser className="text-blue-600" />
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-semibold text-gray-900">{offer.candidateName}</div>
                                                        <div className="text-xs text-gray-500">{offer.candidateEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">{offer.jobApplied || offer.jobTitle}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">{offer.position}</div>
                                                <div className="text-xs text-gray-500">{offer.department}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono font-semibold text-gray-900">{offer.employeeId}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {formatDate(offer.offerDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {formatDate(offer.joiningDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <OfferStatusBadge status={offer.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    {offer.status === 'CREATED' && (
                                                        <button
                                                            onClick={() => handleSendOfferClick(offer.id)}
                                                            disabled={sendingOfferId === offer.id}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {sendingOfferId === offer.id ? (
                                                                <>
                                                                    <FiLoader className="animate-spin" />
                                                                    Sending...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiSend />
                                                                    Send Offer
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {offer.status === 'SENT' && (
                                                        <span className="text-xs text-gray-500">Awaiting response</span>
                                                    )}
                                                    {offer.status === 'ACCEPTED' && (
                                                        <span className="text-xs text-green-600 font-medium">Accepted</span>
                                                    )}
                                                    {offer.status === 'REJECTED' && (
                                                        <span className="text-xs text-red-600 font-medium">Candidate rejected</span>
                                                    )}
                                                    {/* View Documents Button */}
                                                    <button
                                                        onClick={() => handleViewDocumentsClick(offer)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors border border-gray-200"
                                                        title="View candidate's uploaded documents"
                                                    >
                                                        <FiFileText />
                                                        View Documents
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table >
                        </div >

                        {/* Pagination Controls */}
                        {offers.length > 0 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing page <span className="font-medium">{currentPage + 1}</span> of <span className="font-medium">{totalPages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                                disabled={currentPage === 0}
                                                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 0
                                                    ? 'text-gray-300 cursor-not-allowed'
                                                    : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                Previous
                                            </button>

                                            {/* Page Numbers */}
                                            {[...Array(totalPages)].map((_, index) => {
                                                // Show first, last, current, and surrounding pages
                                                if (
                                                    index === 0 ||
                                                    index === totalPages - 1 ||
                                                    (index >= currentPage - 1 && index <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={index}
                                                            onClick={() => setCurrentPage(index)}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === index
                                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {index + 1}
                                                        </button>
                                                    );
                                                } else if (
                                                    (index === currentPage - 2 && currentPage > 2) ||
                                                    (index === currentPage + 2 && currentPage < totalPages - 3)
                                                ) {
                                                    return (
                                                        <span key={index} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}

                                            <button
                                                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                                disabled={currentPage >= totalPages - 1}
                                                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage >= totalPages - 1
                                                    ? 'text-gray-300 cursor-not-allowed'
                                                    : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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

            {/* View Documents Modal */}
            <Modal
                isOpen={documentsModal.isOpen}
                onClose={closeDocumentsModal}
                title={`Documents - ${documentsModal.candidateName}`}
                size="md"
            >
                <div className="space-y-4">
                    {loadingDocuments ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <FiLoader className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">Loading documents...</p>
                            </div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                                <FiFileText className="text-3xl text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Uploaded</h3>
                            <p className="text-sm text-gray-500">
                                This candidate has not uploaded any documents yet.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                                {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded by the candidate
                            </p>
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <FiFile className="text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {doc.documentTypeName === '12th Marksheet' ? '12th/Diploma Marksheet' : (doc.documentTypeName || doc.documentType)}
                                                </p>
                                                <span className="flex items-center gap-1">
                                                    {getVerificationStatusIcon(doc.verificationStatus)}
                                                    <span className={`text-xs font-medium ${doc.verificationStatus === 'VERIFIED' ? 'text-green-600' :
                                                        doc.verificationStatus === 'PENDING' ? 'text-yellow-600' :
                                                            doc.verificationStatus === 'RESUBMISSION_REQUESTED' ? 'text-orange-600' :
                                                                'text-gray-500'
                                                        }`}>
                                                        {doc.verificationStatusName || doc.verificationStatus}
                                                    </span>
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {doc.fileName} • {formatFileSize(doc.fileSize)}
                                            </p>
                                            {doc.uploadedAt && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Uploaded: {formatDate(doc.uploadedAt)}
                                                </p>
                                            )}
                                            {doc.remark && doc.verificationStatus === 'RESUBMISSION_REQUESTED' && (
                                                <p className="text-xs text-orange-600 mt-1">
                                                    <span className="font-medium">Remark:</span> {doc.remark}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleViewDocument(doc.id, doc.fileName)}
                                        disabled={viewingDocumentId === doc.id}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="View document"
                                    >
                                        {viewingDocumentId === doc.id ? (
                                            <>
                                                <FiLoader className="animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <FiEye />
                                                View
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Close Button */}
                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={closeDocumentsModal}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

        </div >
    );
};

export default OfferManagement;
