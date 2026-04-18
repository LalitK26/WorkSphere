import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import offerService from '../../api/offerService';
import documentService from '../../api/documentService';
import OfferStatusBadge from '../../components/Offers/OfferStatusBadge';
import DocumentVerificationSection from '../../components/Offers/DocumentVerificationSection';
import Toast from '../../components/Toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import { FiLoader, FiCheckCircle, FiXCircle, FiDownload, FiArrowLeft } from 'react-icons/fi';
import { addNotification } from '../../utils/notificationStorage';


const OfferDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [offer, setOffer] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Define mandatory document types
    const mandatoryDocumentTypes = [
        'LEAVING_CERTIFICATE',
        'BIRTH_CERTIFICATE',
        'AADHAR_CARD',
        'PAN_CARD',
        'PASSPORT_PHOTO',
        'TENTH_MARKSHEET',
        'BACHELOR_MARKSHEET',
        'TWELFTH_MARKSHEET'
    ];

    useEffect(() => {
        fetchOfferDetails();
        fetchDocuments();
    }, [id]);

    const fetchOfferDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await offerService.getOfferById(id);
            setOffer(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load offer details');
            console.error('Error fetching offer:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            const docs = await documentService.getDocumentsByOffer(id);
            setDocuments(docs);
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    };

    // Check if all mandatory documents are uploaded
    const areAllDocumentsUploaded = () => {
        if (!documents || documents.length === 0) return false;

        const uploadedTypes = new Set(documents.map(doc => doc.documentType));

        // Check if all mandatory document types are present
        return mandatoryDocumentTypes.every(type => uploadedTypes.has(type));
    };

    const handleAccept = () => {
        setConfirmAction({
            type: 'accept',
            title: 'Accept Offer',
            message: 'Are you sure you want to accept this offer? This action cannot be undone.',
            confirmText: 'Accept Offer',
            actionType: 'success'
        });
        setShowConfirmModal(true);
    };

    const handleConfirmAccept = async () => {
        try {
            setProcessing(true);
            setShowConfirmModal(false);
            const updatedOffer = await offerService.acceptOffer(id);
            setOffer(updatedOffer);
            try {
                const uid = user?.userId != null ? String(user.userId) : null;
                addNotification(uid, {
                    title: 'Offer accepted',
                    message: `You have accepted the offer for ${updatedOffer?.jobTitle ?? offer?.jobTitle ?? 'the position'}.`,
                    redirectPath: '/my-offers',
                });
            } catch (_) { }
            setToast({
                message: 'Congratulations! You have accepted the offer.',
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: err.response?.data?.message || 'Failed to accept offer',
                type: 'error'
            });
            console.error('Error accepting offer:', err);
        } finally {
            setProcessing(false);
            setConfirmAction(null);
        }
    };

    const handleReject = () => {
        setConfirmAction({
            type: 'reject',
            title: 'Reject Offer',
            message: 'Are you sure you want to reject this offer? This action cannot be undone.',
            confirmText: 'Reject Offer',
            actionType: 'danger'
        });
        setShowConfirmModal(true);
    };

    const handleConfirmReject = async () => {
        try {
            setProcessing(true);
            setShowConfirmModal(false);
            const updatedOffer = await offerService.rejectOffer(id);
            setOffer(updatedOffer);
            try {
                const uid = user?.userId != null ? String(user.userId) : null;
                addNotification(uid, {
                    title: 'Offer rejected',
                    message: `You have rejected the offer for ${updatedOffer?.jobTitle ?? offer?.jobTitle ?? 'the position'}.`,
                    redirectPath: '/my-offers',
                });
            } catch (_) { }
            setToast({
                message: 'You have rejected the offer.',
                type: 'warning'
            });
        } catch (err) {
            setToast({
                message: err.response?.data?.message || 'Failed to reject offer',
                type: 'error'
            });
            console.error('Error rejecting offer:', err);
        } finally {
            setProcessing(false);
            setConfirmAction(null);
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const pdfBlob = await offerService.downloadOfferPdf(id);

            // Verify it's actually a blob
            if (!(pdfBlob instanceof Blob)) {
                throw new Error('Invalid response: expected PDF blob but received different data type');
            }

            // Create download link
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Offer-Letter-${offer?.employeeId || id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: 'Offer letter PDF downloaded successfully!',
                type: 'success'
            });
        } catch (err) {
            console.error('Error downloading offer:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', err.response?.data);

            // Try to extract error message from blob response if it's actually JSON
            let errorMessage = 'Failed to download offer PDF';

            if (err.response) {
                if (err.response.data instanceof Blob) {
                    // If error response is a blob, try to read it as text (might be JSON error)
                    try {
                        const text = await err.response.data.text();
                        // console.log('Error response text:', text);
                        try {
                            const jsonError = JSON.parse(text);
                            errorMessage = jsonError.message || jsonError.error || errorMessage;
                            // console.log('Parsed error:', jsonError);
                        } catch (parseError) {
                            // If it's not JSON, use the text as error message
                            errorMessage = text || 'Server returned an error. Please check the server logs.';
                        }
                    } catch (readError) {
                        console.error('Error reading blob:', readError);
                        errorMessage = 'Server returned an error. Please check the server logs.';
                    }
                } else if (err.response.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data) {
                    // Try to stringify if it's an object
                    errorMessage = JSON.stringify(err.response.data);
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setToast({
                message: `Failed to download offer PDF: ${errorMessage}`,
                type: 'error'
            });
        } finally {
            setDownloading(false);
        }
    };

    const handleConfirmAction = () => {
        if (confirmAction?.type === 'accept') {
            handleConfirmAccept();
        } else if (confirmAction?.type === 'reject') {
            handleConfirmReject();
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiLoader className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading offer details...</p>
                </div>
            </div>
        );
    }

    if (error || !offer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiXCircle className="text-3xl text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Offer</h2>
                    <p className="text-gray-600 mb-4">{error || 'Offer not found'}</p>
                    <button
                        onClick={() => navigate('/my-offers')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Back to My Offers
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/my-offers')}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                        >
                            <FiArrowLeft />
                            Back to My Offers
                        </button>
                        <OfferStatusBadge status={offer.status} />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Offer Summary Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{offer.jobTitle}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Position</p>
                            <p className="text-base text-gray-900 font-semibold">{offer.position}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Department</p>
                            <p className="text-base text-gray-900 font-semibold">{offer.department}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Employee ID</p>
                            <p className="text-base text-gray-900 font-mono font-semibold">{offer.employeeId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Stipend Amount</p>
                            <p className="text-base text-gray-900 font-semibold">{offer.stipendAmount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">CTC Amount</p>
                            <p className="text-base text-gray-900 font-semibold">{offer.ctcAmount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Joining Date</p>
                            <p className="text-base text-gray-900 font-semibold">{formatDate(offer.joiningDate)}</p>
                        </div>
                    </div>

                    {offer.respondedAt && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Response Date:</span> {formatDate(offer.respondedAt)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Document Verification Section */}
                <DocumentVerificationSection
                    offerId={id}
                    onUpdate={() => {
                        fetchOfferDetails();
                        fetchDocuments();
                    }}
                />

                {/* Action Buttons */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

                    <div className="flex flex-wrap gap-3">
                        {/* Download PDF */}
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            title="Download PDF"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {downloading ? (
                                <>
                                    <FiLoader className="animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <FiDownload />
                                    Download PDF
                                </>
                            )}
                        </button>

                        {/* Accept/Reject Buttons - Only show if status is SENT */}
                        {offer.status === 'SENT' && (
                            <>
                                <button
                                    onClick={handleAccept}
                                    disabled={processing || showConfirmModal || !areAllDocumentsUploaded()}
                                    title={!areAllDocumentsUploaded() ? "Please upload all mandatory documents first" : "Accept Offer"}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale disabled:hover:bg-green-600"
                                >
                                    {processing ? (
                                        <>
                                            <FiLoader className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiCheckCircle />
                                            Accept Offer
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing || showConfirmModal}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <FiLoader className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiXCircle />
                                            Reject Offer
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {/* Status Messages */}
                        {offer.status === 'CREATED' && (
                            <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    This offer has not been sent to you yet. Please wait for the recruiter to send it.
                                </p>
                            </div>
                        )}

                        {offer.status === 'ACCEPTED' && (
                            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                                    <FiCheckCircle /> You have accepted this offer. Congratulations!
                                </p>
                            </div>
                        )}

                        {offer.status === 'REJECTED' && (
                            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                                    <FiXCircle /> You have rejected this offer.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Offer Letter Preview Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Download the PDF to view the complete offer letter with all terms and conditions.
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Confirmation Modal */}
            {confirmAction && (
                <ConfirmationModal
                    isOpen={showConfirmModal}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setConfirmAction(null);
                    }}
                    onConfirm={handleConfirmAction}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmText={confirmAction.confirmText}
                    type={confirmAction.actionType}
                    isLoading={processing}
                />
            )}
        </div>
    );
};

export default OfferDetails;
