import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../../api/interviewService';
import { FiCalendar, FiClock, FiUserPlus, FiSearch, FiX, FiBriefcase, FiEdit2, FiEye, FiUser, FiMail, FiPhone, FiFileText, FiGlobe, FiAward, FiVideo, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import Modal from '../../components/UI/Modal';
import { formatToIST } from '../../utils/timeFormatter';

const InterviewerInterviewManagement = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showProctoringModal, setShowProctoringModal] = useState(false);
  const [selectedInterviewForProctoring, setSelectedInterviewForProctoring] = useState(null);
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [loadingProctoring, setLoadingProctoring] = useState(false);
  const [proctoringRefreshInterval, setProctoringRefreshInterval] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [scheduleModalTab, setScheduleModalTab] = useState('notScheduled');

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'primary',
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
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewService.getMyAssignedCandidates();
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.response?.data?.message || 'Failed to load assigned candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleClick = () => {
    setShowScheduleModal(true);
    setSelectedAssignments([]);
    setInterviewDate('');
    setInterviewTime('');
    setNotes('');
    setModalSearchTerm('');
    setScheduleModalTab('notScheduled');
  };

  const handleAssignmentToggle = (assignment) => {
    setSelectedAssignments((prev) => {
      const exists = prev.find((a) => a.id === assignment.id);
      if (exists) {
        return prev.filter((a) => a.id !== assignment.id);
      } else {
        return [...prev, assignment];
      }
    });
  };

  const initiateSchedule = () => {
    if (!interviewDate || !interviewTime || selectedAssignments.length === 0) {
      showToast('Please fill in all required fields and select at least one candidate', 'error');
      return;
    }

    const selectedDate = new Date(interviewDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showToast('Interview date cannot be in the past', 'error');
      return;
    }

    setShowScheduleModal(false);

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Schedule',
      message: `Are you sure you want to schedule interviews for ${selectedAssignments.length} candidate(s)?\nDate: ${interviewDate}\nTime: ${interviewTime}`,
      confirmText: 'Schedule',
      type: 'primary',
      isLoading: false,
      onConfirm: executeSchedule
    });
  };

  const executeSchedule = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      const assignmentIds = selectedAssignments.map((a) => a.id);
      await interviewService.scheduleInterview(assignmentIds, interviewDate, interviewTime, notes);

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Scheduling Successful',
        message: 'Interviews have been scheduled successfully!',
        onOk: () => {
          closeSuccess();
          setSelectedAssignments([]);
          setInterviewDate('');
          setInterviewTime('');
          setNotes('');
          fetchAssignments();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error scheduling interview:', err);
      showToast(err.response?.data?.message || 'Failed to schedule interview', 'error');
      setShowScheduleModal(true);
    }
  };

  const handleRescheduleClick = (assignment) => {
    if (!assignment.interviewId) {
      showToast('No interview scheduled for this candidate. Please schedule an interview first.', 'warning');
      return;
    }
    setSelectedAssignment(assignment);
    // Format date for input field (YYYY-MM-DD)
    const formattedDate = assignment.interviewDate
      ? (typeof assignment.interviewDate === 'string'
        ? assignment.interviewDate.split('T')[0]
        : new Date(assignment.interviewDate).toISOString().split('T')[0])
      : '';
    // Format time for input field (HH:mm)
    const formattedTime = assignment.interviewTime
      ? (typeof assignment.interviewTime === 'string'
        ? assignment.interviewTime.substring(0, 5)
        : assignment.interviewTime)
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

    const selectedDate = new Date(rescheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showToast('Interview date cannot be in the past', 'error');
      return;
    }

    setShowRescheduleModal(false);

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Reschedule',
      message: 'Are you sure you want to reschedule this interview?',
      confirmText: 'Reschedule',
      type: 'primary',
      isLoading: false,
      onConfirm: executeReschedule
    });
  };

  const executeReschedule = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      await interviewService.rescheduleInterview(
        selectedAssignment.interviewId,
        rescheduleDate,
        rescheduleTime
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Reschedule Successful',
        message: 'Interview has been rescheduled successfully!',
        onOk: () => {
          closeSuccess();
          setSelectedAssignment(null);
          setRescheduleDate('');
          setRescheduleTime('');
          fetchAssignments();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error rescheduling interview:', err);
      showToast(err.response?.data?.message || 'Failed to reschedule interview', 'error');
      setShowRescheduleModal(true);
    }
  };

  const handleViewClick = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
    window.scrollTo(0, 0);
    setLoadingDetails(true);
    try {
      const details = await interviewService.getCandidateDetails(assignment.jobApplicationId);
      setCandidateDetails(details);
    } catch (err) {
      console.error('Error fetching candidate details:', err);
      showToast(err.response?.data?.message || 'Failed to load candidate details', 'error');
      setShowViewModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleJoinMeeting = (assignment) => {
    if (!assignment.interviewId) {
      showToast('No interview scheduled for this candidate. Please schedule an interview first.', 'warning');
      return;
    }

    // Navigate to the built-in WebRTC video conferencing meeting page
    navigate(`/interview/${assignment.interviewId}/meeting`);
  };

  const handleViewProctoringLogs = async (assignment) => {
    if (!assignment.interviewId) {
      showToast('No interview scheduled for this candidate.', 'warning');
      return;
    }

    setSelectedInterviewForProctoring(assignment);
    setShowProctoringModal(true);
    await fetchProctoringViolations(assignment.interviewId);

    // Set up auto-refresh every 3 seconds to get real-time updates
    const interval = setInterval(() => {
      fetchProctoringViolations(assignment.interviewId);
    }, 3000);
    setProctoringRefreshInterval(interval);
  };

  const fetchProctoringViolations = async (interviewId) => {
    try {
      setLoadingProctoring(true);
      const violations = await interviewService.getProctoringViolations(interviewId);
      setProctoringViolations(violations || []);
    } catch (err) {
      console.error('Error fetching proctoring violations:', err);
      // Don't show error - just log it
    } finally {
      setLoadingProctoring(false);
    }
  };

  const handleCloseProctoringModal = () => {
    setShowProctoringModal(false);
    setSelectedInterviewForProctoring(null);
    setProctoringViolations([]);
    if (proctoringRefreshInterval) {
      clearInterval(proctoringRefreshInterval);
      setProctoringRefreshInterval(null);
    }
  };

  const getDocumentUrl = (url) => {
    if (!url) {
      return null;
    }

    // Check if the URL is a file path (starts with "uploads/" or doesn't start with "http")
    // If it's a file path, convert it to the API endpoint URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // It's a file path - serve it through the /api/files endpoint
      // Encode the path to handle special characters
      const encodedPath = encodeURIComponent(url);
      const apiBaseUrl = window.location.origin;
      return `${apiBaseUrl}/api/files?path=${encodedPath}`;
    }

    return url;
  };

  const getStatusDisplay = (assignment) => {
    if (assignment.interviewStatus) {
      return {
        text: assignment.interviewStatus === 'SCHEDULED' ? 'Scheduled' :
          assignment.interviewStatus === 'RESCHEDULED' ? 'Rescheduled' :
            assignment.interviewStatus === 'COMPLETED' ? 'Completed' :
              assignment.interviewStatus === 'CANCELLED' ? 'Cancelled' : 'Scheduled',
        className: assignment.interviewStatus === 'SCHEDULED' || assignment.interviewStatus === 'RESCHEDULED'
          ? 'bg-green-100 text-green-800'
          : assignment.interviewStatus === 'COMPLETED'
            ? 'bg-gray-100 text-gray-800'
            : 'bg-red-100 text-red-800'
      };
    }
    return {
      text: 'Assigned',
      className: 'bg-blue-100 text-blue-800'
    };
  };

  const formatScheduledDateTime = (assignment) => {
    if (!assignment.interviewDate && !assignment.interviewTime) {
      return 'N/A';
    }

    let dateStr = 'N/A';
    if (assignment.interviewDate) {
      try {
        const date = typeof assignment.interviewDate === 'string'
          ? new Date(assignment.interviewDate)
          : assignment.interviewDate;
        dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        dateStr = assignment.interviewDate;
      }
    }

    let timeStr = 'N/A';
    if (assignment.interviewTime) {
      try {
        if (typeof assignment.interviewTime === 'string') {
          const timeParts = assignment.interviewTime.substring(0, 5).split(':');
          if (timeParts.length === 2) {
            const hours = parseInt(timeParts[0]);
            const minutes = timeParts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            timeStr = `${displayHours}:${minutes} ${ampm}`;
          } else {
            timeStr = assignment.interviewTime.substring(0, 5);
          }
        } else {
          timeStr = assignment.interviewTime;
        }
      } catch (e) {
        timeStr = assignment.interviewTime;
      }
    }

    if (dateStr === 'N/A' && timeStr === 'N/A') {
      return 'N/A';
    }
    if (dateStr === 'N/A') {
      return timeStr;
    }
    if (timeStr === 'N/A') {
      return dateStr;
    }
    return `${dateStr} at ${timeStr}`;
  };

  // Filter by status first
  const getFilteredByStatus = () => {
    switch (statusFilter) {
      case 'Scheduled':
        return assignments.filter(a =>
          a.interviewStatus === 'SCHEDULED' || a.interviewStatus === 'RESCHEDULED'
        );
      case 'Unscheduled':
        return assignments.filter(a =>
          !a.interviewId || (!a.interviewStatus && !a.interviewDate)
        );
      case 'Completed':
        return assignments.filter(a =>
          a.interviewStatus === 'COMPLETED'
        );
      case 'Assigned':
        // Show only newly assigned candidates without any interview status
        // These are fresh assignments that haven't been scheduled, unscheduled, or completed
        return assignments.filter(a =>
          !a.interviewId && !a.interviewStatus && !a.interviewDate
        );
      default:
        return assignments; // All
    }
  };

  const filteredAssignments = getFilteredByStatus().filter((assignment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      assignment.candidateName?.toLowerCase().includes(searchLower) ||
      assignment.candidateEmail?.toLowerCase().includes(searchLower) ||
      assignment.jobTitle?.toLowerCase().includes(searchLower)
    );
  });

  // For Schedule Interview modal, separate scheduled and not scheduled candidates
  const unscheduledAssignments = assignments.filter(a =>
    !a.interviewId || (!a.interviewStatus && !a.interviewDate) ||
    (a.interviewStatus !== 'SCHEDULED' && a.interviewStatus !== 'RESCHEDULED' && a.interviewStatus !== 'COMPLETED')
  );

  const scheduledAssignments = assignments.filter(a =>
    a.interviewStatus === 'SCHEDULED' || a.interviewStatus === 'RESCHEDULED' || a.interviewStatus === 'COMPLETED'
  );

  const filteredModalAssignments = (scheduleModalTab === 'notScheduled' ? unscheduledAssignments : scheduledAssignments).filter((assignment) => {
    const searchLower = modalSearchTerm.toLowerCase();
    return (
      assignment.candidateName?.toLowerCase().includes(searchLower) ||
      assignment.candidateEmail?.toLowerCase().includes(searchLower) ||
      assignment.jobTitle?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interview Management</h1>
        <button
          onClick={handleScheduleClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiCalendar className="w-5 h-5" />
          Schedule Interview
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-4">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search candidates by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Assigned', 'Scheduled', 'Unscheduled', 'Completed'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No assigned candidates found
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const statusDisplay = getStatusDisplay(assignment);
                  const scheduledDateTime = formatScheduledDateTime(assignment);
                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.candidateName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{assignment.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{assignment.candidateEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.className}`}>
                          {statusDisplay.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assignment.interviewDate || assignment.interviewTime ? (
                            <div className="flex items-center gap-2">
                              <FiCalendar className="w-4 h-4 text-gray-400" />
                              <span>{scheduledDateTime}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not scheduled</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {assignment.interviewId ? (
                            <>
                              <button
                                onClick={() => handleJoinMeeting(assignment)}
                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 flex items-center gap-1 px-2 py-1 rounded transition-colors"
                                title="Join WebRTC Meeting"
                              >
                                <FiVideo className="w-4 h-4" />
                                Join Meeting
                              </button>
                              <button
                                onClick={() => handleViewProctoringLogs(assignment)}
                                className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                                title="View Proctoring Logs"
                              >
                                <FiAlertTriangle className="w-4 h-4" />
                                Proctoring
                              </button>
                              <button
                                onClick={() => handleRescheduleClick(assignment)}
                                className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                                title="Reschedule"
                              >
                                <FiEdit2 className="w-4 h-4" />
                                Reschedule
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleViewClick(assignment)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">Schedule Interview</span>
          </div>
        }
        size="xl"
        variant="panel"
      >
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-6">
            {/* Candidate Selection Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <FiUserPlus className="w-4 h-4 text-blue-600" />
                Select Candidate <span className="text-red-500">*</span>
              </label>

              {/* Tabs for Not Scheduled / Scheduled */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleModalTab('notScheduled');
                    setSelectedAssignments([]);
                  }}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${scheduleModalTab === 'notScheduled'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } rounded-t-lg`}
                >
                  Not Scheduled
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {unscheduledAssignments.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleModalTab('scheduled');
                    setSelectedAssignments([]);
                  }}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${scheduleModalTab === 'scheduled'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } rounded-t-lg`}
                >
                  Scheduled
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {scheduledAssignments.length}
                  </span>
                </button>
              </div>

              <div className="mb-3">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search candidates by name, email, or job title..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                  />
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow-inner">
                {filteredModalAssignments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FiUserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium">No {scheduleModalTab === 'notScheduled' ? 'unscheduled' : 'scheduled'} candidates found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or check the {scheduleModalTab === 'notScheduled' ? 'Scheduled' : 'Not Scheduled'} tab</p>
                  </div>
                ) : (
                  filteredModalAssignments.map((assignment) => {
                    const isSelected = selectedAssignments.some((a) => a.id === assignment.id);
                    return (
                      <label
                        key={assignment.id}
                        className={`flex items-center p-4 cursor-pointer border-b last:border-b-0 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleAssignmentToggle(assignment)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">
                            {assignment.candidateName}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {assignment.jobTitle} • {assignment.candidateEmail}
                          </div>
                          {scheduleModalTab === 'scheduled' && assignment.interviewDate && assignment.interviewTime && (
                            <div className="text-xs text-blue-600 mt-1.5 font-medium">
                              📅 Scheduled: {assignment.interviewDate} at {assignment.interviewTime}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="mt-3 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700">
                  {selectedAssignments.length} candidate(s) selected
                </p>
              </div>
            </div>

            {/* Interview Date and Time Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                    <FiCalendar className="w-4 h-4 text-blue-600" />
                    Interview Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                    <FiClock className="w-4 h-4 text-blue-600" />
                    Interview Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <FiFileText className="w-4 h-4 text-blue-600" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all resize-none"
                placeholder="Optional notes about the interview..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={initiateSchedule}
                disabled={!interviewDate || !interviewTime || selectedAssignments.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reschedule Interview Modal */}
      {showRescheduleModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Reschedule Interview</h2>
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedAssignment(null);
                    setRescheduleDate('');
                    setRescheduleTime('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Candidate:</strong> {selectedAssignment.candidateName}</p>
                <p><strong>Job Title:</strong> {selectedAssignment.jobTitle}</p>
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
                  setSelectedAssignment(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={initiateReschedule}
                disabled={!rescheduleDate || !rescheduleTime}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Candidate Details UI - Full Page Style like Mark Attendance */}
      {showViewModal && (
        <div className="absolute inset-0 z-50 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header: Exact Match to Mark Attendance Style */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setCandidateDetails(null);
                  setSelectedAssignment(null);
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
                  {/* Interview Information Section - Show first if interview is scheduled */}
                  {selectedAssignment?.interviewId && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 border-l-4 border-l-green-500 text-left">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <FiCalendar className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Interview Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {selectedAssignment.interviewDate && (
                          <div className="flex items-start gap-3">
                            <FiCalendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                INTERVIEW DATE
                              </label>
                              <p className="text-base font-semibold text-gray-900">
                                {new Date(selectedAssignment.interviewDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedAssignment.interviewTime && (
                          <div className="flex items-start gap-3">
                            <FiClock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                INTERVIEW TIME
                              </label>
                              <p className="text-base font-semibold text-gray-900">
                                {typeof selectedAssignment.interviewTime === 'string'
                                  ? selectedAssignment.interviewTime.substring(0, 5)
                                  : selectedAssignment.interviewTime}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedAssignment.interviewStatus && (
                          <div className="flex items-start gap-3">
                            <FiBriefcase className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                INTERVIEW STATUS
                              </label>
                              <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${selectedAssignment.interviewStatus === 'SCHEDULED' || selectedAssignment.interviewStatus === 'RESCHEDULED'
                                ? 'bg-green-100 text-green-800'
                                : selectedAssignment.interviewStatus === 'COMPLETED'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {selectedAssignment.interviewStatus === 'SCHEDULED' ? 'Scheduled' :
                                  selectedAssignment.interviewStatus === 'RESCHEDULED' ? 'Rescheduled' :
                                    selectedAssignment.interviewStatus === 'COMPLETED' ? 'Completed' :
                                      selectedAssignment.interviewStatus === 'CANCELLED' ? 'Cancelled' :
                                        selectedAssignment.interviewStatus}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                          <p className="text-base font-semibold text-blue-600">
                            <a href={`mailto:${candidateDetails.candidateEmail}`} className="hover:underline">{candidateDetails.candidateEmail || 'N/A'}</a>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiPhone className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            PHONE
                          </label>
                          <p className="text-base font-semibold text-gray-900">
                            <a href={`tel:${candidateDetails.candidatePhone}`} className="hover:underline">{candidateDetails.candidatePhone || 'N/A'}</a>
                          </p>
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
                      {!selectedAssignment?.interviewId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            ASSIGNMENT STATUS
                          </label>
                          <div>
                            <span className="inline-flex px-3 py-1 rounded text-sm font-semibold bg-blue-100 text-blue-800">
                              Assigned (Pending Schedule)
                            </span>
                          </div>
                        </div>
                      )}
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
                                    href={getDocumentUrl(candidateDetails.resumeUrl)}
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
                                    href={getDocumentUrl(candidateDetails.experienceLetterUrl)}
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
                                  href={getDocumentUrl(candidateDetails.portfolioUrl)}
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
                  <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Logs Modal */}
      {showProctoringModal && selectedInterviewForProctoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Proctoring Logs - Live Monitor</h2>
                  <p className="text-purple-100 text-sm mt-1">
                    {selectedInterviewForProctoring.candidateName} - {selectedInterviewForProctoring.jobTitle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchProctoringViolations(selectedInterviewForProctoring.interviewId)}
                    disabled={loadingProctoring}
                    className="text-white hover:bg-purple-600 rounded-full p-2 transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw className={`w-5 h-5 ${loadingProctoring ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleCloseProctoringModal}
                    className="text-white hover:bg-purple-600 rounded-full p-2 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingProctoring && proctoringViolations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-600">Loading proctoring logs...</p>
                </div>
              ) : proctoringViolations.length === 0 ? (
                <div className="text-center py-12">
                  <FiAlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Violations Detected</h3>
                  <p className="text-gray-500">The candidate's session appears to be clean so far.</p>
                  <p className="text-xs text-gray-400 mt-2">This panel refreshes every 3 seconds.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <FiAlertTriangle className="w-5 h-5 text-yellow-600" />
                      <p className="text-yellow-800 font-semibold">
                        Total Violations Detected: {proctoringViolations.length}
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      This panel auto-refreshes every 3 seconds. Monitor the candidate's activity in real-time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {proctoringViolations.map((violation, index) => {
                      const isTabSwitch = violation.violationType === 'TAB_SWITCH' || violation.violationType === 'WINDOW_BLUR';
                      const isKeyboard = violation.violationType === 'KEYBOARD_SHORTCUT';
                      const isDevTools = violation.violationType === 'DEV_TOOLS_ATTEMPT';

                      return (
                        <div
                          key={violation.id || index}
                          className={`bg-white rounded-lg shadow-sm border-l-4 p-4 ${isTabSwitch
                            ? 'border-red-500 bg-red-50'
                            : isKeyboard
                              ? 'border-orange-500 bg-orange-50'
                              : isDevTools
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-300'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FiAlertTriangle
                                  className={`w-4 h-4 ${isTabSwitch ? 'text-red-600' : isKeyboard ? 'text-orange-600' : 'text-purple-600'
                                    }`}
                                />
                                <span className={`text-sm font-semibold ${isTabSwitch ? 'text-red-800' : isKeyboard ? 'text-orange-800' : 'text-purple-800'
                                  }`}>
                                  {violation.violationType}
                                </span>
                              </div>
                              <p className={`text-sm ${isTabSwitch ? 'text-red-700' : isKeyboard ? 'text-orange-700' : 'text-purple-700'
                                }`}>
                                {violation.description}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 ml-4">
                              {formatToIST(violation.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Live monitoring active • Auto-refresh: 3s • {proctoringViolations.length} total violations
              </p>
              <button
                onClick={handleCloseProctoringModal}
                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

export default InterviewerInterviewManagement;

