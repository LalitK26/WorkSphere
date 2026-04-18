import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { screeningService } from '../../api/screeningService';
import offerService from '../../api/offerService';
import { FiUser, FiMail, FiBriefcase, FiCalendar, FiDollarSign, FiLoader, FiCheckCircle } from 'react-icons/fi';

const GenerateOffer = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hrShortlistedCandidates, setHrShortlistedCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        candidateId: '',
        jobOpeningId: '',
        position: '',
        department: '',
        stipendAmount: '',
        ctcAmount: '',
        joiningDate: '',
        offerDate: new Date().toISOString().split('T')[0], // Today's date
    });

    useEffect(() => {
        fetchHRShortlistedCandidates();
    }, []);

    const fetchHRShortlistedCandidates = async () => {
        try {
            setLoading(true);

            // Fetch both applications and existing offers
            const [applicationsData, offersData] = await Promise.all([
                screeningService.getAllApplications(),
                offerService.getAllOffers()
            ]);

            const applications = applicationsData.content || [];
            const offers = offersData.content || [];

            // Create a set of composite keys (candidateId-jobTitle) that already have offers
            const existingOfferKeys = new Set(offers.map(offer => `${offer.candidateId}-${offer.jobApplied}`));

            // Filter only ACCEPTED (HR-shortlisted) candidates AND those who don't have an offer for THIS position yet
            const shortlisted = applications.filter(app =>
                app.status === 'ACCEPTED' && !existingOfferKeys.has(`${app.candidateId}-${app.jobTitle}`)
            );

            setHrShortlistedCandidates(shortlisted);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCandidateSelect = (e) => {
        const applicationId = e.target.value;
        if (!applicationId) {
            setSelectedCandidate(null);
            setFormData({
                ...formData,
                candidateId: '',
                jobOpeningId: '',
            });
            return;
        }

        const application = hrShortlistedCandidates.find(app => app.id === parseInt(applicationId));
        if (application) {
            setSelectedCandidate(application);
            setFormData({
                ...formData,
                candidateId: application.candidateId,
                jobOpeningId: application.jobOpeningId,
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Restrict Stipend and CTC Amount to numbers only
        if (name === 'stipendAmount' || name === 'ctcAmount') {
            const numericValue = value.replace(/\D/g, '');
            setFormData({
                ...formData,
                [name]: numericValue,
            });
            return;
        }

        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCandidate) {
            setError('Please select a candidate');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await offerService.generateOffer(formData);

            setSuccess(true);
            setTimeout(() => {
                navigate('/offers/management');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate offer');
            console.error('Error generating offer:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiLoader className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading candidates...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCheckCircle className="text-3xl text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Generated Successfully!</h2>
                    <p className="text-gray-600 mb-4">Redirecting to offer management...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <FiBriefcase className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Generate Offer Letter</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Create offer for HR-shortlisted candidates</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {hrShortlistedCandidates.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                            <FiUser className="text-4xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No HR-Shortlisted Candidates</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            There are no candidates with ACCEPTED status available for offer generation.
                        </p>
                        <button
                            onClick={() => navigate('/screening')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Go to Screening
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        {/* Candidate Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Candidate <span className="text-red-500">*</span>
                            </label>
                            <select
                                onChange={handleCandidateSelect}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">-- Select HR-Shortlisted Candidate --</option>
                                {hrShortlistedCandidates.map((app) => (
                                    <option key={app.id} value={app.id}>
                                        {app.candidateName} - {app.jobTitle}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Candidate Info Display */}
                        {selectedCandidate && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="text-sm font-semibold text-blue-900 mb-3">Candidate Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FiUser className="text-blue-600" />
                                        <span className="text-gray-700"><strong>Name:</strong> {selectedCandidate.candidateName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FiMail className="text-blue-600" />
                                        <span className="text-gray-700"><strong>Email:</strong> {selectedCandidate.candidateEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FiBriefcase className="text-blue-600" />
                                        <span className="text-gray-700"><strong>Applied Job:</strong> {selectedCandidate.jobTitle}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FiCheckCircle className="text-green-600" />
                                        <span className="text-green-700"><strong>Status:</strong> HR-Shortlisted</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Offer Details Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Position */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Position / Designation <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Associate Software Engineer"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Engineering"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Stipend Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Stipend Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="stipendAmount"
                                    value={formData.stipendAmount}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 15,000 (Fifteen Thousand Rupees)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Include amount in words</p>
                            </div>

                            {/* CTC Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    CTC Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="ctcAmount"
                                    value={formData.ctcAmount}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 6,00,000 (Six Lakhs Rupees)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Include amount in words</p>
                            </div>

                            {/* Offer Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Offer Date
                                </label>
                                <input
                                    type="date"
                                    name="offerDate"
                                    value={formData.offerDate}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Joining Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Expected Joining Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex gap-4">
                            <button
                                type="submit"
                                disabled={submitting || !selectedCandidate}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <FiLoader className="animate-spin" />
                                        Generating Offer...
                                    </>
                                ) : (
                                    <>
                                        <FiCheckCircle />
                                        Generate Offer
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/offers/management')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GenerateOffer;
