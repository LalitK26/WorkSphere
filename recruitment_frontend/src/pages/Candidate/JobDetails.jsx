import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiBriefcase,
  FiCalendar,
  FiUsers,
  FiClock,
  FiArrowLeft,
  FiAward,
  FiCode,
  FiAlertCircle,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import { candidateJobService } from "../../api/candidateJobService";
import { recruitmentCandidateService } from "../../api/recruitmentCandidateService";
import ApplicationForm from "./ApplicationForm";
import { useAuth } from "../../context/AuthContext";
import { addNotification } from "../../utils/notificationStorage";

const JobDetails = ({ jobId: propJobId, isInSidePanel = false, onClose }) => {
  const { id: paramId } = useParams();
  const id = isInSidePanel ? propJobId : paramId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState(null);

  useEffect(() => {
    if (id) {
      loadJobDetails();
      checkApplicationStatus();
      loadCandidateProfile();
    }
  }, [id]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const data = await candidateJobService.getJobOpeningById(id);
      setJob(data);
      setError(null);
    } catch (err) {
      setError("Failed to load job details. Please try again.");
      console.error("Error loading job details:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      const applications = await candidateJobService.getMyApplications();
      const applied = applications.some(
        (app) => app.jobOpeningId === parseInt(id),
      );
      setHasApplied(applied);
    } catch (err) {
      console.error("Error checking application status:", err);
    }
  };

  const loadCandidateProfile = async () => {
    try {
      const response = await recruitmentCandidateService.getProfile();
      const profile = response.profile || response;
      setCandidateProfile(profile);
    } catch (err) {
      console.error("Error loading candidate profile:", err);
      // Don't block job details if profile fails to load
    }
  };

  const isEligibleForJob = () => {
    if (!job) {
      // If no job data, allow (backward compatibility)
      return true;
    }

    const jobMinExperience =
      job.minExperienceYears !== null && job.minExperienceYears !== undefined
        ? job.minExperienceYears
        : 0;

    // If job requires 0 years (fresher), anyone can apply
    if (jobMinExperience === 0) {
      return true;
    }

    // If job requires experience but no profile loaded yet, return null to indicate unknown
    if (!candidateProfile) {
      return null; // Will show loading or allow attempt (backend will validate)
    }

    // Check if candidate is fresher
    if (
      candidateProfile.fresherYears !== null &&
      candidateProfile.fresherYears !== undefined
    ) {
      // Fresher cannot apply for jobs with experience requirement
      return false;
    }

    // Check if candidate is experienced
    if (
      candidateProfile.experiencedYears !== null &&
      candidateProfile.experiencedYears !== undefined
    ) {
      // Experienced can apply if their experience >= job requirement
      return candidateProfile.experiencedYears >= jobMinExperience;
    }

    // If no experience info set and job requires experience, not eligible
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleApplicationSuccess = () => {
    setHasApplied(true);
    setShowApplicationForm(false);
    try {
      addNotification(user?.userId != null ? String(user.userId) : null, {
        title: "Application submitted",
        message: `You have successfully applied for ${job?.jobTitle ?? "the position"}.`,
        redirectPath: "/my-applications",
      });
    } catch (_) {}

    // Close modal if in side panel, otherwise redirect
    if (isInSidePanel && onClose) {
      onClose();
    } else {
      navigate("/job-openings");
    }
  };

  if (loading) {
    if (isInSidePanel) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600">Loading job details...</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    if (isInSidePanel) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-600">{error || "Job not found"}</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/job-openings")}
            className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Job Listings
          </button>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600">{error || "Job not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isInSidePanel
          ? ""
          : "min-h-screen bg-gray-50/50 p-4 sm:p-6 md:p-10 font-sans"
      }
    >
      <div className={isInSidePanel ? "" : "max-w-4xl mx-auto"}>
        <div
          className={
            isInSidePanel
              ? "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          }
        >
          {/* Header Section */}
          <div
            className={
              isInSidePanel
                ? "px-6 py-6 border-b border-gray-100"
                : "px-8 py-8 border-b border-gray-100 bg-white"
            }
          >
            <div className="flex items-start gap-5">
              {!isInSidePanel && (
                <button
                  onClick={() => navigate("/job-openings")}
                  className="mt-1 p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  aria-label="Back to Job Listings"
                >
                  <FiArrowLeft className="w-6 h-6" />
                </button>
              )}

              <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>Job Openings</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700 font-medium">
                      {job.department}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {job.jobTitle}
                  </h1>
                  <p className="text-lg text-gray-600 font-medium tracking-tight">
                    WorkSphere India
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {hasApplied ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                      <FiCheck className="w-4 h-4" />
                      Applied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Not Applied
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={isInSidePanel ? "p-6" : "p-8"}>
            {/* Job Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-10">
              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiMapPin className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Location
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6">
                  {job.location}
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiBriefcase className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Department
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6">
                  {job.department}
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiClock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Job Type
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6 capitalize">
                  {job.jobType.replace("_", "-").toLowerCase()}
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiUsers className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Work Mode
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6">
                  {job.workMode}
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiCalendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Posted Date
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6">
                  {formatDate(job.postedDate)}
                </div>
              </div>

              {job.minExperienceYears !== null &&
                job.minExperienceYears !== undefined && (
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                      <FiAward className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Experience
                      </span>
                    </div>
                    <div className="text-base font-medium text-gray-900 pl-6">
                      {job.minExperienceYears === 0
                        ? "Fresher"
                        : `${job.minExperienceYears} ${job.minExperienceYears === 1 ? "Year" : "Years"}`}
                    </div>
                  </div>
                )}

              <div className="group">
                <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                  <FiUsers className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Number of Openings
                  </span>
                </div>
                <div className="text-base font-medium text-gray-900 pl-6">
                  {job.numberOfOpenings ?? 0}{" "}
                  {(job.numberOfOpenings ?? 0) === 1 ? "opening" : "openings"}
                </div>
              </div>

              {job.applicationDate && hasApplied && (
                <div className="group">
                  <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Applied On
                    </span>
                  </div>
                  <div className="text-base font-medium text-gray-900 pl-6">
                    {formatDate(job.applicationDate)}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100 mb-8" />

            {/* Skills Section */}
            {job.requiredSkills && job.requiredSkills.trim() && (
              <div className="mb-10">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  Required Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.split(/[,\n]+/).map((skill, index) => {
                    const trimmed = skill.trim();
                    if (!trimmed) return null;
                    return (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200"
                      >
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Area */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              {hasApplied ? (
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 text-green-600 rounded-full flex-shrink-0">
                    <FiCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-green-900 font-semibold mb-1">
                      Application Received
                    </h4>
                    <p className="text-green-700 text-sm">
                      You have already applied for this position. We will review
                      your profile and get back to you.
                    </p>
                  </div>
                </div>
              ) : (
                (() => {
                  const eligible = isEligibleForJob();
                  const jobMinExperience =
                    job.minExperienceYears !== null &&
                    job.minExperienceYears !== undefined
                      ? job.minExperienceYears
                      : 0;
                  const isFresher =
                    candidateProfile?.fresherYears !== null &&
                    candidateProfile?.fresherYears !== undefined;
                  const hasExperience =
                    candidateProfile?.experiencedYears !== null &&
                    candidateProfile?.experiencedYears !== undefined;
                  const noExperienceInfo =
                    !candidateProfile || (!isFresher && !hasExperience);

                  if (
                    eligible === false ||
                    (jobMinExperience > 0 && noExperienceInfo)
                  ) {
                    return (
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
                          <FiInfo className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-amber-900 font-semibold mb-1">
                            Not Eligible
                          </h4>
                          <p className="text-amber-700 text-sm mb-3">
                            {noExperienceInfo && jobMinExperience > 0 ? (
                              <>
                                Please update your profile with your experience
                                information before applying.
                                {` This role requires ${job.minExperienceYears}+ years of experience.`}
                              </>
                            ) : isFresher ? (
                              <>
                                This role requires {job.minExperienceYears}+
                                years of experience. Freshers are not eligible
                                for this position.
                              </>
                            ) : (
                              <>
                                Your experience does not match the requirements
                                for this role.
                                {` This role requires ${job.minExperienceYears}+ years, but you have ${candidateProfile?.experiencedYears || 0} years.`}
                              </>
                            )}
                          </p>
                          <button
                            disabled
                            className="px-6 py-2.5 bg-gray-200 text-gray-500 rounded-lg font-medium text-sm cursor-not-allowed w-full md:w-auto"
                          >
                            Apply for this Position
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (showApplicationForm) {
                    return (
                      <ApplicationForm
                        jobId={job.id}
                        jobTitle={job.jobTitle}
                        onSuccess={handleApplicationSuccess}
                        onCancel={() => setShowApplicationForm(false)}
                      />
                    );
                  }

                  return (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-1">
                          Interested in this role?
                        </h4>
                        <p className="text-gray-500 text-sm">
                          Review the details above and apply to get started.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowApplicationForm(true)}
                        className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm hover:shadow transition-all transform active:scale-95"
                      >
                        Apply for this Position
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
