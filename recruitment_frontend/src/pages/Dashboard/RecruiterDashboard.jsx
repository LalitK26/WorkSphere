import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { screeningService } from "../../api/screeningService";
import { interviewService } from "../../api/interviewService";
import offerService from "../../api/offerService";
import { jobOpeningService } from "../../api/jobOpeningService";
import ConfirmationModal from "../../components/ConfirmationModal";
import SuccessModal from "../../components/SuccessModal";
import {
  FiUsers,
  FiFileText,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAward,
  FiEye,
  FiThumbsUp,
  FiThumbsDown,
  FiUserPlus,
  FiUser,
  FiMessageSquare,
  FiRefreshCw,
  FiX,
  FiUserCheck,
  FiClipboard,
  FiTarget,
  FiBriefcase,
} from "react-icons/fi";
import { HiOutlineDocumentSearch, HiOutlineUserGroup } from "react-icons/hi";
import { MdOutlineAssignment } from "react-icons/md";

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [technicalClearedCandidates, setTechnicalClearedCandidates] = useState(
    [],
  );
  const [hrInterviews, setHrInterviews] = useState([]);
  const [technicalInterviewers, setTechnicalInterviewers] = useState([]);
  const [technicalInterviewsCount, setTechnicalInterviewsCount] = useState(0);
  const [allOffers, setAllOffers] = useState([]);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [assigningInterviewer, setAssigningInterviewer] = useState(null);
  const [selectedInterviewer, setSelectedInterviewer] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedbackCandidate, setSelectedFeedbackCandidate] =
    useState(null);

  // Modal States
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "warning",
    isLoading: false,
    onConfirm: () => { },
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onOk: () => { },
  });

  // Close modals helper
  const closeConfirmation = () =>
    setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
  const closeSuccess = () =>
    setSuccessModal((prev) => ({ ...prev, isOpen: false }));

  // Fetch all data from APIs
  const fetchAllData = async () => {
    try {
      setError(null);

      // Fetch all applications
      const appsData = await screeningService.getAllApplications(0, 10000);
      setApplications(appsData?.content || []);

      // Fetch shortlisted candidates (for technical assignment)
      const shortlistedData = await interviewService.getShortlistedCandidates();
      setShortlistedCandidates(shortlistedData || []);

      // Fetch HR round candidates (these are technical cleared)
      const hrRoundData = await interviewService.getHRRoundCandidates();
      setTechnicalClearedCandidates(hrRoundData || []);

      // Fetch HR interviews (paginated response)
      const hrInterviewsData = await interviewService.getMyHRInterviews('', 'All', 0, 1000);
      setHrInterviews(hrInterviewsData?.content || []);

      // Fetch technical interviewers
      const interviewersData =
        await interviewService.getTechnicalInterviewers();
      setTechnicalInterviewers(interviewersData || []);

      // Fetch all technical interviews count
      const technicalInterviewsData = await interviewService.getAllTechnicalInterviews('', 0, 1000);
      if (technicalInterviewsData && technicalInterviewsData.totalElements !== undefined) {
        setTechnicalInterviewsCount(technicalInterviewsData.totalElements);
      } else if (Array.isArray(technicalInterviewsData)) {
        setTechnicalInterviewsCount(technicalInterviewsData.length);
      } else {
        setTechnicalInterviewsCount(0);
      }

      // Fetch offers for all accepted candidates
      const acceptedApps = (appsData?.content || []).filter(
        (app) => app.status === "ACCEPTED",
      );
      const offersList = [];
      for (const app of acceptedApps) {
        try {
          const candidateOffers = await offerService.getOffersByCandidate(
            app.candidateId,
          );
          if (candidateOffers && Array.isArray(candidateOffers)) {
            offersList.push(...candidateOffers);
          }
        } catch (err) {
          // Candidate might not have offers yet, skip silently
        }
      }
      setAllOffers(offersList);

      // Fetch all job openings
      const jobOpeningsData = await jobOpeningService.getAllJobOpenings(0, 1000);
      setJobOpenings(jobOpeningsData?.content || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate summary statistics from real data
  const calculateStats = () => {
    // New applications (PENDING or REVIEWING status)
    const newApplications = applications.filter(
      (app) => app.status === "PENDING" || app.status === "REVIEWING",
    ).length;

    // Screening shortlisted (SHORTLISTED status, not yet assigned to technical interviewer)
    const screeningShortlisted = shortlistedCandidates.filter(
      (candidate) => !candidate.interviewerId,
    ).length;

    // Technical scheduled (all scheduled or rescheduled technical interviews)
    const technicalScheduled = technicalInterviewsCount;

    // Technical cleared (in HR round, waiting for HR scheduling)
    const technicalCleared = technicalClearedCandidates.filter(
      (candidate) =>
        !candidate.interviewId ||
        (candidate.interviewStatus !== "SCHEDULED" &&
          candidate.interviewStatus !== "RESCHEDULED"),
    ).length;

    // HR scheduled (HR interviews that are scheduled)
    const hrScheduled = hrInterviews.filter(
      (interview) =>
        interview.status === "SCHEDULED" || interview.status === "RESCHEDULED",
    ).length;

    // Final shortlisted (ACCEPTED status after HR)
    const finalShortlisted = applications.filter(
      (app) => app.status === "ACCEPTED",
    ).length;

    // Rejected
    const rejected = applications.filter(
      (app) => app.status === "REJECTED",
    ).length;

    // Offer generated (offers with status CREATED, SENT, or ACCEPTED)
    const offerGenerated = allOffers.filter(
      (offer) =>
        offer.status === "CREATED" ||
        offer.status === "SENT" ||
        offer.status === "ACCEPTED",
    ).length;

    // Offer pending (ACCEPTED applications without offers or with offers in CREATED status)
    const acceptedApps = applications.filter(
      (app) => app.status === "ACCEPTED",
    );
    const acceptedWithoutOffers = acceptedApps.filter((app) => {
      const candidateOffers = allOffers.filter(
        (offer) => offer.candidateId === app.candidateId,
      );
      return (
        candidateOffers.length === 0 ||
        candidateOffers.every((offer) => offer.status === "CREATED")
      );
    }).length;

    return {
      newApplications,
      screeningShortlisted,
      technicalScheduled,
      technicalCleared,
      hrScheduled,
      finalShortlisted,
      rejected,
      offerGenerated,
      offerPending: acceptedWithoutOffers,
    };
  };

  const stats = calculateStats();

  // Calculate summary statistics for new dashboard cards
  const calculateSummaryStats = () => {
    // Total Candidates - all applications
    const totalCandidates = applications.length;

    // Total Job Openings - all job openings
    const totalJobOpenings = jobOpenings.length;

    // Interviews Scheduled - HR interviews scheduled for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const interviewsScheduledToday = hrInterviews.filter((interview) => {
      if (!interview.interviewDate) return false;
      const interviewDate = new Date(interview.interviewDate);
      interviewDate.setHours(0, 0, 0, 0);
      return (
        interviewDate >= today &&
        interviewDate < tomorrow &&
        (interview.status === "SCHEDULED" || interview.status === "RESCHEDULED")
      );
    }).length;

    // Offers Issued - offers with SENT status (not yet accepted)
    const offersIssued = allOffers.filter(
      (offer) => offer.status === "SENT"
    ).length;

    // Offers Accepted - offers with ACCEPTED status
    const offersAccepted = allOffers.filter(
      (offer) => offer.status === "ACCEPTED"
    ).length;

    return {
      totalCandidates,
      totalJobOpenings,
      interviewsScheduledToday,
      offersIssued,
      offersAccepted,
    };
  };

  const summaryStats = calculateSummaryStats();

  // Screening queue - only PENDING/REVIEWING applications
  const screeningQueue = applications.filter(
    (app) => app.status === "PENDING" || app.status === "REVIEWING",
  );

  // Unassigned candidates for technical interviewers
  const unassignedCandidates = shortlistedCandidates.filter(
    (candidate) => !candidate.interviewerId,
  );

  // Technical-Cleared Candidates - only show those waiting for HR scheduling (no scheduled HR interview)
  // Show candidates who have cleared technical round but don't have a scheduled HR interview yet
  // Once HR interview is scheduled, rescheduled, or completed, they should NOT appear here
  const waitingForHRScheduling = technicalClearedCandidates.filter(
    (candidate) => {
      // Exclude if interview exists and is SCHEDULED, RESCHEDULED, or COMPLETED
      // Only show if no interview exists OR interview exists but is in a non-active state
      if (candidate.interviewId && candidate.interviewStatus) {
        const excludedStatuses = ["SCHEDULED", "RESCHEDULED", "COMPLETED"];
        return !excludedStatuses.includes(candidate.interviewStatus);
      }
      // Show if no interview exists yet (truly waiting for HR scheduling)
      return !candidate.interviewId;
    },
  );

  // HR Interview Management - only show scheduled interviews (exclude completed)
  const scheduledHRInterviews = hrInterviews.filter(
    (interview) =>
      interview.status === "SCHEDULED" || interview.status === "RESCHEDULED",
  );

  // Handle screening actions
  const initiateScreeningAction = (applicationId, status) => {
    setConfirmationModal({
      isOpen: true,
      title: `Confirm ${status === "SHORTLISTED" ? "Shortlist" : "Rejection"}`,
      message: `Are you sure you want to ${status.toLowerCase()} this candidate?`,
      confirmText: status === "SHORTLISTED" ? "Shortlist" : "Reject",
      type: status === "SHORTLISTED" ? "success" : "danger",
      isLoading: false,
      onConfirm: () => executeScreeningAction(applicationId, status),
    });
  };

  const executeScreeningAction = async (applicationId, status) => {
    try {
      setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
      setProcessingId(applicationId);

      await screeningService.updateApplicationStatus(applicationId, status);

      setConfirmationModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));

      setSuccessModal({
        isOpen: true,
        title: `${status === "SHORTLISTED" ? "Shortlisted" : "Rejected"} Successfully`,
        message: `Candidate has been ${status.toLowerCase()}.`,
        onOk: () => {
          closeSuccess();
          fetchAllData(); // Refresh data only after acknowledgement
        },
      });
    } catch (err) {
      setConfirmationModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
      showToast(
        err.response?.data?.message ||
        `Failed to ${status.toLowerCase()} application`,
        "error",
      );
      console.error("Error updating status:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle assign interviewer
  const initiateAssignInterviewer = (candidateApplicationId, interviewerId) => {
    if (!interviewerId) {
      showToast("Please select an interviewer", "error");
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: "Confirm Assignment",
      message:
        "Are you sure you want to assign this interviewer to the candidate?",
      confirmText: "Assign",
      type: "primary",
      isLoading: false,
      onConfirm: () =>
        executeAssignInterviewer(candidateApplicationId, interviewerId),
    });
  };

  const executeAssignInterviewer = async (
    candidateApplicationId,
    interviewerId,
  ) => {
    try {
      setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
      setAssigningInterviewer(candidateApplicationId);

      await interviewService.assignInterviewer(interviewerId, [
        candidateApplicationId,
      ]);

      setConfirmationModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));

      setSuccessModal({
        isOpen: true,
        title: "Assignment Successful",
        message: "Interviewer has been assigned to the candidate.",
        onOk: () => {
          closeSuccess();
          fetchAllData(); // Refresh data only after acknowledgement
          setSelectedInterviewer({
            ...selectedInterviewer,
            [candidateApplicationId]: "",
          });
        },
      });
    } catch (err) {
      setConfirmationModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
      showToast(
        err.response?.data?.message || "Failed to assign interviewer",
        "error",
      );
      console.error("Error assigning interviewer:", err);
    } finally {
      setAssigningInterviewer(null);
    }
  };

  // Handle view profile
  const handleViewProfile = async (jobApplicationId) => {
    setSelectedCandidate(jobApplicationId);
    setShowProfileModal(true);
    setLoadingDetails(true);
    try {
      const details =
        await interviewService.getCandidateDetails(jobApplicationId);
      setCandidateDetails(details);
    } catch (err) {
      console.error("Error fetching candidate details:", err);
      showToast(
        err.response?.data?.message || "Failed to load candidate details",
        "error",
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle view feedback
  const handleViewFeedback = (candidate) => {
    setSelectedFeedbackCandidate(candidate);
    setShowFeedbackModal(true);
  };

  // Handle schedule HR interview
  const handleScheduleHR = (candidate) => {
    navigate("/hr-round", { state: { candidate } });
  };

  // Open resume
  const openResume = (url) => {
    if (!url) {
      showToast("Resume not available for this candidate", "info");
      return;
    }

    let documentUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const encodedPath = encodeURIComponent(url);
      const apiBaseUrl = window.location.origin;
      documentUrl = `${apiBaseUrl}/api/files?path=${encodedPath}`;
    }

    window.open(documentUrl, "_blank");
  };

  // Get experience summary from application data
  const getExperienceSummary = (app) => {
    if (app.experiencedYears && app.experiencedYears > 0) {
      return `${app.experiencedYears} years experience`;
    }
    if (app.fresherYears && app.fresherYears > 0) {
      return `${app.fresherYears} years (Fresher)`;
    }
    return "Experience not specified";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  // Format date and time
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const dateStr = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (timeString) {
        const time =
          typeof timeString === "string"
            ? timeString.substring(0, 5)
            : timeString;
        return `${dateStr} ${time}`;
      }
      return dateStr;
    } catch (e) {
      return "N/A";
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <FiRefreshCw className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 page-container">
      {/* Custom Styles for Scrollbar */}
      <style>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 20px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94A3B8;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Recruiter Dashboard</h1>
            <p className="text-gray-600 text-sm">Manage candidates and track hiring progress</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          {error}
        </div>
      )}

      {/* Recruitment Pipeline Overview */}
      <div className="bg-white rounded-xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/60 mb-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Recruitment Pipeline Overview
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mt-1">
              Track all candidates across recruitment stages
            </p>
          </div>
          <div className="text-sm font-medium text-gray-500">
            <span className="text-gray-900 font-bold">
              {stats.newApplications +
                stats.screeningShortlisted +
                stats.technicalScheduled +
                stats.hrScheduled +
                stats.offerPending}
            </span>{" "}
            active candidates
          </div>
        </div>

        <div className="relative px-4">
          {/* Connecting Line */}
          <div className="absolute top-10 left-0 w-full h-0.5 bg-gray-100 z-0"></div>

          <div className="grid grid-responsive-stats relative z-10">
            {/* Applied */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-blue-100 flex items-center justify-center mb-4 relative shadow-sm group-hover:border-blue-500 transition-colors duration-300">
                <span className="absolute -top-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  Pending
                </span>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.newApplications}
                </div>
              </div>
              <h3 className="font-bold text-blue-600 mb-1">Applied</h3>
              <p className="text-xs text-gray-400">New applications</p>
            </div>

            {/* Screening */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center mb-4 relative shadow-sm group-hover:border-slate-400 transition-colors duration-300">
                <div className="text-2xl font-bold text-slate-600">
                  {stats.screeningShortlisted}
                </div>
              </div>
              <h3 className="font-bold text-slate-700 mb-1">Screening</h3>
              <p className="text-xs text-gray-400">Shortlisted</p>
            </div>

            {/* Technical */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-sky-200 flex items-center justify-center mb-4 relative shadow-sm group-hover:border-sky-400 transition-colors duration-300">
                <div className="text-2xl font-bold text-sky-600">
                  {stats.technicalScheduled}
                </div>
              </div>
              <h3 className="font-bold text-sky-700 mb-1">Technical</h3>
              <p className="text-xs text-gray-400">Interviews</p>
            </div>

            {/* HR Round */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-blue-200 flex items-center justify-center mb-4 relative shadow-sm group-hover:border-blue-400 transition-colors duration-300">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.hrScheduled}
                </div>
              </div>
              <h3 className="font-bold text-blue-700 mb-1">HR Round</h3>
              <p className="text-xs text-gray-400">Scheduled</p>
            </div>

            {/* Offer Stage */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-emerald-200 flex items-center justify-center mb-4 relative shadow-sm group-hover:border-emerald-400 transition-colors duration-300">
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.offerPending}
                </div>
              </div>
              <h3 className="font-bold text-emerald-700 mb-1">Offer Stage</h3>
              <p className="text-xs text-gray-400">Final stage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-10">
        <div className="grid-responsive-stats">
          {/* Total Candidates */}
          <div className="stat-card-responsive bg-white rounded-lg shadow-sm border border-gray-100 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Total Candidates</p>
                <p className="stat-value-responsive text-gray-900">{summaryStats.totalCandidates}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FiUsers className="text-2xl" />
              </div>
            </div>
          </div>

          {/* Total Job Openings */}
          <div className="stat-card-responsive bg-white rounded-lg shadow-sm border border-gray-100 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Total Job Openings</p>
                <p className="stat-value-responsive text-gray-900">{summaryStats.totalJobOpenings}</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <FiBriefcase className="text-2xl" />
              </div>
            </div>
          </div>

          {/* Interviews Scheduled */}
          <div className="stat-card-responsive bg-white rounded-lg shadow-sm border border-gray-100 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Interviews Scheduled</p>
                <p className="stat-value-responsive text-gray-900">{summaryStats.interviewsScheduledToday}</p>
              </div>
              <div className="p-3 bg-pink-50 text-pink-600 rounded-lg">
                <FiCalendar className="text-2xl" />
              </div>
            </div>
          </div>

          {/* Offers Issued */}
          <div className="stat-card-responsive bg-white rounded-lg shadow-sm border border-gray-100 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Offers Issued</p>
                <p className="stat-value-responsive text-gray-900">{summaryStats.offersIssued}</p>
              </div>
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
                <FiFileText className="text-2xl" />
              </div>
            </div>
          </div>

          {/* Offer Accepted */}
          <div className="stat-card-responsive bg-white rounded-lg shadow-sm border border-gray-100 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Offer Accepted</p>
                <p className="stat-value-responsive text-gray-900">{summaryStats.offersAccepted}</p>
              </div>
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                <FiAward className="text-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Screening Queue and Assign Technical Interviewers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Screening Queue */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 text-white rounded-lg shadow-sm">
                <FiClipboard className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Screening Queue</h2>
                <p className="text-xs text-gray-500">Review new applications</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full shadow-sm">
              {screeningQueue.length} pending
            </span>
          </div>
          <div className="p-5 max-h-[500px] overflow-y-auto thin-scrollbar">
            {screeningQueue.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-white p-3 rounded-full shadow-sm inline-flex mb-3">
                  <FiFileText className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Queue is empty
                </h3>
                <p className="text-sm text-gray-500">
                  No candidates waiting for screening
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {screeningQueue.map((app) => (
                  <div
                    key={app.id}
                    className="group bg-gradient-to-br from-white to-gray-50/30 rounded-lg p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-lg sm:text-xl group-hover:text-blue-600 transition-colors truncate">
                            {app.candidateName}
                          </h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                            New
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-2 truncate">
                          {app.jobTitle}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3.5 h-3.5 text-gray-400" />
                            {getExperienceSummary(app)}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(app.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          onClick={() => openResume(app.resumeUrl)}
                          className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm hover:shadow whitespace-nowrap w-full sm:w-auto"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          Resume
                        </button>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() =>
                              initiateScreeningAction(app.id, "SHORTLISTED")
                            }
                            disabled={processingId === app.id}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            <FiThumbsUp className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              initiateScreeningAction(app.id, "REJECTED")
                            }
                            disabled={processingId === app.id}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50"
                          >
                            <FiThumbsDown className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
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

        {/* Assign Technical Interviewers */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 text-white rounded-lg shadow-sm">
                <MdOutlineAssignment className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Assign Technical Interviewers
                </h2>
                <p className="text-xs text-gray-500">Match candidates with interviewers</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full shadow-sm">
              {unassignedCandidates.length} unassigned
            </span>
          </div>
          <div className="p-5 max-h-[500px] overflow-y-auto thin-scrollbar">
            {unassignedCandidates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-white p-3 rounded-full shadow-sm inline-flex mb-3">
                  <FiCheckCircle className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  All caught up!
                </h3>
                <p className="text-sm text-gray-500">
                  Every candidate has been assigned
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="group bg-gradient-to-br from-white to-gray-50/30 rounded-lg p-4 border border-gray-100 hover:border-cyan-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-base group-hover:text-cyan-600 transition-colors truncate">
                            {candidate.candidateName}
                          </h3>
                          <span className="text-xs font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 whitespace-nowrap">
                            Waitlisted
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-600 truncate">
                          {candidate.jobTitle}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <select
                          value={
                            selectedInterviewer[candidate.jobApplicationId] || ""
                          }
                          onChange={(e) => {
                            setSelectedInterviewer({
                              ...selectedInterviewer,
                              [candidate.jobApplicationId]: e.target.value,
                            });
                          }}
                          className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-gray-700 shadow-sm transition-all hover:border-gray-300 cursor-pointer w-full sm:w-auto"
                        >
                          <option value="">Select Interviewer</option>
                          {technicalInterviewers.map((interviewer) => (
                            <option key={interviewer.id} value={interviewer.id}>
                              {interviewer.name ||
                                interviewer.email ||
                                `Interviewer ${interviewer.id}`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            initiateAssignInterviewer(
                              candidate.jobApplicationId,
                              selectedInterviewer[candidate.jobApplicationId],
                            )
                          }
                          disabled={
                            assigningInterviewer === candidate.jobApplicationId ||
                            !selectedInterviewer[candidate.jobApplicationId]
                          }
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-md text-xs font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 whitespace-nowrap justify-center flex"
                        >
                          {assigningInterviewer === candidate.jobApplicationId
                            ? "Assigning..."
                            : "Assign"}
                        </button>
                        <button
                          onClick={() =>
                            handleViewProfile(candidate.jobApplicationId)
                          }
                          className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-all hidden sm:block"
                          title="View Profile"
                        >
                          <FiUser className="w-4 h-4" />
                        </button>
                        {/* Mobile View Profile Button */}
                        <button
                          onClick={() =>
                            handleViewProfile(candidate.jobApplicationId)
                          }
                          className="px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-xs font-medium transition-all sm:hidden flex items-center justify-center gap-2"
                        >
                          <FiUser className="w-4 h-4" /> View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Technical-Cleared Candidates and HR Interview Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Technical-Cleared Candidates */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 text-white rounded-lg shadow-sm">
                <FiCheckCircle className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Technical-Cleared Candidates
                </h2>
                <p className="text-xs text-gray-500">Ready for HR scheduling</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full shadow-sm">
              {waitingForHRScheduling.length} waiting
            </span>
          </div>
          <div className="p-5 max-h-[500px] overflow-y-auto thin-scrollbar">
            {waitingForHRScheduling.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-white p-3 rounded-full shadow-sm inline-flex mb-3">
                  <FiClock className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  No pending candidates
                </h3>
                <p className="text-sm text-gray-500">
                  No candidates waiting for HR
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingForHRScheduling.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="group bg-gradient-to-br from-white to-gray-50/30 rounded-lg p-4 border border-gray-100 hover:border-green-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-green-600 group-hover:w-1.5 transition-all"></div>

                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pl-3">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-base group-hover:text-green-600 transition-colors truncate">
                            {candidate.candidateName}
                          </h3>
                          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 whitespace-nowrap">
                            <FiCheckCircle className="w-3 h-3" />
                            Cleared
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-600 mb-2 truncate">
                          {candidate.jobTitle}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          <span className="font-medium">Feedback:</span> {candidate.remarks || "No feedback"}
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          onClick={() => handleScheduleHR(candidate)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
                        >
                          <FiCalendar className="w-3.5 h-3.5" />
                          Schedule HR
                        </button>
                        <button
                          onClick={() => handleViewFeedback(candidate)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow transition-all whitespace-nowrap"
                        >
                          <FiMessageSquare className="w-3.5 h-3.5" />
                          Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HR Interview Management */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 text-white rounded-lg shadow-sm">
                <FiCalendar className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  HR Interview Management
                </h2>
                <p className="text-xs text-gray-500">Manage scheduled interviews</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full shadow-sm">
              {scheduledHRInterviews.length} scheduled
            </span>
          </div>
          <div className="p-5 max-h-[500px] overflow-y-auto thin-scrollbar">
            {scheduledHRInterviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-white p-3 rounded-full shadow-sm inline-flex mb-3">
                  <FiCalendar className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  No interviews scheduled
                </h3>
                <p className="text-sm text-gray-500">
                  No HR interviews scheduled yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledHRInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="group bg-gradient-to-br from-white to-gray-50/30 rounded-lg p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors truncate">
                            {interview.candidateName}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border whitespace-nowrap ${interview.status === "SCHEDULED" ||
                              interview.status === "RESCHEDULED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : interview.status === "COMPLETED"
                                ? "bg-gray-100 text-gray-700 border-gray-200"
                                : "bg-red-50 text-red-700 border-red-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${interview.status === "SCHEDULED" ||
                                interview.status === "RESCHEDULED"
                                ? "bg-blue-500"
                                : "bg-gray-500"
                                }`}
                            ></span>
                            {interview.status || "N/A"}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-600 mb-1 truncate">
                          {interview.jobTitle}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FiClock className="w-3.5 h-3.5" />
                          {formatDateTime(
                            interview.interviewDate,
                            interview.interviewTime,
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleViewProfile(interview.jobApplicationId)
                        }
                        className="px-4 py-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm hover:shadow whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Shortlisted Candidates */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 mb-8 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <FiAward className="text-xl" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              Final Shortlisted Candidates
            </h2>
            <span className="px-3 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
              {stats.finalShortlisted} selected
            </span>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto thin-scrollbar">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Completion Date
                  </th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.filter((app) => app.status === "ACCEPTED")
                  .length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-50 p-3 rounded-full mb-3">
                          <FiAward className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          No candidates finally shortlisted yet
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications
                    .filter((app) => app.status === "ACCEPTED")
                    .map((app) => (
                      <tr
                        key={app.id}
                        className="group hover:bg-orange-50/30 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-bold text-gray-900 group-hover:text-orange-700 transition-colors">
                          {app.candidateName}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-700 font-medium">
                          {app.jobTitle}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-500">
                          {formatDate(app.updatedAt)}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200 shadow-sm">
                            <FiAward className="w-3 h-3 mr-1.5" />
                            Selected
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Candidate Profile</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {candidateDetails?.candidateName ||
                      selectedCandidate ||
                      "Loading..."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setCandidateDetails(null);
                    setSelectedCandidate(null);
                  }}
                  className="text-white hover:bg-blue-600 rounded-full p-2 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingDetails ? (
                <div className="text-center py-12">
                  <FiRefreshCw className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Loading candidate details...</p>
                </div>
              ) : candidateDetails ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Full Name
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {candidateDetails.candidateName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Email
                        </label>
                        <p className="text-sm font-medium text-blue-600">
                          {candidateDetails.candidateEmail || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Phone
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {candidateDetails.candidatePhone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Application Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Job Title
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {candidateDetails.jobTitle || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Company
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {candidateDetails.companyName || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No details available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedFeedbackCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Technical Feedback</h2>
                  <p className="text-green-100 text-sm mt-1">
                    {selectedFeedbackCandidate.candidateName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setSelectedFeedbackCandidate(null);
                  }}
                  className="text-white hover:bg-green-600 rounded-full p-2 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Feedback
                  </label>
                  <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200">
                    {selectedFeedbackCandidate.remarks ||
                      "No feedback available"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Result
                  </label>
                  <p className="text-sm text-gray-700">
                    <span
                      className={`px-2 py-1 rounded ${selectedFeedbackCandidate.result === "SHORTLISTED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {selectedFeedbackCandidate.result || "N/A"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;