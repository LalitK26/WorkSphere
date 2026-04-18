import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../../api/interviewService';
import { FiSearch, FiCalendar, FiClock, FiEdit2, FiEye, FiBriefcase, FiX, FiUser, FiMail, FiPhone, FiFileText, FiGlobe, FiAward, FiVideo, FiRefreshCw } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const Interviews = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [recruiters, setRecruiters] = useState([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

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

  useEffect(() => {
    fetchInterviews();
    fetchRecruiters();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewService.getMyScheduledInterviews();
      setInterviews(data || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load scheduled interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      // console.log('Fetching recruiters...');
      const data = await interviewService.getRecruiters();
      // console.log('Recruiters fetched:', data);
      // console.log('Recruiters count:', data ? data.length : 0);
      setRecruiters(data || []);
    } catch (err) {
      console.error('Error fetching recruiters:', err);
      console.error('Error details:', err.response?.data);
    }
  };

  const handleRescheduleClick = (interview) => {
    setSelectedInterview(interview);
    // Format date for input field (YYYY-MM-DD)
    const formattedDate = interview.interviewDate
      ? (typeof interview.interviewDate === 'string'
        ? interview.interviewDate.split('T')[0]
        : new Date(interview.interviewDate).toISOString().split('T')[0])
      : '';
    // Format time for input field (HH:mm)
    const formattedTime = interview.interviewTime
      ? (typeof interview.interviewTime === 'string'
        ? interview.interviewTime.substring(0, 5)
        : interview.interviewTime)
      : '';
    setRescheduleDate(formattedDate);
    setRescheduleTime(formattedTime);
    setShowRescheduleModal(true);
  };

  const initiateReschedule = () => {
    if (!rescheduleDate || !rescheduleTime) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(rescheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showToast('Interview date cannot be in the past', 'error');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Reschedule',
      message: `Are you sure you want to reschedule this interview to ${rescheduleDate} at ${rescheduleTime}?`,
      confirmText: 'Reschedule',
      type: 'warning',
      isLoading: false,
      onConfirm: executeReschedule
    });
  };

  const executeReschedule = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setRescheduling(true);

      await interviewService.rescheduleInterview(
        selectedInterview.id,
        rescheduleDate,
        rescheduleTime
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Interview Rescheduled',
        message: 'The interview has been rescheduled successfully.',
        onOk: () => {
          closeSuccess();
          setShowRescheduleModal(false);
          setSelectedInterview(null);
          setRescheduleDate('');
          setRescheduleTime('');
          fetchInterviews();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error rescheduling interview:', err);
      showToast(err.response?.data?.message || 'Failed to reschedule interview', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  const handleViewClick = async (interview) => {
    setSelectedInterview(interview);
    setShowViewModal(true);
    window.scrollTo(0, 0);
    setLoadingDetails(true);
    try {
      const details = await interviewService.getCandidateDetails(interview.jobApplicationId);
      setCandidateDetails(details);
    } catch (err) {
      console.error('Error fetching candidate details:', err);
      showToast(err.response?.data?.message || 'Failed to load candidate details', 'error');
      setShowViewModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleJoinMeeting = (interview) => {
    // Navigate to the built-in WebRTC video conferencing meeting page
    navigate(`/interview/${interview.id}/meeting`);
  };

  const handleResultClick = (interview) => {
    setSelectedInterview(interview);
    setSelectedResult('');
    setResultRemarks('');
    setSelectedRecruiter('');
    setShowResultModal(true);
  };

  const initiateSubmitResult = () => {
    if (!selectedResult) {
      showToast('Please select a result', 'error');
      return;
    }

    if (selectedResult === 'SHORTLISTED' && !selectedRecruiter) {
      showToast('Please select a recruiter for HR round', 'error');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Submit Interview Result',
      message: 'Are you sure you want to submit this result? This action cannot be undone.',
      confirmText: 'Submit Result',
      type: 'primary',
      isLoading: false,
      onConfirm: executeSubmitResult
    });
  };

  const executeSubmitResult = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setSubmitting(true);

      await interviewService.submitTechnicalResult(
        selectedInterview.id,
        selectedResult,
        resultRemarks,
        selectedResult === 'SHORTLISTED' ? selectedRecruiter : null
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Result Submitted',
        message: 'The interview result has been submitted successfully.',
        onOk: () => {
          closeSuccess();
          setShowResultModal(false);
          setSelectedInterview(null);
          fetchInterviews();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error submitting result:', err);
      showToast(err.response?.data?.message || 'Failed to submit result', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [activeFilter, setActiveFilter] = useState('Pending');

  const getStatusDisplay = (status) => {
    if (status === 'SCHEDULED') {
      return {
        text: 'Scheduled',
        className: 'bg-green-100 text-green-800'
      };
    } else if (status === 'RESCHEDULED') {
      return {
        text: 'Rescheduled',
        className: 'bg-green-100 text-green-800'
      };
    } else if (status === 'COMPLETED') {
      return {
        text: 'Completed',
        className: 'bg-gray-100 text-gray-800'
      };
    } else if (status === 'CANCELLED') {
      return {
        text: 'Cancelled',
        className: 'bg-red-100 text-red-800'
      };
    }
    return {
      text: status || 'Unknown',
      className: 'bg-gray-100 text-gray-800'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    if (typeof timeString === 'string') {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  // Filter Logic
  const getFilteredInterviews = () => {
    return interviews.filter(interview => {
      // Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        interview.candidateName?.toLowerCase().includes(searchLower) ||
        interview.candidateEmail?.toLowerCase().includes(searchLower) ||
        interview.jobTitle?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Tab Filter
      const result = interview.result; // Assuming result field exists
      const status = interview.status;

      switch (activeFilter) {
        case 'Pending':
          // Scheduled OR Completed but result not declared
          return (status === 'SCHEDULED' || status === 'RESCHEDULED' || status === 'COMPLETED') &&
            (!result || result === 'PENDING' || result === '');
        case 'Completed':
          // Interview Completed AND Result Declared
          // (User definition of Completed filter: candidates whose interview is completed AND result declared)
          return status === 'COMPLETED' && (result === 'SHORTLISTED' || result === 'REJECTED');
        case 'Shortlisted':
          return result === 'SHORTLISTED';
        case 'Rejected':
          return result === 'REJECTED';
        default:
          return true;
      }
    });
  };

  const filteredInterviews = getFilteredInterviews();

  // Counts for Header
  const totalCount = interviews.length;
  // Pending filter count (Scheduled/Completed with no result)
  const pendingCount = interviews.filter(i => (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED' || i.status === 'COMPLETED') && (!i.result || i.result === 'PENDING' || i.result === '')).length;
  // Completed filter count (Completed with result)
  const completedProcessCount = interviews.filter(i => i.status === 'COMPLETED' && (i.result === 'SHORTLISTED' || i.result === 'REJECTED')).length;


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* UI Redesign: Header Stats */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm">
                <FiCalendar className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Interviews</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage and track candidate interviews efficiently</p>
              </div>
            </div>

            {/* Right: Boxed Stats */}
            {!loading && (
              <div className="flex items-center gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center min-w-[100px]">
                  <span className="block font-bold text-gray-900 text-xl leading-none mb-1">{interviews.length}</span>
                  <span className="block text-gray-500 font-bold text-[10px] uppercase tracking-wider">Total</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center min-w-[140px]">
                  <span className="block font-bold text-blue-700 text-xl leading-none mb-1">{pendingCount}</span>
                  <span className="block text-blue-600 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Pending Action
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center min-w-[120px]">
                  <span className="block font-bold text-green-700 text-xl leading-none mb-1">{completedProcessCount}</span>
                  <span className="block text-green-600 font-bold text-[10px] uppercase tracking-wider">Completed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* UI Redesign: Combined Search & Filter Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          {/* Top Row: Search + Filter Button */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search candidates by name, email, or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all hover:bg-gray-50 focus:bg-white shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium whitespace-nowrap bg-white shadow-sm transition-colors">
              <FiRefreshCw className="text-gray-500 transform rotate-90" /> {/* Simulating Filter Icon */}
              Filters
            </button>
          </div>

          {/* Bottom Row: Filter Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {['Pending', 'Completed', 'Shortlisted', 'Rejected'].map((filter) => {
              const isActive = activeFilter === filter;
              // Calculate specific counts
              let count = 0;
              if (filter === 'Pending') count = pendingCount;
              if (filter === 'Completed') count = completedProcessCount;
              if (filter === 'Shortlisted') count = interviews.filter(i => i.result === 'SHORTLISTED').length;
              if (filter === 'Rejected') count = interviews.filter(i => i.result === 'REJECTED').length;

              // Dynamic Active Colors
              let activeClass = 'bg-blue-600 border-blue-600 text-white shadow-md'; // Default Blue
              if (filter === 'Completed') activeClass = 'bg-green-600 border-green-600 text-white shadow-md';
              if (filter === 'Shortlisted') activeClass = 'bg-purple-600 border-purple-600 text-white shadow-md';
              if (filter === 'Rejected') activeClass = 'bg-red-600 border-red-600 text-white shadow-md';

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`
                        group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border
                        ${isActive
                      ? activeClass
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }
                    `}
                >
                  {filter}
                  {count > 0 && (
                    <span className={`
                            inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] rounded-full font-bold
                            ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }
                        `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interviews List */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              No scheduled interviews found
            </p>
            <p className="text-gray-400 text-sm">
              Interviews assigned to you will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews
              .slice()
              .sort((a, b) => {
                const getPriority = (status) => {
                  if (status === 'SCHEDULED' || status === 'RESCHEDULED') return 0;
                  if (status === 'COMPLETED') return 2;
                  return 1;
                };
                return getPriority(a.status) - getPriority(b.status);
              })
              .map((interview) => {
                const statusDisplay = getStatusDisplay(interview.status);
                const borderColor = interview.status === 'COMPLETED'
                  ? 'border-l-green-500'
                  : interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED'
                    ? 'border-l-blue-500'
                    : 'border-l-amber-500';

                return (
                  <div
                    key={interview.id}
                    className={`bg-white rounded-r-xl rounded-l-md border border-gray-200 p-6 transition-all duration-200 border-l-[4px] ${borderColor} shadow-sm hover:shadow-md`}
                  >
                    {/* Header: Name + Status */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                          {interview.candidateName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Applied for:</span> {interview.jobTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : interview.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {statusDisplay.text}
                        </span>
                      </div>
                    </div>

                    {/* Contact Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FiMail className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                          <p className="text-sm font-medium text-gray-900">{interview.candidateEmail}</p>
                        </div>
                      </div>
                      {interview.interviewDate && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiCalendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(interview.interviewDate)}</p>
                          </div>
                        </div>
                      )}
                      {interview.interviewTime && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <FiClock className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Time</p>
                            <p className="text-sm font-medium text-gray-900">{formatTime(interview.interviewTime)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
                      {(interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED' || interview.status === 'COMPLETED') && (
                        <button
                          onClick={() => handleJoinMeeting(interview)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          title="Join WebRTC Meeting"
                        >
                          <FiVideo className="text-base" />
                          Join Meeting
                        </button>
                      )}
                      {(interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED') && (
                        <button
                          onClick={() => handleRescheduleClick(interview)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          title="Reschedule"
                        >
                          <FiEdit2 className="text-base" />
                          Reschedule
                        </button>
                      )}
                      <button
                        onClick={() => handleViewClick(interview)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                        title="View Details"
                      >
                        <FiEye className="text-base" />
                        View
                      </button>
                      {interview.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleResultClick(interview)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          title="Submit Result"
                        >
                          <FiAward className="text-base" />
                          Result
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Reschedule Interview Modal */}
        {showRescheduleModal && selectedInterview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Reschedule Interview</h2>
                  <button
                    onClick={() => {
                      setShowRescheduleModal(false);
                      setSelectedInterview(null);
                      setRescheduleDate('');
                      setRescheduleTime('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Candidate:</strong> {selectedInterview.candidateName}</p>
                  <p><strong>Job Title:</strong> {selectedInterview.jobTitle}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedInterview(null);
                    setRescheduleDate('');
                    setRescheduleTime('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateReschedule}
                  disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {rescheduling ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result Submission Modal */}
        {showResultModal && selectedInterview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Submit Interview Result</h3>
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Candidate:</strong> {selectedInterview.candidateName}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>Job Role:</strong> {selectedInterview.jobTitle}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="result"
                        value="SHORTLISTED"
                        checked={selectedResult === 'SHORTLISTED'}
                        onChange={(e) => setSelectedResult(e.target.value)}
                        className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="font-medium text-green-700">Shortlisted</span>
                        <p className="text-xs text-gray-500">Candidate passed the technical round</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="result"
                        value="REJECTED"
                        checked={selectedResult === 'REJECTED'}
                        onChange={(e) => setSelectedResult(e.target.value)}
                        className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <span className="font-medium text-red-700">Rejected</span>
                        <p className="text-xs text-gray-500">Candidate did not meet requirements</p>
                      </div>
                    </label>
                  </div>
                </div>

                {selectedResult === 'SHORTLISTED' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Recruiter for HR Round <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedRecruiter}
                      onChange={(e) => setSelectedRecruiter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a recruiter</option>
                      {recruiters.map((recruiter) => (
                        <option key={recruiter.id} value={recruiter.id}>
                          {recruiter.name} ({recruiter.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={resultRemarks}
                    onChange={(e) => setResultRemarks(e.target.value)}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional comments or feedback..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={initiateSubmitResult}
                    disabled={submitting || !selectedResult}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Result'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Candidate Details Modal - Reuse from InterviewerInterviewManagement */}
        {showViewModal && selectedInterview && (
          <div className="absolute inset-0 z-50 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Header: Exact Match to Mark Attendance Style */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setCandidateDetails(null);
                    setSelectedInterview(null);
                  }}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <FiX className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Candidate Details</h1>
              </div>

              {/* Content Section */}
              <div className="space-y-6">
                {loadingDetails ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading candidate details...</p>
                  </div>
                ) : candidateDetails ? (
                  <div className="space-y-6">
                    {/* Interview Information Section */}
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <FiCalendar className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Interview Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedInterview.interviewDate && (
                          <div className="flex items-start gap-3">
                            <FiCalendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Interview Date
                              </label>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(selectedInterview.interviewDate)}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedInterview.interviewTime && (
                          <div className="flex items-start gap-3">
                            <FiClock className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                INTERVIEW TIME
                              </label>
                              <p className="text-base font-semibold text-gray-900">
                                {formatTime(selectedInterview.interviewTime)}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedInterview.status && (
                          <div className="flex items-start gap-3">
                            <FiBriefcase className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                INTERVIEW STATUS
                              </label>
                              <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${selectedInterview.status === 'SCHEDULED' || selectedInterview.status === 'RESCHEDULED'
                                ? 'bg-green-100 text-green-800'
                                : selectedInterview.status === 'COMPLETED'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {getStatusDisplay(selectedInterview.status).text}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-left">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FiUser className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex items-start gap-3">
                          <FiUser className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              FULL NAME
                            </label>
                            <p className="text-base font-semibold text-gray-900">{candidateDetails.candidateName || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <FiMail className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              EMAIL
                            </label>
                            <a
                              href={`mailto:${candidateDetails.candidateEmail}`}
                              className="text-base font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {candidateDetails.candidateEmail || 'N/A'}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <FiPhone className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              PHONE
                            </label>
                            <a
                              href={`tel:${candidateDetails.candidatePhone}`}
                              className="text-base font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {candidateDetails.candidatePhone || 'N/A'}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Application Information */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-left">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <FiBriefcase className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Application Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            JOB TITLE
                          </label>
                          <p className="text-base font-semibold text-gray-900">{candidateDetails.jobTitle || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            COMPANY
                          </label>
                          <p className="text-base font-semibold text-gray-900">{candidateDetails.companyName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            APPLICATION STATUS
                          </label>
                          <div>
                            <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${candidateDetails.status === 'SHORTLISTED'
                              ? 'bg-green-100 text-green-800'
                              : candidateDetails.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {candidateDetails.status || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            APPLIED DATE
                          </label>
                          <p className="text-base font-semibold text-gray-900">
                            {candidateDetails.createdAt
                              ? new Date(candidateDetails.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Profile Information */}
                    {(candidateDetails.resumeUrl || candidateDetails.portfolioUrl || candidateDetails.experienceLetterUrl ||
                      candidateDetails.fresherYears !== null || candidateDetails.experiencedYears !== null) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-left">
                          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <FiAward className="w-5 h-5 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Experiences */}
                            {candidateDetails.experiencedYears !== null && (
                              <div className="flex items-start gap-3">
                                <FiAward className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    EXPERIENCE
                                  </label>
                                  <p className="text-base font-semibold text-gray-900">{candidateDetails.experiencedYears} {candidateDetails.experiencedYears === 1 ? 'year' : 'years'}</p>
                                </div>
                              </div>
                            )}
                            {candidateDetails.fresherYears !== null && !candidateDetails.experiencedYears && (
                              <div className="flex items-start gap-3">
                                <FiAward className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    FRESHER EXPERIENCE
                                  </label>
                                  <p className="text-base font-semibold text-gray-900">{candidateDetails.fresherYears} {candidateDetails.fresherYears === 1 ? 'year' : 'years'}</p>
                                </div>
                              </div>
                            )}
                            {/* Resume Link */}
                            {candidateDetails.resumeUrl && (
                              <div className="flex items-start gap-3">
                                <FiFileText className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    RESUME
                                  </label>
                                  <div>
                                    <a
                                      href={candidateDetails.resumeUrl.startsWith('http') ? candidateDetails.resumeUrl : `${window.location.origin}/api/files?path=${encodeURIComponent(candidateDetails.resumeUrl)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors bg-blue-50 px-3 py-2 rounded-lg"
                                    >
                                      <FiFileText className="w-4 h-4" />
                                      Open Candidate Resume
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Experience Letter Link */}
                            {candidateDetails.experienceLetterUrl && (
                              <div className="flex items-start gap-3">
                                <FiFileText className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    EXPERIENCE LETTER
                                  </label>
                                  <div>
                                    <a
                                      href={candidateDetails.experienceLetterUrl.startsWith('http') ? candidateDetails.experienceLetterUrl : `${window.location.origin}/api/files?path=${encodeURIComponent(candidateDetails.experienceLetterUrl)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900 transition-colors bg-purple-50 px-3 py-2 rounded-lg"
                                    >
                                      <FiFileText className="w-4 h-4" />
                                      View Experience Letter
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Portfolio Link */}
                            {candidateDetails.portfolioUrl && (
                              <div className="flex items-start gap-3">
                                <FiGlobe className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                <div>
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    PORTFOLIO
                                  </label>
                                  <a
                                    href={candidateDetails.portfolioUrl.startsWith('http') ? candidateDetails.portfolioUrl : `${window.location.origin}/api/files?path=${encodeURIComponent(candidateDetails.portfolioUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <FiGlobe className="w-4 h-4" />
                                    View Portfolio
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Cover Letter */}
                    {candidateDetails.coverLetter && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-left">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                          <div className="bg-indigo-100 p-2 rounded-lg">
                            <FiFileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Cover Letter</h3>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {candidateDetails.coverLetter}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiEye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No details available</p>
                  </div>
                )}
              </div>
            </div>
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

export default Interviews;
