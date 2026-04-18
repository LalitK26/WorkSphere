import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { candidateJobService } from '../../api/candidateJobService';
import { FiBriefcase, FiCalendar, FiLoader, FiCheckCircle, FiXCircle, FiClock, FiClipboard } from 'react-icons/fi';
import {
  addNotification,
  getNotifiedApplicationIds,
  markApplicationNotified,
} from '../../utils/notificationStorage';

const MyApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.userId == null) return;
    fetchMyApplications();
  }, [user?.userId]);

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await candidateJobService.getMyApplications();
      setApplications(data);
      const uid = user?.userId != null ? String(user.userId) : null;
      const notified = getNotifiedApplicationIds();
      const list = Array.isArray(data) ? data : [];
      for (const app of list) {
        if (!app?.id) continue;
        const sid = Number(app.id);
        if (isNaN(sid)) continue;
        if (app.status === 'SHORTLISTED' && !notified.has(sid)) {
          try {
            addNotification(uid, {
              title: 'Action Required',
              message: `Your application for ${app.jobTitle ?? 'the position'} has been shortlisted. Please upload the mandatory documents in the 'My Offers' section to proceed.`,
              redirectPath: '/my-offers',
            });
            markApplicationNotified(sid);
          } catch (_) { }
        } else if (app.status === 'REJECTED' && !notified.has(sid)) {
          try {
            addNotification(uid, {
              title: 'Application rejected',
              message: `Your application for ${app.jobTitle ?? 'the position'} was not successful.`,
              redirectPath: '/my-applications',
            });
            markApplicationNotified(sid);
          } catch (_) { }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <FiClock className="inline mr-1" />,
        text: 'Pending'
      },
      REVIEWING: {
        color: 'bg-blue-100 text-blue-800',
        icon: <FiClock className="inline mr-1" />,
        text: 'In Review'
      },
      SHORTLISTED: {
        color: 'bg-green-100 text-green-800',
        icon: <FiCheckCircle className="inline mr-1" />,
        text: 'Shortlisted'
      },
      REJECTED: {
        color: 'bg-red-100 text-red-800',
        icon: <FiXCircle className="inline mr-1" />,
        text: 'Rejected'
      },
      ACCEPTED: {
        color: 'bg-green-100 text-green-800',
        icon: <FiCheckCircle className="inline mr-1" />,
        text: 'Accepted'
      }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FiLoader className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm mt-0.5">
              <FiClipboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">My Applications</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                Track your job applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold">{applications.length}</span>
            <span>Total Applications</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">
              {applications.length}
            </div>
            <div className="text-gray-600 mt-1">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {applications.filter(app => app.status === 'PENDING' || app.status === 'REVIEWING').length}
            </div>
            <div className="text-gray-600 mt-1">In Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {applications.filter(app => app.status === 'SHORTLISTED').length}
            </div>
            <div className="text-gray-600 mt-1">Shortlisted</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {applications.filter(app => app.status === 'REJECTED').length}
            </div>
            <div className="text-gray-600 mt-1">Rejected</div>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FiBriefcase className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">You haven't applied to any jobs yet</p>
            <p className="text-gray-500 mt-2">Browse job openings and start applying!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {application.jobTitle}
                      </h3>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-gray-600 mb-2">
                      <span className="font-medium">Company:</span> {application.companyName}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiCalendar />
                        Applied on {formatDate(application.createdAt)}
                      </span>
                      {application.updatedAt !== application.createdAt && (
                        <span className="flex items-center gap-1">
                          <FiCalendar />
                          Updated on {formatDate(application.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Letter Preview */}
                {application.coverLetter && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Cover Letter:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {application.coverLetter}
                    </p>
                  </div>
                )}

                {/* Interview Round Information */}
                {application.interviewRound && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Interview Round:</p>
                        <p className="text-sm text-gray-900">
                          {application.interviewRound === 'TECHNICAL' && 'Technical Round'}
                          {application.interviewRound === 'HR' && 'HR Round'}
                          {application.interviewRound === 'FINAL' && 'Final Round'}
                        </p>
                      </div>
                      {application.interviewResult && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Result:</p>
                          {application.interviewResult === 'SHORTLISTED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Shortlisted
                            </span>
                          )}
                          {application.interviewResult === 'REJECTED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Rejected
                            </span>
                          )}
                          {application.interviewResult === 'PENDING' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {application.interviewRemarks && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
                        <p className="text-sm text-gray-600">{application.interviewRemarks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
