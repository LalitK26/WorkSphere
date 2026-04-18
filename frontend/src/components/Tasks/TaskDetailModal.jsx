import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../api/taskService';
import Avatar from '../UI/Avatar';
import { formatDate } from '../../utils/formatters';

const TaskDetailModal = ({ isOpen, onClose, task, onStatusChange, projectName }) => {
  const { isAdmin } = useAuth();
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && task?.id) {
      loadTaskDetails();
    }
  }, [isOpen, task?.id]);

  const loadTaskDetails = async () => {
    if (!task?.id) return;
    try {
      setLoading(true);
      const response = await taskService.getById(task.id);
      setTaskDetails(response.data);
    } catch (error) {
      setTaskDetails(task);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!taskDetails) return;
    try {
      await taskService.update(taskDetails.id, {
        title: taskDetails.title,
        description: taskDetails.description,
        startDate: taskDetails.startDate,
        dueDate: taskDetails.dueDate,
        status: 'COMPLETED',
        priority: taskDetails.priority,
        assignedToId: taskDetails.assignedToId,
        projectId: taskDetails.projectId,
        categoryId: taskDetails.categoryId,
        pinned: taskDetails.pinned,
      });
      if (onStatusChange) {
        onStatusChange(taskDetails, 'COMPLETED');
      }
      await loadTaskDetails();
    } catch (error) {
      alert('Unable to update task status.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'IN_PROGRESS':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'INCOMPLETE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'INCOMPLETE':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'Complete';
      case 'IN_PROGRESS':
        return 'Doing';
      case 'PENDING':
        return 'To Do';
      case 'INCOMPLETE':
        return 'Incomplete';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return '';
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch (error) {
      return '';
    }
  };

  const formatDateOnly = (date) => {
    if (!date) return '--';
    return formatDate(date, 'dd-MM-yyyy');
  };

  const formatDateTimeDisplay = (dateTime) => {
    if (!dateTime) return { date: '--', time: '' };
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
      return {
        date: formatDate(date, 'dd-MM-yyyy'),
        time: formatTime(date),
      };
    } catch (error) {
      return { date: '--', time: '' };
    }
  };

  if (!isOpen || !task) return null;

  const displayTask = taskDetails || task;
  const canEdit = isAdmin();
  const statusDisplay = getStatusText(displayTask.status);
  const createdOn = formatDateTimeDisplay(displayTask.createdAt);

  return (
    <div
      className="fixed inset-y-0 left-0 right-0 md:left-64 z-50 overflow-y-auto bg-black/40"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-screen items-start justify-center px-4 py-10">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Close
          </button>

          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <p className="mb-1 text-sm text-gray-500">Task #{displayTask.code || 'N/A'}</p>
              <h2 className="text-2xl font-bold text-gray-800">{displayTask.title}</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Panel - Task Details */}
              <div className="space-y-6 lg:col-span-2">
                {/* Action Buttons */}
                {canEdit && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMarkComplete}
                      disabled={displayTask.status === 'COMPLETED'}
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-semibold transition ${displayTask.status === 'COMPLETED'
                          ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500'
                          : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark as Complete
                    </button>
                  </div>
                )}

                {/* Task Attributes */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Project:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-gray-800">{projectName || displayTask.projectName || '--'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Priority:</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${getPriorityColor(displayTask.priority)}`} />
                      <span className="text-gray-800">{displayTask.priority || '--'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Assigned To:</span>
                    <div className="flex items-center gap-2">
                      <Avatar
                        profilePictureUrl={displayTask.assignedToAvatar}
                        fullName={displayTask.assignedToName}
                        size="w-8 h-8"
                        className="border-2 border-gray-300"
                      />
                      <span className="text-gray-800">{displayTask.assignedToName || '--'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Short Code:</span>
                    <span className="text-gray-800">{displayTask.code || '--'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Assigned By:</span>
                    <div className="flex items-center gap-2">
                      <Avatar
                        profilePictureUrl={displayTask.createdByAvatar}
                        fullName={displayTask.createdByName}
                        size="w-8 h-8"
                        className="border-2 border-gray-300"
                      />
                      <span className="text-gray-800">{displayTask.createdByName || '--'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Task category:</span>
                    <span className="text-gray-800">{displayTask.categoryName || '--'}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-32 text-sm font-medium text-gray-600">Description:</span>
                    <span className="flex-1 text-gray-800">{displayTask.description || '--'}</span>
                  </div>
                </div>
              </div>

              {/* Right Panel - Status Summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 lg:col-span-1">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${getStatusDot(displayTask.status)}`} />
                      <span className={`font-semibold ${getStatusColor(displayTask.status)}`}>{statusDisplay}</span>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Created On</p>
                      <p className="text-sm text-gray-800">{createdOn.date}</p>
                      <p className="text-xs text-gray-500">{createdOn.time || '--'}</p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Start Date</p>
                      <p className="text-sm text-gray-800">{formatDateOnly(displayTask.startDate)}</p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Due Date</p>
                      <p className="text-sm text-gray-800">{formatDateOnly(displayTask.dueDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
