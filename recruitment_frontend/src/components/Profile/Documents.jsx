import React, { useState } from 'react';
import { FiUpload, FiLink, FiLoader, FiFileText, FiEye, FiLinkedin, FiGlobe, FiCheck } from 'react-icons/fi';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';

const Documents = ({ data, updateData, errors, experienceType }) => {
    const [inputType, setInputType] = useState('url'); // 'url' or 'file'
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Experience Letter State
    const [expLetterUploading, setExpLetterUploading] = useState(false);
    const [expLetterError, setExpLetterError] = useState(null);
    const [expLetterSuccess, setExpLetterSuccess] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        // Validate file type
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            setUploadError('Please upload a PDF, DOC, or DOCX file');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
            setUploadError('File size exceeds 5MB. Please upload a file smaller than 5MB.');
            return;
        }

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const response = await recruitmentCandidateService.uploadResume(file);
            if (response.resumeUrl) {
                updateData({ resumeUrl: response.resumeUrl });
                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 3000);
            } else {
                setUploadError('Failed to upload resume. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading resume:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to upload resume. Please try again.';
            setUploadError(errorMessage);
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleExperienceLetterUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        // Validate file type
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            setExpLetterError('Please upload a PDF, DOC, or DOCX file');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
            setExpLetterError('File size exceeds 5MB. Please upload a file smaller than 5MB.');
            return;
        }

        setExpLetterUploading(true);
        setExpLetterError(null);
        setExpLetterSuccess(false);

        try {
            const response = await recruitmentCandidateService.uploadExperienceLetter(file);
            // console.log(response);
            if (response.experienceLetterUrl) {
                updateData({ experienceLetterUrl: response.experienceLetterUrl });
                setExpLetterSuccess(true);
                setTimeout(() => setExpLetterSuccess(false), 3000);
            } else {
                setExpLetterError('Failed to upload experience letter. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading experience letter:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to upload experience letter. Please try again.';
            setExpLetterError(errorMessage);
        } finally {
            setExpLetterUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const openDocument = (url) => {
        if (!url) return;

        let documentUrl = url;
        // Check if it's not a standard HTTP URL (likely a file path)
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // It's a file path - serve it through the /api/files endpoint
            // Encode the path to handle special characters
            const encodedPath = encodeURIComponent(url);
            const apiBaseUrl = window.location.origin;
            documentUrl = `${apiBaseUrl}/api/files?path=${encodedPath}`;
        }

        window.open(documentUrl, '_blank');
    };

    return (
        <div className="space-y-8">
            {/* Resume Section */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FiFileText className="text-blue-600" />
                            Resume / CV
                        </h2>
                        <p className="text-gray-500 mt-1">Upload your latest resume or provide a link to it.</p>
                    </div>
                    {data.resumeUrl && (
                        <button
                            onClick={() => openDocument(data.resumeUrl)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                        >
                            <FiEye />
                            View Current Resume
                        </button>
                    )}
                </div>

                {/* Upload Status Banner */}
                {uploadSuccess && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm font-medium">
                        <FiCheck className="text-lg" />
                        Resume uploaded successfully!
                    </div>
                )}

                <div className="bg-gray-50 rounded-xl p-1 border border-gray-200 inline-flex mb-6">
                    <button
                        onClick={() => setInputType('url')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${inputType === 'url'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Provide URL
                    </button>
                    <button
                        onClick={() => setInputType('file')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${inputType === 'file'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Upload File
                    </button>
                </div>

                <div className="max-w-3xl">
                    {inputType === 'url' ? (
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiLink className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="url"
                                value={data.resumeUrl?.startsWith('uploaded://') ? '' : data.resumeUrl || ''}
                                onChange={(e) => updateData({ resumeUrl: e.target.value })}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all ${errors.resumeUrl ? 'border-red-300' : 'border-gray-200'}`}
                                placeholder="https://drive.google.com/file/..."
                            />
                            <p className="text-xs text-gray-500 mt-2 ml-1">
                                Paste a public link to your resume (Google Drive, Dropbox, etc.)
                            </p>
                        </div>
                    ) : (
                        <div className="w-full">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="resume-upload"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="resume-upload"
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {uploading ? (
                                        <>
                                            <FiLoader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                                            <p className="text-sm text-gray-500">Uploading your resume...</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                                                <FiUpload className="w-6 h-6" />
                                            </div>
                                            <p className="mb-1 text-sm text-gray-700 font-medium">Click to upload or drag and drop</p>
                                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                                        </>
                                    )}
                                </div>
                            </label>
                            {uploadError && (
                                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                                    {uploadError}
                                </p>
                            )}
                            {data.resumeUrl && !data.resumeUrl.startsWith('http') && !data.resumeUrl.startsWith('uploaded://') && (
                                <p className="text-sm text-green-600 mt-3 flex items-center gap-2">
                                    <FiFileText />
                                    <span>Current file: <span className="font-medium">{data.resumeUrl.split('/').pop()}</span></span>
                                </p>
                            )}
                        </div>
                    )}
                    {errors.resumeUrl && <p className="text-red-500 text-sm mt-2">{errors.resumeUrl}</p>}
                </div>
            </div>

            {/* Experience Letter Section - Only for Experienced Candidates */}
            {experienceType === 'experienced' && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FiFileText className="text-blue-600" />
                                Experience Letter
                            </h2>
                            <p className="text-gray-500 mt-1">Upload your experience letter from previous employer.</p>
                        </div>
                        {data.experienceLetterUrl && (
                            <button
                                onClick={() => openDocument(data.experienceLetterUrl)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                                <FiEye />
                                View Current Experience Letter
                            </button>
                        )}
                    </div>

                    {/* Upload Status Banner */}
                    {expLetterSuccess && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm font-medium">
                            <FiCheck className="text-lg" />
                            Experience letter uploaded successfully!
                        </div>
                    )}

                    <div className="max-w-3xl">
                        <div className="w-full">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleExperienceLetterUpload}
                                className="hidden"
                                id="exp-letter-upload"
                                disabled={expLetterUploading}
                            />
                            <label
                                htmlFor="exp-letter-upload"
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${expLetterUploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {expLetterUploading ? (
                                        <>
                                            <FiLoader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                                            <p className="text-sm text-gray-500">Uploading your experience letter...</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                                                <FiUpload className="w-6 h-6" />
                                            </div>
                                            <p className="mb-1 text-sm text-gray-700 font-medium">Click to upload or drag and drop</p>
                                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                                        </>
                                    )}
                                </div>
                            </label>
                            {expLetterError && (
                                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                                    {expLetterError}
                                </p>
                            )}
                            {data.experienceLetterUrl && !data.experienceLetterUrl.startsWith('http') && !data.experienceLetterUrl.startsWith('uploaded://') && (
                                <p className="text-sm text-green-600 mt-3 flex items-center gap-2">
                                    <FiFileText />
                                    <span>Current file: <span className="font-medium">{data.experienceLetterUrl.split('/').pop()}</span></span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Links Section */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FiGlobe className="text-blue-600" />
                        Professional Profiles
                    </h2>
                    <p className="text-gray-500 mt-1">Add links to your portfolio and LinkedIn profile.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio URL</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiGlobe className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="url"
                                value={data.portfolioUrl || ''}
                                onChange={(e) => updateData({ portfolioUrl: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="https://yourportfolio.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn URL</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiLinkedin className="text-gray-400 group-focus-within:text-blue-700 transition-colors" />
                            </div>
                            <input
                                type="url"
                                value={data.linkedInUrl || ''}
                                onChange={(e) => updateData({ linkedInUrl: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="https://linkedin.com/in/username"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Documents;
