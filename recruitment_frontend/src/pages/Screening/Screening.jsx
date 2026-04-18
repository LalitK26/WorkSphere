import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { screeningService } from '../../api/screeningService';
import { FiFileText, FiBriefcase, FiCheckCircle, FiXCircle, FiLoader, FiMail, FiPhone, FiAward, FiFilter, FiLayers, FiX } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const Screening = () => {
  const { showToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SHORTLISTED, REJECTED

  // Modal States
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    isLoading: false,
    onConfirm: () => { }
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onOk: () => { }
  });

  const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  const closeSuccess = () => setSuccessModal(prev => ({ ...prev, isOpen: false }));
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobTitle = searchParams.get('jobTitle');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (selectedJobTitle) {
      fetchApplicationsByJobTitle(selectedJobTitle);
    } else {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobTitle]);

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const data = await screeningService.getJobTitleStatistics();
      setStatistics(data || []);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStatsError(err.response?.data?.message || 'Failed to load statistics');
      setStatistics([]);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await screeningService.getAllApplications();
      setApplications(data.content || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications');
      console.error('Error fetching applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationsByJobTitle = async (jobTitle) => {
    try {
      setLoading(true);
      setError(null);
      const data = await screeningService.getApplicationsByJobTitle(jobTitle);
      setApplications(Array.isArray(data) ? data : (data.content || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications');
      console.error('Error fetching applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobTitleClick = (jobTitle) => {
    if (selectedJobTitle === jobTitle) {
      // If clicking the same job title, clear the filter
      setSearchParams({});
    } else {
      // Set the job title filter
      setSearchParams({ jobTitle: jobTitle });
    }
  };

  const initiateStatusUpdate = (applicationId, status) => {
    setConfirmationModal({
      isOpen: true,
      title: `Confirm ${status === 'SHORTLISTED' ? 'Shortlist' : 'Rejection'}`,
      message: `Are you sure you want to ${status.toLowerCase()} this candidate?`,
      confirmText: status === 'SHORTLISTED' ? 'Shortlist' : 'Reject',
      type: status === 'SHORTLISTED' ? 'success' : 'danger',
      isLoading: false,
      onConfirm: () => executeStatusUpdate(applicationId, status)
    });
  };

  const executeStatusUpdate = async (applicationId, status) => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setProcessingId(applicationId);

      await screeningService.updateApplicationStatus(applicationId, status);

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Status Updated',
        message: `Application has been ${status.toLowerCase()} successfully.`,
        onOk: () => {
          // Update local state and UI only after user acknowledges
          setApplications(prevApps => prevApps.map(app =>
            app.id === applicationId
              ? { ...app, status: status }
              : app
          ));
          fetchStatistics();
          closeSuccess();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      showToast(err.response?.data?.message || `Failed to ${status.toLowerCase()} application`, 'error');
      console.error('Error updating status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const openDocument = (url, docType) => {
    if (!url) {
      showToast(`${docType} not available for this candidate`, 'info');
      return;
    }

    // Check if the URL is a file path (starts with "uploads/" or doesn't start with "http")
    // If it's a file path, convert it to the API endpoint URL
    let documentUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // It's a file path - serve it through the /api/files endpoint
      // Encode the path to handle special characters
      const encodedPath = encodeURIComponent(url);
      const apiBaseUrl = window.location.origin;
      documentUrl = `${apiBaseUrl}/api/files?path=${encodedPath}`;
    }

    window.open(documentUrl, '_blank');
  };

  // Filter applications based on status
  const filteredApplications = applications.filter((application) => {
    if (statusFilter === 'ALL') {
      return true;
    }
    // Check if candidate passed screening (Has technical result OR is Shortlisted/Accepted)
    const passedScreening = application.status === 'SHORTLISTED' ||
      application.status === 'ACCEPTED' ||
      !!application.technicalInterviewResult; // If they have a tech result, they passed screening

    // Check if candidate matches Rejected criteria for Screening round (Rejected AND no tech result)
    const rejectedInScreening = application.status === 'REJECTED' && !application.technicalInterviewResult;

    if (statusFilter === 'SHORTLISTED') {
      return passedScreening;
    }
    if (statusFilter === 'REJECTED') {
      return rejectedInScreening;
    }
    if (statusFilter === 'PENDING_DECISION') {
      return !passedScreening && !rejectedInScreening;
    }
    return application.status === statusFilter;
  });

  // Sort applications: Pending first, then Shortlisted, then Rejected
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const getStatusPriority = (app) => {
      const passedScreening = app.status === 'SHORTLISTED' || app.status === 'ACCEPTED' || !!app.technicalInterviewResult;
      const rejectedInScreening = app.status === 'REJECTED' && !app.technicalInterviewResult;

      if (!passedScreening && !rejectedInScreening) return 1; // Pending first
      if (passedScreening) return 2; // Shortlisted second
      if (rejectedInScreening) return 3; // Rejected last
      return 1;
    };
    return getStatusPriority(a) - getStatusPriority(b);
  });

  // Calculate generic stats for the header
  const totalApps = applications.length;
  // Shortlisted in screening = Passed screening criteria
  const shortlistedApps = applications.filter(app =>
    app.status === 'SHORTLISTED' || app.status === 'ACCEPTED' || !!app.technicalInterviewResult
  ).length;
  // Rejected in screening = Rejected criteria
  const rejectedApps = applications.filter(app =>
    app.status === 'REJECTED' && !app.technicalInterviewResult
  ).length;

  // Format date and time for display
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr}`;
    } catch (error) {
      return 'N/A';
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-1">
                <FiLayers className="text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Screening</h1>
                <p className="text-sm text-gray-500 mt-0.5">Review resumes and shortlist candidates</p>
              </div>
            </div>

            {/* Right: Quick Stats */}
            {!loading && (
              <div className="flex items-center gap-2 sm:gap-6 text-sm">
                <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                  <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">Total</span>
                  <span className="font-bold text-gray-900 text-lg leading-none">{totalApps}</span>
                </div>
                <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                  <span className="text-green-600 font-medium text-xs uppercase tracking-wider">Shortlisted</span>
                  <span className="font-bold text-green-700 text-lg leading-none">{shortlistedApps}</span>
                </div>
                <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                  <span className="text-red-500 font-medium text-xs uppercase tracking-wider">Rejected</span>
                  <span className="font-bold text-red-600 text-lg leading-none">{rejectedApps}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-max-width page-container">
        {/* Job Title Filter Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications by Job Title</h2>
          {statsLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FiLoader className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Loading statistics...</p>
            </div>
          ) : statsError ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-amber-800 text-sm font-medium">{statsError}</p>
                <button
                  onClick={fetchStatistics}
                  className="mt-3 text-sm text-amber-700 hover:text-amber-900 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : statistics.length > 0 ? (
            <>
              <div className="grid-responsive-4-col">
                {statistics.map((stat) => (
                  <button
                    key={stat.jobTitle}
                    onClick={() => handleJobTitleClick(stat.jobTitle)}
                    className={`group relative bg-white rounded-xl border-2 p-6 text-left transition-all duration-200 ${selectedJobTitle === stat.jobTitle
                      ? 'border-blue-500 shadow-lg shadow-blue-100 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                  >
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 transition-colors ${selectedJobTitle === stat.jobTitle
                      ? 'bg-blue-100'
                      : 'bg-gray-100 group-hover:bg-blue-50'
                      }`}>
                      <FiBriefcase className={`text-xl ${selectedJobTitle === stat.jobTitle ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                        }`} />
                    </div>

                    {/* Job Title */}
                    <h3 className="text-base font-semibold text-gray-900 mb-1 truncate" title={stat.jobTitle}>
                      {stat.jobTitle}
                    </h3>

                    {/* Application Count */}
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${selectedJobTitle === stat.jobTitle ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                        {stat.applicationCount}
                      </span>
                      <span className="text-sm text-gray-500">
                        {stat.applicationCount === 1 ? 'application' : 'applications'}
                      </span>
                    </div>

                    {/* Active Indicator */}
                    {selectedJobTitle === stat.jobTitle && (
                      <div className="absolute top-4 right-4">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedJobTitle && (
                <div className="mt-4">
                  <button
                    onClick={() => setSearchParams({})}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <span>Clear filter: {selectedJobTitle}</span>
                    <FiX className="text-lg" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiBriefcase className="text-3xl text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No job statistics available</p>
              <p className="text-sm text-gray-500">Statistics will appear when applications are received</p>
            </div>
          )}
        </div>

        {/* Status Filter */}
        {!loading && !error && applications.length > 0 && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-semibold text-gray-700">Filter by Status:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  All Applications
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING_DECISION')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'PENDING_DECISION'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('SHORTLISTED')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'SHORTLISTED'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Shortlisted
                </button>
                <button
                  onClick={() => setStatusFilter('REJECTED')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'REJECTED'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Rejected
                </button>
              </div>
              {statusFilter !== 'ALL' && (
                <div className="sm:ml-auto text-sm text-gray-600">
                  <span className="font-medium">{filteredApplications.length}</span> of <span className="font-medium">{applications.length}</span> application(s)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <FiLoader className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading applications...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl">
            <p className="font-medium">{error}</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <FiBriefcase className="text-4xl text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">
              {statusFilter !== 'ALL'
                ? `No ${statusFilter.toLowerCase()} applications found`
                : selectedJobTitle
                  ? `No applications for "${selectedJobTitle}"`
                  : 'No applications to review'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {statusFilter !== 'ALL' || selectedJobTitle
                ? 'Try adjusting your filters to see more results'
                : 'Applications will appear here when candidates apply'}
            </p>
            {(selectedJobTitle || statusFilter !== 'ALL') && (
              <div className="flex gap-3 justify-center">
                {selectedJobTitle && (
                  <button
                    onClick={() => setSearchParams({})}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View all applications
                  </button>
                )}
                {statusFilter !== 'ALL' && (
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Clear status filter
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedApplications.map((application) => {
              // Determine view status for this specific candidate
              const passedScreening = application.status === 'SHORTLISTED' || application.status === 'ACCEPTED' || !!application.technicalInterviewResult;
              const rejectedInScreening = application.status === 'REJECTED' && !application.technicalInterviewResult;

              let displayStatus = 'PENDING';
              if (passedScreening) displayStatus = 'SHORTLISTED';
              else if (rejectedInScreening) displayStatus = 'REJECTED';

              return (
                <div
                  key={application.id}
                  className={`bg-white rounded-r-xl rounded-l-md border border-gray-200 p-6 transition-all duration-200 border-l-[4px] 
                  ${displayStatus === 'SHORTLISTED'
                      ? 'border-l-green-500 shadow-sm opacity-90 hover:opacity-100 hover:shadow-md'
                      : displayStatus === 'REJECTED'
                        ? 'border-l-red-500 shadow-sm hover:shadow-md opacity-75 hover:opacity-100' // slightly fading rejected too
                        : 'border-l-amber-500 shadow-md hover:shadow-xl hover:border-blue-300 transform hover:-translate-y-0.5' // Pending pops more
                    }`}
                >
                  {/* Header: Name + Status Badge */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div
                      className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/screening/candidate/${application.candidateId}`)}
                    >
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                        {application.candidateName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold text-gray-700">Applied for:</span> {application.jobTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${displayStatus === 'SHORTLISTED'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : displayStatus === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {displayStatus === 'SHORTLISTED' && <FiCheckCircle className="text-sm" />}
                        {displayStatus === 'REJECTED' && <FiXCircle className="text-sm" />}
                        {displayStatus === 'PENDING' && <FiLoader className="text-sm" />}
                        {displayStatus === 'SHORTLISTED' ? 'Shortlisted' :
                          displayStatus === 'REJECTED' ? 'Rejected' :
                            'Pending'}
                      </span>
                      {application.createdAt && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(application.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                        <FiMail className="text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Email</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium truncate" title={application.candidateEmail}>
                          {application.candidateEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                        <FiPhone className="text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Phone</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {application.candidatePhone}
                        </p>
                      </div>
                    </div>

                    {(application.fresherYears || application.experiencedYears) && (
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                          <FiAward className="text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Experience</p>
                          <p className="text-sm sm:text-base text-gray-900 font-medium">
                            {application.experiencedYears
                              ? `${application.experiencedYears} years`
                              : `${application.fresherYears} years (Fresher)`
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - All inline */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => openDocument(application.resumeUrl, 'Resume')}
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!application.resumeUrl}
                    >
                      <FiFileText className="text-base" />
                      View Resume
                    </button>

                    {application.experiencedYears > 0 && (
                      <button
                        onClick={() => openDocument(application.experienceLetterUrl, 'Experience Letter')}
                        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!application.experienceLetterUrl}
                        title={!application.experienceLetterUrl ? "No experience letter uploaded" : "View Experience Letter"}
                      >
                        <FiFileText className="text-base" />
                        View Experience Letter
                      </button>
                    )}

                    {/* Shortlist and Reject buttons - only show if status is PENDING or REVIEWING */}
                    {(application.status === 'PENDING' || application.status === 'REVIEWING') && (
                      <>
                        <button
                          onClick={() => initiateStatusUpdate(application.id, 'SHORTLISTED')}
                          disabled={processingId === application.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === application.id ? (
                            <FiLoader className="animate-spin text-base" />
                          ) : (
                            <FiCheckCircle className="text-base" />
                          )}
                          Shortlist
                        </button>
                        <button
                          onClick={() => initiateStatusUpdate(application.id, 'REJECTED')}
                          disabled={processingId === application.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === application.id ? (
                            <FiLoader className="animate-spin text-base" />
                          ) : (
                            <FiXCircle className="text-base" />
                          )}
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
};

export default Screening;
