import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { interviewService } from '../../api/interviewService';
import { useEnhancedProctoring } from '../../hooks/useEnhancedProctoring';
import WebRTCMeeting from '../../components/meeting/WebRTCMeeting';
import { FiVideo, FiCalendar, FiClock, FiUser, FiBriefcase, FiX, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { formatToIST } from '../../utils/timeFormatter';

const EmbeddedInterviewMeeting = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { user, isCandidate, isTechnicalInterviewer } = useAuth();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [showProctoringPanel, setShowProctoringPanel] = useState(false);
  const [loadingProctoring, setLoadingProctoring] = useState(false);
  const [proctoringRefreshInterval, setProctoringRefreshInterval] = useState(null);
  const [useWebRTC, setUseWebRTC] = useState(true); // Use custom WebRTC by default

  // Check if user is interviewer or admin (can see proctoring logs)
  const canViewProctoring = isTechnicalInterviewer() || user?.role === 'RECRUITMENT_ADMIN' || user?.role === 'RECRUITER';

  // Handle violations silently for candidates, log for interviewers
  const handleViolation = async (violation) => {
    // For candidates: log silently, no UI feedback
    // For interviewers: violations will be visible in their panel

    if (interview?.id) {
      try {
        await interviewService.logProctoringViolation(
          interview.id,
          violation.type,
          violation.description,
          violation.timestamp
        );

        // If interviewer/admin, update local state to show in panel
        if (canViewProctoring) {
          // Refresh violations list
          if (proctoringRefreshInterval) {
            fetchProctoringViolations();
          }
        }
      } catch (err) {
        console.error('Error logging violation to backend:', err);
      }
    }
  };

  // Enhanced proctoring (only active for candidates)
  const { violations } = useEnhancedProctoring(
    isCandidate() ? handleViolation : null,
    isCandidate() ? interviewId : null
  );

  useEffect(() => {
    fetchInterviewDetails();

    // Cleanup on unmount
    return () => {
      if (proctoringRefreshInterval) {
        clearInterval(proctoringRefreshInterval);
      }
    };
  }, [interviewId]);

  // Auto-load proctoring panel for interviewers
  useEffect(() => {
    if (canViewProctoring && interview?.id) {
      setShowProctoringPanel(true);
      // Fetch violations initially with a small delay to ensure interview is loaded
      setTimeout(() => {
        fetchProctoringViolations();
      }, 500);

      // Set up auto-refresh for interviewers (only if we can view proctoring)
      const interval = setInterval(() => {
        if (interview?.id && canViewProctoring) {
          fetchProctoringViolations();
        }
      }, 3000);
      setProctoringRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      // Clear interval if conditions are no longer met
      if (proctoringRefreshInterval) {
        clearInterval(proctoringRefreshInterval);
        setProctoringRefreshInterval(null);
      }
    }
  }, [canViewProctoring, interview?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInterviewDetails = async () => {
    try {
      setLoading(true);

      let foundInterview = null;

      // Different API calls based on role
      if (isCandidate()) {
        // Candidate: Get from upcoming interviews
        const interviews = await interviewService.getMyUpcomingInterviews();
        foundInterview = interviews.find(i => i.id === parseInt(interviewId));
      } else if (isTechnicalInterviewer()) {
        // Technical Interviewer: Get from assigned candidates
        const assignments = await interviewService.getMyAssignedCandidates();
        const assignment = assignments.find(a => a.interviewId === parseInt(interviewId));
        if (assignment) {
          // Map assignment to interview-like object
          foundInterview = {
            id: assignment.interviewId,
            jobTitle: assignment.jobTitle,
            interviewerName: assignment.interviewerName,
            interviewerEmail: assignment.interviewerEmail,
            candidateName: assignment.candidateName,
            candidateEmail: assignment.candidateEmail,
            interviewDate: assignment.interviewDate,
            interviewTime: assignment.interviewTime,
            interviewRound: assignment.interviewRound
          };
        }
      } else if (user?.role === 'RECRUITMENT_ADMIN' || user?.role === 'RECRUITER') {
        // Admin/Recruiter: Try to get from all interviews (may need backend endpoint)
        // For now, try through assignments - they might have access to all interviews
        // This is a fallback - ideally backend should have an endpoint for admin/recruiter
        // to get interview by ID
        try {
          // Try using the same approach as interviewer - admins/recruiters may have broader access
          // If needed, add a new backend endpoint: getInterviewById(interviewId)
          const assignments = await interviewService.getHRRoundCandidates();
          const assignment = assignments.find(a => a.interviewId === parseInt(interviewId));
          if (assignment) {
            foundInterview = {
              id: assignment.interviewId,
              jobTitle: assignment.jobTitle,
              interviewerName: assignment.interviewerName || 'N/A',
              interviewerEmail: assignment.interviewerEmail || 'N/A',
              candidateName: assignment.candidateName,
              candidateEmail: assignment.candidateEmail,
              interviewDate: assignment.interviewDate,
              interviewTime: assignment.interviewTime,
              interviewRound: assignment.interviewRound
            };
          }
        } catch (err) {
          console.error('Error fetching interview for admin/recruiter:', err);
        }
      }

      if (!foundInterview) {
        setError('Interview not found or you do not have access to this interview');
        return;
      }

      setInterview(foundInterview);
    } catch (err) {
      console.error('Error fetching interview:', err);
      setError(err.response?.data?.message || 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const fetchProctoringViolations = async () => {
    if (!interview?.id || !canViewProctoring) return;

    try {
      setLoadingProctoring(true);
      const violations = await interviewService.getProctoringViolations(interview.id);
      // Filter out MEETING_STARTED violations at the source
      const filteredViolations = (violations || []).filter(v => v.violationType !== 'MEETING_STARTED');
      setProctoringViolations(filteredViolations);
    } catch (err) {
      // Only log error if it's not a 401/403 (authorization) - these are expected for non-interviewers
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error('Error fetching proctoring violations:', err);
        // Don't show error to user if it's just a permission issue for non-interviewers
      }
      // Set empty array on error to avoid showing stale data
      setProctoringViolations([]);
    } finally {
      setLoadingProctoring(false);
    }
  };

  // Get user ID and name for WebRTC meeting
  const getWebRTCUserInfo = () => {
    return {
      userId: user?.userId?.toString() || 'user-' + Date.now(),
      userName: user?.fullName || 'User',
      userRole: user?.role || 'CANDIDATE'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Loading interview meeting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate(isCandidate() ? '/upcoming-interviews' : '/interview-management')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Interview not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Interview Meeting</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FiBriefcase className="w-4 h-4" />
                {interview.jobTitle}
              </span>
              {isCandidate() ? (
                <span className="flex items-center gap-1">
                  <FiUser className="w-4 h-4" />
                  {interview.interviewerName}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <FiUser className="w-4 h-4" />
                  {interview.candidateName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                {new Date(interview.interviewDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <FiClock className="w-4 h-4" />
                {interview.interviewTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canViewProctoring && (
              <button
                onClick={() => setShowProctoringPanel(!showProctoringPanel)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showProctoringPanel
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <FiAlertTriangle className="w-4 h-4" />
                {proctoringViolations.filter(v => v.violationType !== 'MEETING_STARTED').length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {proctoringViolations.filter(v => v.violationType !== 'MEETING_STARTED').length}
                  </span>
                )}
                Proctoring Logs
              </button>
            )}
            <button
              onClick={() => navigate(isCandidate() ? '/upcoming-interviews' : '/interview-management')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* WebRTC Meeting Component - Embedded */}
        <div className={`flex-1 ${canViewProctoring && showProctoringPanel ? 'md:w-2/3' : 'w-full'} transition-all duration-300`}>
          {useWebRTC && interview ? (
            <WebRTCMeeting
              interviewId={interviewId}
              userId={getWebRTCUserInfo().userId}
              userName={getWebRTCUserInfo().userName}
              userRole={getWebRTCUserInfo().userRole}
              onClose={() => navigate(isCandidate() ? '/upcoming-interviews' : '/interview-management')}
              onProctoringViolation={handleViolation}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">Initializing meeting...</p>
            </div>
          )}
        </div>

        {/* Proctoring Panel - Only for Interviewers/Admins */}
        {canViewProctoring && showProctoringPanel && (
          <div className="w-full md:w-1/3 bg-white border-l border-gray-200 flex flex-col overflow-hidden h-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5" />
                <h2 className="font-semibold">Proctoring Logs</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchProctoringViolations}
                  disabled={loadingProctoring}
                  className="text-white hover:bg-purple-600 rounded p-1 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw className={`w-4 h-4 ${loadingProctoring ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowProctoringPanel(false)}
                  className="text-white hover:bg-purple-600 rounded p-1"
                  title="Hide Panel"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {loadingProctoring && proctoringViolations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading proctoring logs...</p>
                </div>
              ) : proctoringViolations.length === 0 ? (
                <div className="text-center py-12">
                  <FiAlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No Violations Detected</h3>
                  <p className="text-xs text-gray-500">The candidate's session appears clean.</p>
                  <p className="text-xs text-gray-400 mt-2">Auto-refreshing every 3 seconds...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FiAlertTriangle className="w-4 h-4 text-yellow-600" />
                      <p className="text-yellow-800 font-semibold text-sm">
                        Total Violations: {proctoringViolations.filter(v => v.violationType !== 'MEETING_STARTED').length}
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700">
                      Real-time monitoring active. Violations are logged automatically.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {proctoringViolations
                      .filter(v => v.violationType !== 'MEETING_STARTED')
                      .map((violation) => {
                        const isTabSwitch = violation.violationType === 'TAB_SWITCH' || violation.violationType === 'WINDOW_BLUR';
                        const isKeyboard = violation.violationType === 'KEYBOARD_SHORTCUT';
                        const isDevTools = violation.violationType === 'DEV_TOOLS_ATTEMPT';
                        const isFullscreen = violation.violationType === 'FULLSCREEN_EXIT';
                        const isHeartbeat = violation.violationType === 'HEARTBEAT_MISSING';

                        return (
                          <div
                            key={violation.id}
                            className={`bg-white rounded-lg border-l-4 p-3 shadow-sm ${isTabSwitch
                              ? 'border-red-500 bg-red-50'
                              : isKeyboard
                                ? 'border-orange-500 bg-orange-50'
                                : isDevTools
                                  ? 'border-purple-500 bg-purple-50'
                                  : isFullscreen
                                    ? 'border-blue-500 bg-blue-50'
                                    : isHeartbeat
                                      ? 'border-yellow-500 bg-yellow-50'
                                      : 'border-gray-300 bg-gray-50'
                              }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <FiAlertTriangle
                                  className={`w-3.5 h-3.5 mt-0.5 ${isTabSwitch ? 'text-red-600' :
                                    isKeyboard ? 'text-orange-600' :
                                      isDevTools ? 'text-purple-600' :
                                        isFullscreen ? 'text-blue-600' :
                                          isHeartbeat ? 'text-yellow-600' :
                                            'text-gray-600'
                                    }`}
                                />
                                <span className={`text-xs font-semibold ${isTabSwitch ? 'text-red-800' :
                                  isKeyboard ? 'text-orange-800' :
                                    isDevTools ? 'text-purple-800' :
                                      isFullscreen ? 'text-blue-800' :
                                        isHeartbeat ? 'text-yellow-800' :
                                          'text-gray-800'
                                  }`}>
                                  {violation.violationType.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatToIST(violation.timestamp)}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${isTabSwitch ? 'text-red-700' :
                              isKeyboard ? 'text-orange-700' :
                                isDevTools ? 'text-purple-700' :
                                  isFullscreen ? 'text-blue-700' :
                                    isHeartbeat ? 'text-yellow-700' :
                                      'text-gray-700'
                              }`}>
                              {violation.description}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-500 text-center">
                Live monitoring • Auto-refresh: 3s • {proctoringViolations.filter(v => v.violationType !== 'MEETING_STARTED').length} violations
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbeddedInterviewMeeting;
