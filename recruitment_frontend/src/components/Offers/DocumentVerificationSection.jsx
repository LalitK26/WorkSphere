import { useState, useEffect } from 'react';
import { FiFileText, FiLoader, FiCheckCircle, FiSave } from 'react-icons/fi';
import documentService from '../../api/documentService';
import DocumentUpload from './DocumentUpload';
import Toast from '../Toast';

const DocumentVerificationSection = ({ offerId, onUpdate }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    // Define document types with their details
    const documentTypes = [
        // Mandatory documents
        {
            type: 'LEAVING_CERTIFICATE',
            name: 'Leaving Certificate (Age Verification)',
            mandatory: true
        },
        {
            type: 'BIRTH_CERTIFICATE',
            name: 'Birth Certificate (Age Verification)',
            mandatory: true
        },
        { type: 'AADHAR_CARD', name: 'Aadhar Card', mandatory: true },
        { type: 'PAN_CARD', name: 'PAN Card', mandatory: true },
        { type: 'PASSPORT_PHOTO', name: 'Passport Size Photo', mandatory: true },
        { type: 'TENTH_MARKSHEET', name: '10th Marksheet', mandatory: true },
        { type: 'BACHELOR_MARKSHEET', name: "Bachelor's Degree Marksheet", mandatory: true },
        { type: 'TWELFTH_MARKSHEET', name: '12th/Diploma Marksheet', mandatory: true },
    ];

    useEffect(() => {
        fetchDocuments();
    }, [offerId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const docs = await documentService.getDocumentsByOffer(offerId);
            setDocuments(docs);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load documents');
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadSuccess = () => {
        fetchDocuments();
        if (onUpdate) onUpdate();
    };

    const getDocumentByType = (type) => {
        return documents.find(doc => doc.documentType === type);
    };

    const calculateProgress = () => {
        const mandatoryDocs = documentTypes.filter(dt => dt.mandatory);
        const uploadedMandatory = mandatoryDocs.filter(dt => {
            const doc = getDocumentByType(dt.type);
            return doc && (doc.verificationStatus === 'VERIFIED' || doc.verificationStatus === 'PENDING');
        });

        const totalMandatory = mandatoryDocs.length;
        const totalVerified = uploadedMandatory.length;

        return {
            total: totalMandatory,
            verified: totalVerified,
            percentage: totalMandatory > 0 ? Math.round((totalVerified / totalMandatory) * 100) : 0
        };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-center py-8">
                    <FiLoader className="animate-spin text-3xl text-blue-600" />
                </div>
            </div>
        );
    }

    const progress = calculateProgress();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiFileText className="text-blue-600" />
                        Document Verification
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Upload all mandatory documents to proceed with accepting the offer
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{progress.percentage}%</div>
                    <div className="text-xs text-gray-600">
                        {progress.verified}/{progress.total} Uploaded
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Mandatory Documents Note */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> All listed documents are mandatory. Both Leaving Certificate and Birth Certificate are required.
                </p>
            </div>

            {/* Document List */}
            <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentTypes.map(docType => (
                        <DocumentUpload
                            key={docType.type}
                            documentType={docType.type}
                            documentTypeName={docType.name}
                            offerId={offerId}
                            currentDocument={getDocumentByType(docType.type)}
                            mandatory={docType.mandatory}
                            onUploadSuccess={handleUploadSuccess}
                        />
                    ))}
                </div>
            </div>
            {/* Verification Status Message */}
            {progress.percentage === 100 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                        <FiCheckCircle className="text-green-600" />
                        All mandatory documents have been uploaded! You can now accept the offer.
                    </p>
                </div>
            )}

            {/* Save Button for Candidate */}
            <div className="flex justify-end mt-6">
                <button
                    onClick={() => setToast({ message: 'Documents saved successfully.', type: 'success' })}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <FiSave />
                    Save Documents
                </button>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default DocumentVerificationSection;
