import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../../api/interviewService';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import { FiCalendar, FiClock, FiCheckCircle, FiAlertCircle, FiX, FiRefreshCw, FiSmile, FiCoffee, FiVideo, FiBriefcase } from 'react-icons/fi';

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState([]);
  const [assignedCandidates, setAssignedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedResult, setSelectedResult] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [recruiters, setRecruiters] = useState([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timePeriod, setTimePeriod] = useState('Today'); // Today, Weekly, Monthly

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
    fetchAssignedCandidates();
    fetchRecruiters();

    // Auto-refresh every 30 seconds for real-time data
    const interval = setInterval(() => {
      fetchInterviews();
      fetchAssignedCandidates();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewService.getMyScheduledInterviews();
      setInterviews(data || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedCandidates = async () => {
    try {
      const data = await interviewService.getMyAssignedCandidates();
      setAssignedCandidates(data || []);
    } catch (err) {
      console.error('Error fetching assigned candidates:', err);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const data = await interviewService.getRecruiters();
      setRecruiters(data || []);
    } catch (err) {
      console.error('Error fetching recruiters:', err);
    }
  };

  // Helper functions for date ranges
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (timePeriod === 'Today') {
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return { start: today, end: endOfDay };
    } else if (timePeriod === 'Weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    } else { // Monthly
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
    }
  };

  // Calculate summary statistics based on time period
  const getScheduledInterviews = () => {
    const { start, end } = getDateRange();
    return interviews.filter(interview => {
      const interviewDate = interview.interviewDate
        ? new Date(interview.interviewDate)
        : null;
      if (!interviewDate) return false;
      return interviewDate >= start && interviewDate <= end &&
        (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED');
    });
  };

  const getTotalAssignedInterviews = () => {
    // Return ALL candidates assigned to this technical interviewer by the recruiter
    // This should show the complete count regardless of scheduling status
    return assignedCandidates;
  };

  const getCompletedInterviews = () => {
    const { start, end } = getDateRange();
    return interviews.filter(interview => {
      if (interview.status !== 'COMPLETED') return false;
      const updatedAt = interview.updatedAt ? new Date(interview.updatedAt) : null;
      if (!updatedAt) return false;
      return updatedAt >= start && updatedAt <= end;
    });
  };

  // Get today's interviews (for Today's Interviews section)
  const getTodayInterviews = () => {
    const today = new Date().toISOString().split('T')[0];
    return interviews.filter(interview => {
      const interviewDate = interview.interviewDate
        ? (typeof interview.interviewDate === 'string'
          ? interview.interviewDate.split('T')[0]
          : new Date(interview.interviewDate).toISOString().split('T')[0])
        : null;
      return interviewDate === today &&
        (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED');
    });
  };

  // Get upcoming interviews (next 7 days)
  const getUpcomingInterviews = () => {
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 1 minute (60000 ms)
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    return interviews.filter(interview => {
      if (!interview.interviewDate) return false;

      // Combine date and time to create complete datetime
      const interviewDateTime = new Date(interview.interviewDate);
      if (interview.interviewTime) {
        const [hours, minutes] = interview.interviewTime.split(':');
        interviewDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }

      return interviewDateTime >= oneMinuteFromNow && interviewDateTime <= sevenDaysLater &&
        (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED');
    }).sort((a, b) => {
      // Sort by complete datetime
      const dateTimeA = new Date(a.interviewDate);
      if (a.interviewTime) {
        const [hours, minutes] = a.interviewTime.split(':');
        dateTimeA.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
      const dateTimeB = new Date(b.interviewDate);
      if (b.interviewTime) {
        const [hours, minutes] = b.interviewTime.split(':');
        dateTimeB.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
      return dateTimeA - dateTimeB;
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    if (typeof timeString === 'string') {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateWithDay = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleJoinMeeting = (interview) => {
    navigate(`/interview/${interview.id}/meeting`);
  };

  // Get pending feedback
  const getPendingFeedback = () => {
    return interviews.filter(interview => {
      if (interview.status !== 'COMPLETED') return false;
      if (!interview.result) return true;
      if (!interview.remarks || interview.remarks.trim() === '') return true;
      return false;
    });
  };

  const handleSubmitFeedback = (interview) => {
    setSelectedInterview(interview);
    // Pre-populate with existing values if available
    setSelectedResult(interview.result || '');
    setResultRemarks(interview.remarks || '');
    setSelectedRecruiter('');
    setShowFeedbackModal(true);
  };

  const initiateFeedbackSubmit = () => {
    if (!selectedResult) {
      showToast('Please select a result', 'error');
      return;
    }

    if (!resultRemarks || resultRemarks.trim() === '') {
      showToast('Please add remarks/feedback before submitting', 'error');
      return;
    }

    if (selectedResult === 'SHORTLISTED' && !selectedRecruiter) {
      showToast('Please select a recruiter for HR round', 'error');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Submit Feedback',
      message: 'Are you sure you want to submit this feedback? This action cannot be undone.',
      confirmText: 'Submit Feedback',
      type: 'primary',
      isLoading: false,
      onConfirm: executeFeedbackSubmit
    });
  };

  const executeFeedbackSubmit = async () => {
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
        title: 'Feedback Submitted',
        message: 'Your feedback has been recorded successfully.',
        onOk: () => {
          closeSuccess();
          setShowFeedbackModal(false);
          setSelectedInterview(null);
          fetchInterviews(); // Refresh data only after explicit OK
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error submitting feedback:', err);
      showToast(err.response?.data?.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scheduledInterviews = getScheduledInterviews();
  const totalAssignedInterviews = getTotalAssignedInterviews();
  const completedInterviews = getCompletedInterviews();
  const todayInterviews = getTodayInterviews();
  const pendingFeedback = getPendingFeedback();
  const upcomingInterviews = getUpcomingInterviews();

  if (loading && interviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Time Period Filter */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">View:</span>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          {['Today', 'Weekly', 'Monthly'].map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${timePeriod === period
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Scheduled Interviews */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-600 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                {timePeriod === 'Today' ? "Today's" : timePeriod === 'Weekly' ? "This Week's" : "This Month's"} Interviews
              </p>
              <p className="text-4xl font-bold text-gray-900">{scheduledInterviews.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg transition-colors duration-300 hover:bg-blue-200">
              <FiCalendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Assigned Interviews */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-600 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Assigned Interviews</p>
              <p className="text-4xl font-bold text-gray-900">{totalAssignedInterviews.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg transition-colors duration-300 hover:bg-purple-200">
              <FiBriefcase className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Completed Interviews */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-green-600 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Completed Interviews</p>
              <p className="text-4xl font-bold text-gray-900">{completedInterviews.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg transition-colors duration-300 hover:bg-green-200">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Interviews Section */}
      <div className="bg-white rounded-lg shadow-md mb-10">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10 rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-900">Today's Interviews</h2>
        </div>
        <div className="p-6 max-h-[500px] overflow-y-auto thin-scrollbar">
          {todayInterviews.length === 0 ? (
            <div className="text-center py-12">
              <FiCoffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">You're all caught up for today!</p>
              <p className="text-sm text-gray-500">No interviews scheduled. Enjoy your free time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {interview.candidateName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {interview.jobTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <FiClock className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{formatTime(interview.interviewTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Pending Feedback & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Feedback Section */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center gap-3 z-10 rounded-t-lg">
            <FiAlertCircle className="w-7 h-7 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">Pending Feedback</h2>
          </div>
          <div className="p-6 max-h-[500px] overflow-y-auto thin-scrollbar">
            {pendingFeedback.length === 0 ? (
              <div className="text-center py-12">
                <FiSmile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600 mb-2">All feedback submitted!</p>
                <p className="text-sm text-gray-500">Great job staying on top of your interviews.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFeedback.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-5 border-2 border-orange-200 rounded-lg hover:border-orange-400 hover:shadow-md hover:bg-orange-50 transition-all duration-200 relative"
                  >
                    {/* Subtle pulse indicator */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>

                    <div className="ml-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {interview.candidateName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {interview.jobTitle}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        Interview Date: {formatDate(interview.interviewDate)}
                      </p>
                      <button
                        onClick={() => handleSubmitFeedback(interview)}
                        className="mt-3 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Interviews Section */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center gap-3 z-10 rounded-t-lg">
            <FiVideo className="w-7 h-7 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Interviews</h2>
          </div>
          <div className="p-6 max-h-[500px] overflow-y-auto thin-scrollbar">
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-12">
                <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600 mb-2">No upcoming interviews</p>
                <p className="text-sm text-gray-500">You have no interviews scheduled in the next 7 days.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-5 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded mb-2">
                          Technical
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {interview.jobTitle}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Candidate: {interview.candidateName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-4 h-4" />
                        <span>{formatDateWithDay(interview.interviewDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        <span>{formatTime(interview.interviewTime)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinMeeting(interview)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                      <FiVideo className="w-4 h-4" />
                      Join Meeting
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Submission Modal */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Submit Interview Feedback</h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {selectedInterview.result && (!selectedInterview.remarks || selectedInterview.remarks.trim() === '') && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Result already submitted. Please add remarks to complete the feedback.
                  </p>
                </div>
              )}

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
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resultRemarks}
                  onChange={(e) => setResultRemarks(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add your feedback and comments about the interview..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={initiateFeedbackSubmit}
                  disabled={submitting || !selectedResult || !resultRemarks || resultRemarks.trim() === ''}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


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

export default InterviewerDashboard;
