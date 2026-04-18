import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../../api/interviewService';
import { useProctoring } from '../../hooks/useProctoring';
import { FiVideo, FiCalendar, FiClock, FiUser, FiBriefcase, FiArrowLeft } from 'react-icons/fi';

const ProctoredInterview = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [violations, setViolations] = useState([]);
  const [meetWindow, setMeetWindow] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Handle violations silently (no UI feedback to candidate)
  const handleViolation = async (violation) => {
    // Store violation silently (no UI update)
    setViolations(prev => [...prev, violation]);

    // Send violation to backend for logging (for interviewer to see)
    // This happens silently in the background - candidate sees nothing
    if (interview?.id) {
      try {
        await interviewService.logProctoringViolation(
          interview.id,
          violation.type,
          violation.description,
          violation.timestamp
        );
      } catch (err) {
        console.error('Error logging violation to backend:', err);
        // Continue silently - don't break the interview experience
      }
    }
  };

  // Proctoring hook (monitoring happens silently in background - no UI feedback to candidate)
  useProctoring(handleViolation);

  useEffect(() => {
    fetchInterviewDetails();
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    try {
      setLoading(true);
      // Get all upcoming interviews and find the one matching interviewId
      const interviews = await interviewService.getMyUpcomingInterviews();
      const foundInterview = interviews.find(i => i.id === parseInt(interviewId));

      if (!foundInterview) {
        setError('Interview not found');
        return;
      }

      if (!foundInterview.meetLink) {
        setError('Meeting link not available yet');
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

  const handleJoinMeeting = () => {
    if (interview?.meetLink) {
      // Open Meet link in a new window/tab to keep proctoring active
      const newWindow = window.open(
        interview.meetLink,
        '_blank',
        'noopener,noreferrer,width=1200,height=800'
      );

      if (newWindow) {
        setMeetWindow(newWindow);
        setInterviewStarted(true);

        // Check if the window was closed
        const checkWindow = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkWindow);
            setMeetWindow(null);
          }
        }, 1000);
      } else {
        // Popup blocked - fallback to same window
        showToast('Please allow popups for this site to join the interview meeting.', 'warning');
        window.location.href = interview.meetLink;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meetWindow && !meetWindow.closed) {
        // Optionally close the meet window when proctoring page closes
        // meetWindow.close();
      }
    };
  }, [meetWindow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Loading interview details...</div>
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
            onClick={() => navigate('/upcoming-interviews')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Interview Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Session</h1>
            <p className="text-gray-600">Join your scheduled interview meeting</p>
          </div>

          {interview && (
            <div>
              {/* Interview Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <FiBriefcase className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{interview.jobTitle}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <FiUser className="w-4 h-4 text-gray-500" />
                        <span><strong>Interviewer:</strong> {interview.interviewerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-gray-500" />
                        <span><strong>Date:</strong> {new Date(interview.interviewDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4 text-gray-500" />
                        <span><strong>Time:</strong> {interview.interviewTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!interviewStarted ? (
                <div className="text-center">
                  <button
                    onClick={handleJoinMeeting}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-md hover:shadow-lg"
                  >
                    <FiVideo className="w-6 h-6" />
                    Join Interview Meeting
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    Click the button above to join your interview meeting when ready.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-green-800 font-semibold text-lg">Interview Meeting Active</p>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    Your interview meeting is currently open in a new window.
                  </p>
                  {meetWindow && !meetWindow.closed && (
                    <button
                      onClick={() => meetWindow.focus()}
                      className="text-sm text-green-700 underline hover:text-green-800 font-medium"
                    >
                      Return to Meeting
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate('/upcoming-interviews')}
            className="mt-6 text-gray-600 hover:text-gray-800 text-sm underline flex items-center"
          >
            <FiArrowLeft className="mr-2" /> Back to Upcoming Interviews
          </button>
        </div>
      </div>
    </div >
  );
};

export default ProctoredInterview;
