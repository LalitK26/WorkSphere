import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { interviewService } from '../../api/interviewService';
import { FiCalendar, FiClock, FiBriefcase, FiUser, FiMail, FiVideo, FiCheckCircle } from 'react-icons/fi';
import {
  addNotification,
  getNotifiedInterviewIds,
  getNotifiedInterviewData,
  markInterviewNotified,
} from '../../utils/notificationStorage';

const formatDateForNotification = (dateString) => {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatTimeForNotification = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return '';
  const [h, m] = timeString.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m || '00'} ${ampm}`;
};

const UpcomingInterviews = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [interviewerPresence, setInterviewerPresence] = useState(new Map()); // Track interviewer presence

  // Get active tab from URL params, default to 'upcoming'
  const activeTab = searchParams.get('tab') || 'upcoming';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Filter interviews based on active tab
  const upcomingInterviews = interviews.filter(i => !i.interviewResult && i.status !== 'COMPLETED');
  const completedInterviews = interviews.filter(i => i.interviewResult || i.status === 'COMPLETED');
  const displayedInterviews = activeTab === 'completed' ? completedInterviews : upcomingInterviews;

  useEffect(() => {
    if (user?.userId == null) return;
    fetchInterviews();
  }, [user?.userId]);

  // Poll for interviewer presence for upcoming interviews
  useEffect(() => {
    if (upcomingInterviews.length === 0) return;

    const checkPresence = async () => {
      const presenceMap = new Map();
      for (const interview of upcomingInterviews) {
        try {
          const isPresent = await interviewService.isInterviewerPresent(interview.id);
          presenceMap.set(interview.id, isPresent);
        } catch (err) {
          console.error(`Error checking presence for interview ${interview.id}:`, err);
          presenceMap.set(interview.id, false);
        }
      }
      setInterviewerPresence(presenceMap);
    };

    // Check immediately
    checkPresence();

    // Poll every 5 seconds
    const interval = setInterval(checkPresence, 5000);

    return () => clearInterval(interval);
  }, [upcomingInterviews]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewService.getMyUpcomingInterviews();
      const list = Array.isArray(data) ? data : [];
      setInterviews(list);
      const uid = user?.userId != null ? String(user.userId) : null;
      const notified = getNotifiedInterviewIds();
      const interviewData = getNotifiedInterviewData();
      for (const iv of list) {
        if (!iv?.id) continue;
        const iid = Number(iv.id);
        if (isNaN(iid)) continue;
        const date = String(iv.interviewDate ?? '');
        const time = String(iv.interviewTime ?? '');
        const prev = interviewData[iid];
        const isUpdate = notified.has(iid) && prev && (prev.interviewDate !== date || prev.interviewTime !== time);
        const isNew = !notified.has(iid);
        if (isNew || isUpdate) {
          try {
            const round = iv.interviewRound === 'TECHNICAL' ? 'Technical Round' : iv.interviewRound === 'HR' ? 'HR Round' : iv.interviewRound === 'FINAL' ? 'Final Round' : (iv.interviewRound ?? '');
            const dateStr = formatDateForNotification(iv.interviewDate);
            const timeStr = formatTimeForNotification(iv.interviewTime);
            const msg = [iv.jobTitle, round, dateStr, timeStr].filter(Boolean).join(' – ');
            addNotification(uid, {
              title: isUpdate ? 'Interview updated' : 'Interview scheduled',
              message: msg || (isUpdate ? 'Your interview has been rescheduled.' : `Interview scheduled for ${iv.jobTitle ?? 'your application'}.`),
              redirectPath: '/upcoming-interviews',
            });
            markInterviewNotified(iid, { interviewDate: date, interviewTime: time });
          } catch (_) { }
        }
      }
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load upcoming interviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-lg shadow-sm mt-0.5 ${activeTab === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
              {activeTab === 'completed' ? <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {activeTab === 'completed' ? 'Completed Interviews' : 'Upcoming Interviews'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                {activeTab === 'completed' ? 'View your past interviews' : 'View your scheduled interviews'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold">{displayedInterviews.length}</span>
            <span>{activeTab === 'completed' ? 'Completed' : 'Scheduled'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'upcoming'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                Upcoming ({upcomingInterviews.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'completed'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4" />
                Completed ({completedInterviews.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {displayedInterviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            {activeTab === 'completed' ? (
              <>
                <FiCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Interviews</h3>
                <p className="text-gray-500">You haven't completed any interviews yet.</p>
              </>
            ) : (
              <>
                <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Interviews</h3>
                <p className="text-gray-500">You don't have any scheduled interviews at the moment.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {displayedInterviews.map((interview) => (
              <div
                key={interview.id}
                className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${activeTab === 'completed' ? 'border-l-4 border-l-green-500' : ''
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FiBriefcase className="w-5 h-5 text-blue-600" />
                      <h3 className="text-xl font-semibold text-gray-900">{interview.jobTitle}</h3>
                    </div>
                    {interview.interviewRound && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {interview.interviewRound === 'TECHNICAL' && 'Technical Round'}
                          {interview.interviewRound === 'HR' && 'HR Round'}
                          {interview.interviewRound === 'FINAL' && 'Final Round'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <FiCalendar className="w-4 h-4" />
                        {formatDate(interview.interviewDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        {formatTime(interview.interviewTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${interview.status === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-800'
                        : interview.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : interview.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {interview.status}
                    </span>
                    {activeTab === 'completed' && interview.interviewResult && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${interview.interviewResult === 'PASSED' || interview.interviewResult === 'SHORTLISTED'
                            ? 'bg-green-100 text-green-700'
                            : interview.interviewResult === 'FAILED' || interview.interviewResult === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        Result: {interview.interviewResult}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  {activeTab === 'upcoming' && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                        <FiVideo className="w-5 h-5" />
                        <span>Meeting Available</span>
                      </div>
                      {interviewerPresence.get(interview.id) ? (
                        <>
                          <button
                            onClick={() => navigate(`/interview/${interview.id}/meeting`)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                          >
                            <FiVideo className="w-5 h-5" />
                            Join Interview Meeting
                          </button>
                          <p className="text-xs text-blue-700 mt-2">
                            Click the button above to join your interview meeting at the scheduled time using our built-in video conferencing system.
                          </p>
                        </>
                      ) : (
                        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FiUser className="w-5 h-5 text-gray-500" />
                            <span>Interviewer has not joined yet</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            The join button will appear once the interviewer enters the meeting room.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <FiUser className="w-4 h-4" />
                        <span className="font-medium">Interviewer:</span>
                      </div>
                      <div className="text-sm text-gray-900 ml-6">{interview.interviewerName}</div>
                      <div className="text-xs text-gray-500 ml-6 flex items-center gap-1">
                        <FiMail className="w-3 h-3" />
                        {interview.interviewerEmail}
                      </div>
                    </div>
                  </div>

                  {interview.notes && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Notes:</div>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                        {interview.notes}
                      </div>
                    </div>
                  )}

                  {activeTab === 'completed' && interview.feedback && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Feedback:</div>
                      <div className="text-sm text-gray-900 bg-green-50 p-3 rounded border border-green-100">
                        {interview.feedback}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingInterviews;

