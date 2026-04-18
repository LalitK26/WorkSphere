import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiMapPin, FiCalendar, FiUsers, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { candidateJobService } from '../../api/candidateJobService';
import { recruitmentCandidateService } from '../../api/recruitmentCandidateService';
import Modal from '../../components/UI/Modal';
import JobDetails from './JobDetails';

import logo from '../../assets/logo.jpeg';

const JobListings = () => {
  const [jobOpenings, setJobOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadJobOpenings();
    loadCandidateProfile();
  }, []);

  const loadJobOpenings = async () => {
    try {
      setLoading(true);
      const data = await candidateJobService.getActiveJobOpenings();
      setJobOpenings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load job openings. Please try again.');
      console.error('Error loading job openings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidateProfile = async () => {
    try {
      const response = await recruitmentCandidateService.getProfile();
      const profile = response.profile || response;
      setCandidateProfile(profile);
    } catch (err) {
      console.error('Error loading candidate profile:', err);
      // Don't block job listings if profile fails to load
    }
  };

  const handleViewDetails = (id) => {
    setSelectedJobId(id);
    setIsSidePanelOpen(true);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedJobId(null);
  };

  const isEligibleForJob = (job) => {
    // If no profile or no experience info, allow all (backward compatibility)
    if (!candidateProfile) {
      return true;
    }

    const jobMinExperience = job.minExperienceYears !== null && job.minExperienceYears !== undefined ? job.minExperienceYears : 0;

    // Check if candidate is fresher
    if (candidateProfile.fresherYears !== null && candidateProfile.fresherYears !== undefined) {
      // Fresher can only apply for jobs with 0 experience requirement
      return jobMinExperience === 0;
    }

    // Check if candidate is experienced
    if (candidateProfile.experiencedYears !== null && candidateProfile.experiencedYears !== undefined) {
      // Experienced can apply if their experience >= job requirement
      return candidateProfile.experiencedYears >= jobMinExperience;
    }

    // If no experience info set, allow all (backward compatibility)
    return true;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading job openings...</div>
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
              <FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Job Openings</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                Browse and apply for available positions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Job Listings */}
        {jobOpenings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <FiBriefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Job Openings Available</h3>
            <p className="text-gray-600">There are currently no active job openings. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobOpenings.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-6 flex flex-col h-full border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="pr-12">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors">{job.jobTitle}</h3>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{job.jobName}</p>
                    </div>
                    {/* Logo absolute top right */}
                    <div className="absolute top-6 right-6">
                      <img src={logo} alt="WorkSphere" className="w-14 h-14 object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-500 text-sm">
                      <FiMapPin className="w-4 h-4 mr-3 text-gray-400" />
                      {job.location}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <FiBriefcase className="w-4 h-4 mr-3 text-gray-400" />
                      {job.department}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <FiCalendar className="w-4 h-4 mr-3 text-gray-400" />
                      Posted {formatDate(job.postedDate)}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <FiUsers className="w-4 h-4 mr-3 text-gray-400" />
                      {(job.numberOfOpenings ?? 0)} {((job.numberOfOpenings ?? 0) === 1) ? 'opening' : 'openings'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
                      {job.jobType.replace('_', '-').toLowerCase()}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                      {job.workMode}
                    </span>
                  </div>

                  {!isEligibleForJob(job) && (
                    <div className="mb-4 flex items-start gap-2 text-amber-700 text-xs bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-100">
                      <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>Experience requirement not met</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleViewDetails(job.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md group-hover:scale-[1.02]"
                >
                  View Details
                  <FiArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side Panel for Job Details */}
      <Modal
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
        title="Job Details"
        variant="panel"
      >
        {selectedJobId && (
          <JobDetails
            jobId={selectedJobId}
            isInSidePanel={true}
            onClose={handleCloseSidePanel}
          />
        )}
      </Modal>
    </div>
  );
};

export default JobListings;
