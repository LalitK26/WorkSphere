import { useState, useRef } from 'react';
import { FiUpload, FiFile, FiCheck, FiX, FiEye, FiAlertCircle, FiLoader } from 'react-icons/fi';
import documentService from '../../api/documentService';

const DocumentUpload = ({
    documentType,
    documentTypeName,
    offerId,
    currentDocument,
    mandatory,
    onUploadSuccess
}) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setError('File size exceeds 5MB. Please upload a file smaller than 5MB.');
            return;
        }

        try {
            setUploading(true);
            setError(null);
            await documentService.uploadDocument(offerId, documentType, file);
            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload document');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleViewDocument = async () => {
        if (!currentDocument) return;

        try {
            const blob = await documentService.viewDocument(currentDocument.id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (err) {
            setError('Failed to view document');
            console.error('View error:', err);
        }
    };

    const getStatusColor = () => {
        if (!currentDocument) return 'gray';
        switch (currentDocument.verificationStatus) {
            case 'VERIFIED':
                return 'green';
            case 'RESUBMIT_REQUIRED':
                return 'red';
            case 'PENDING':
            default:
                return 'yellow';
        }
    };

    const getStatusIcon = () => {
        if (!currentDocument) return null;
        switch (currentDocument.verificationStatus) {
            case 'VERIFIED':
                return <FiCheck className="text-green-600" />;
            case 'RESUBMIT_REQUIRED':
                return <FiX className="text-red-600" />;
            case 'PENDING':
            default:
                return <FiAlertCircle className="text-yellow-600" />;
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                            {documentTypeName}
                            {mandatory && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                    </div>
                    {currentDocument && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                            {getStatusIcon()}
                            <span className={`font-medium text-${getStatusColor()}-700`}>
                                {currentDocument.verificationStatusName}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Document Info */}
            {currentDocument && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700 flex-1 min-w-0">
                            <FiFile className="text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">
                                    {currentDocument.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(currentDocument.fileSize / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleViewDocument}
                            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            title="View Document"
                        >
                            <FiEye className="text-lg" />
                            <span className="hidden sm:inline">View</span>
                        </button>
                    </div>
                    {currentDocument.remark && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                            <p className="font-semibold text-red-900 mb-1">Re-submission Required:</p>
                            <p className="text-red-800">{currentDocument.remark}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id={`file-input-${documentType}`}
                />
                <label
                    htmlFor={`file-input-${documentType}`}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors w-full sm:w-auto ${uploading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {uploading ? (
                        <>
                            <FiLoader className="animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <FiUpload />
                            {currentDocument ? 'Replace Document' : 'Upload Document'}
                        </>
                    )}
                </label>
                <span className="text-xs text-gray-500 text-center sm:text-left">PDF, JPEG, PNG (Max 5MB)</span>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                    <FiAlertCircle className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;
