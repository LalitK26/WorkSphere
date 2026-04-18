import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiAward, FiFileText, FiLink, FiBook, FiHome } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';

const CandidateProfileView = () => {
  const { showToast } = useToast();
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [technicalRemarks, setTechnicalRemarks] = useState(null);
  const [technicalResult, setTechnicalResult] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [candidateId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recruitmentCandidateService.getCandidateProfileById(candidateId);
      const profileData = response.profile || response;
      setProfile(profileData);

      // Capture latest technical interview data (if backend provided it)
      setTechnicalRemarks(
        Object.prototype.hasOwnProperty.call(response, 'technicalInterviewRemarks')
          ? response.technicalInterviewRemarks
          : null
      );
      setTechnicalResult(
        Object.prototype.hasOwnProperty.call(response, 'technicalInterviewResult')
          ? response.technicalInterviewResult
          : null
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate profile. Please try again.');
      console.error('Error loading candidate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = (url, docType) => {
    if (!url) {
      showToast(`${docType} not available for this candidate`, 'info');
      return;
    }

    let documentUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const encodedPath = encodeURIComponent(url);
      const apiBaseUrl = window.location.origin;
      documentUrl = `${apiBaseUrl}/api/files?path=${encodedPath}`;
    }

    window.open(documentUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600">{error || 'Profile not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const candidate = profile.candidate || {};
  const fullName = candidate.firstName
    ? `${candidate.firstName}${candidate.middleName ? ' ' + candidate.middleName : ''} ${candidate.lastName || ''}`.trim()
    : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <FiArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Candidate Profile</h1>
              <p className="text-sm text-gray-500 mt-0.5">View candidate information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <FiUser className="text-xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <p className="text-base font-medium text-gray-900">{fullName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                <div className="flex items-center gap-2">
                  <FiMail className="text-gray-400" />
                  <p className="text-base text-gray-900">{candidate.email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                <div className="flex items-center gap-2">
                  <FiPhone className="text-gray-400" />
                  <p className="text-base text-gray-900">{candidate.phoneNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Experience Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <FiBriefcase className="text-xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Experience Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.fresherYears !== null && profile.fresherYears !== undefined ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Experience Level</label>
                  <div className="flex items-center gap-2">
                    <FiAward className="text-gray-400" />
                    <p className="text-base font-medium text-gray-900">Fresher</p>
                  </div>
                </div>
              ) : profile.experiencedYears !== null && profile.experiencedYears !== undefined ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Years of Experience</label>
                  <div className="flex items-center gap-2">
                    <FiAward className="text-gray-400" />
                    <p className="text-base font-medium text-gray-900">
                      {profile.experiencedYears} {profile.experiencedYears === 1 ? 'year' : 'years'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Experience Level</label>
                  <p className="text-base text-gray-500">Not specified</p>
                </div>
              )}
            </div>
          </div>

          {/* Technical Interview Feedback (read-only for recruiter) */}
          {(technicalRemarks || technicalResult) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <FiAward className="text-xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Technical Interview Feedback</h2>
              </div>

              {technicalResult && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Technical Result</label>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${technicalResult === 'SHORTLISTED'
                        ? 'bg-green-100 text-green-800'
                        : technicalResult === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {technicalResult}
                  </span>
                </div>
              )}

              {technicalRemarks && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Remarks by Technical Interviewer
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {technicalRemarks}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address Information */}
          {(profile.streetAddress || profile.city || profile.state || profile.zipCode || profile.country) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <FiHome className="text-xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Address Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.streetAddress && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Street Address</label>
                    <div className="flex items-start gap-2">
                      <FiMapPin className="text-gray-400 mt-1" />
                      <p className="text-base text-gray-900">{profile.streetAddress}</p>
                    </div>
                  </div>
                )}

                {profile.city && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                    <p className="text-base text-gray-900">{profile.city}</p>
                  </div>
                )}

                {profile.state && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                    <p className="text-base text-gray-900">{profile.state}</p>
                  </div>
                )}

                {profile.zipCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Postal Code</label>
                    <p className="text-base text-gray-900">{profile.zipCode}</p>
                  </div>
                )}

                {profile.country && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                    <p className="text-base text-gray-900">{profile.country}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Education Details */}
          {profile.education && profile.education.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <FiBook className="text-xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Education Details</h2>
              </div>

              <div className="space-y-4">
                {profile.education.map((edu, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 text-lg mb-2">
                      {edu.degree} in {edu.major}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {edu.collegeName || edu.university}, {edu.university}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Start:</span> {edu.startDate || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {edu.endDate || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">CGPA/Percentage:</span> {edu.cgpaOrPercentage || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Passing Year:</span> {edu.passingYear || 'N/A'}
                      </div>
                    </div>
                    {edu.city && edu.state && edu.country && (
                      <p className="text-sm text-gray-500 mt-2">
                        {edu.city}, {edu.state}, {edu.country}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {(profile.resumeUrl || profile.portfolioUrl || profile.linkedInUrl || profile.experienceLetterUrl) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <FiFileText className="text-xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Documents & Links</h2>
              </div>

              <div className="space-y-4">
                {profile.resumeUrl && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FiFileText className="text-gray-400 text-xl" />
                      <div>
                        <p className="font-medium text-gray-900">Resume</p>
                        <p className="text-sm text-gray-500">Click to view resume</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDocument(profile.resumeUrl, 'Resume')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      View Resume
                    </button>
                  </div>
                )}

                {profile.experienceLetterUrl && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FiFileText className="text-gray-400 text-xl" />
                      <div>
                        <p className="font-medium text-gray-900">Experience Letter</p>
                        <p className="text-sm text-gray-500">Click to view experience letter</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDocument(profile.experienceLetterUrl, 'Experience Letter')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      View Letter
                    </button>
                  </div>
                )}

                {profile.portfolioUrl && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FiLink className="text-gray-400 text-xl" />
                      <div>
                        <p className="font-medium text-gray-900">Portfolio</p>
                        <p className="text-sm text-gray-500">View portfolio</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDocument(profile.portfolioUrl, 'Portfolio')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      View Portfolio
                    </button>
                  </div>
                )}

                {profile.linkedInUrl && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FiLink className="text-gray-400 text-xl" />
                      <div>
                        <p className="font-medium text-gray-900">LinkedIn</p>
                        <p className="text-sm text-gray-500">View LinkedIn profile</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDocument(profile.linkedInUrl, 'LinkedIn')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      View LinkedIn
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileView;
