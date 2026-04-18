import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../api/ticketService';
import { employeeService } from '../../api/employeeService';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Avatar from '../../components/UI/Avatar';
import SearchableEmployeeSelect from '../../components/UI/SearchableEmployeeSelect';
import { formatDateTime } from '../../utils/formatters';
import { getFullImageUrl } from '../../utils/imageUrl';

const TicketDetail = () => {
  const { id } = useParams();
  const { isAdmin, user, getModulePermission } = useAuth();
  const navigate = useNavigate();
  
  // Check permissions - use actual permission value, not just admin status
  // This ensures users with "Added", "Owned", or "Added and Owned" see employee UI
  const updatePermission = getModulePermission('Tickets', 'update');
  const viewPermission = getModulePermission('Tickets', 'view');
  const hasAllUpdatePermission = updatePermission === 'All';
  const hasUpdatePermission = updatePermission !== 'None';
  const hasAllViewPermission = viewPermission === 'All';
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  // Employees are now loaded on-demand by SearchableEmployeeSelect
  // Assign to dropdown is now handled by SearchableEmployeeSelect component

  useEffect(() => {
    loadTicket();
    // Employees are now loaded on-demand by SearchableEmployeeSelect
  }, [id, hasAllUpdatePermission]);

  const loadTicket = async () => {
    try {
      const response = await ticketService.getById(id);
      setTicket(response.data);
    } catch (error) {
      alert('Failed to load ticket');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setReplyFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileContent: base64String,
            fileSize: file.size,
            contentType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    setSubmittingReply(true);
    try {
      const replyData = {
        message: replyMessage,
      };
      
      if (replyFiles && replyFiles.length > 0) {
        replyData.files = replyFiles.map(file => ({
          fileName: file.fileName,
          fileContent: file.fileContent,
          fileSize: file.fileSize,
          contentType: file.contentType,
        }));
      }
      
      await ticketService.addReply(id, replyData);
      setReplyMessage('');
      setReplyFiles([]);
      await loadTicket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send reply';
      alert(errorMessage);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await ticketService.update(id, { status: newStatus });
      await loadTicket(); // Reload to get updated status and activity
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update status';
      alert(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <Topbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="text-center">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  // Combine initial message and replies into a single thread
  const allMessages = [
    {
      id: 'initial',
      user: ticket.requesterName,
      userProfilePicture: ticket.requesterProfilePicture,
      message: ticket.description,
      createdAt: ticket.createdAt,
      files: ticket.files?.filter(f => !f.replyId) || [],
    },
    ...(ticket.replies || []).map(reply => ({
      id: reply.id,
      user: reply.userName,
      userProfilePicture: reply.userProfilePicture,
      message: reply.message,
      createdAt: reply.createdAt,
      files: reply.files || [],
    })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Determine the "To:" field value based on current user and ticket assignment
  // If current user is the assigned employee, show requester name
  // Otherwise, if ticket is assigned, show assigned agent name
  // Fallback to requester name if no assignment
  const getToFieldValue = () => {
    if (ticket.assignedAgentId && user?.userId === ticket.assignedAgentId) {
      return ticket.requesterName;
    }
    return ticket.assignedAgentName || ticket.requesterName;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <div className="mb-6 hidden">
            {/* Page title removed - ticket number shown in topbar */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Ticket Subject and Status */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 break-words">{ticket.subject}</h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Requested On {formatDateTime(ticket.createdAt, 'dd-MM-yyyy hh:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    {ticket.status === 'OPEN' && (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">New</span>
                    )}
                  </div>
                </div>

                {/* Message Thread - Chat-like */}
                <div className="border-t pt-4 space-y-4">
                  {allMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 sm:gap-3">
                      <Avatar
                        profilePictureUrl={msg.userProfilePicture}
                        fullName={msg.user}
                        size="w-8 h-8 sm:w-10 sm:h-10"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <span className="font-semibold text-sm sm:text-base text-gray-800 break-words">{msg.user}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(msg.createdAt, 'dd-MM-yyyy hh:mm a')}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">{msg.message}</p>
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.files.map((file) => (
                              <div key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 p-2 rounded">
                                <span className="text-xs sm:text-sm text-gray-700 break-words flex-1 min-w-0">{file.fileName}</span>
                                <a
                                  href={getFullImageUrl(file.fileContent)}
                                  download={file.fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                                >
                                  Download
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                <div className="border-t pt-4 mt-4 sm:mt-6">
                  <div className="mb-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      To: <span className="break-words">{getToFieldValue()}</span>
                    </label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={4}
                      placeholder="Type your reply here..."
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y"
                    />
                  </div>
                  <div className="mb-4">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    {replyFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {replyFiles.map((file, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50 p-2 rounded">
                            <span className="text-xs sm:text-sm text-gray-700 break-words flex-1 min-w-0">{file.fileName}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleReply}
                      disabled={submittingReply}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {submittingReply ? 'Sending...' : 'Submit'}
                    </button>
                    <button
                      onClick={() => {
                        setReplyMessage('');
                        setReplyFiles([]);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              {/* Details/Contact/Activity Tabs */}
              <div className="bg-white rounded-lg shadow">
                <div className="flex border-b overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
                      activeTab === 'details'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
                      activeTab === 'contact'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Contact
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
                      activeTab === 'activity'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Activity
                  </button>
                </div>

                <div className="p-3 sm:p-4">
                  {activeTab === 'details' && (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Admin-only feature: Assign To */}
                      {hasAllUpdatePermission && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Assign To</label>
                          <SearchableEmployeeSelect
                            selectedIds={ticket.assignedAgentId ? [String(ticket.assignedAgentId)] : []}
                            onSelectionChange={async (selectedIds) => {
                              const selectedId = selectedIds[0] ? Number(selectedIds[0]) : null;
                              try {
                                await ticketService.update(id, { assignedAgentId: selectedId });
                                await loadTicket();
                              } catch (error) {
                                alert(error.response?.data?.message || error.message || 'Failed to assign ticket');
                              }
                            }}
                            multiple={false}
                            placeholder="--"
                            className="w-full"
                          />
                        </div>
                      )}
                      {/* Employee features: Status, Priority, Type, Tags - available to users with Update permission */}
                      {hasUpdatePermission && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Status</label>
                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusUpdate(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="OPEN">Open</option>
                              <option value="PENDING">Pending</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Priority</label>
                            <select
                              value={ticket.priority}
                              onChange={async (e) => {
                                try {
                                  await ticketService.update(id, { priority: e.target.value });
                                  await loadTicket();
                                } catch (error) {
                                  const errorMessage = error.response?.data?.message || error.message || 'Failed to update priority';
                                  alert(errorMessage);
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Type</label>
                            <input
                              type="text"
                              value={ticket.ticketType || ''}
                              onChange={(e) => {
                                setTicket({ ...ticket, ticketType: e.target.value });
                              }}
                              onBlur={async (e) => {
                                const newType = e.target.value.trim() || null;
                                try {
                                  await ticketService.update(id, { ticketType: newType });
                                  await loadTicket();
                                } catch (error) {
                                  const errorMessage = error.response?.data?.message || error.message || 'Failed to update type';
                                  alert(errorMessage);
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Tags</label>
                            <input
                              type="text"
                              value={ticket.tags || ''}
                              onChange={(e) => {
                                setTicket({ ...ticket, tags: e.target.value });
                              }}
                              onBlur={async (e) => {
                                const newTags = e.target.value.trim() || null;
                                try {
                                  await ticketService.update(id, { tags: newTags });
                                  await loadTicket();
                                } catch (error) {
                                  const errorMessage = error.response?.data?.message || error.message || 'Failed to update tags';
                                  alert(errorMessage);
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'contact' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Name</label>
                        <p className="text-sm text-gray-800">{ticket.requesterName}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Email</label>
                        <p className="text-sm text-gray-800">{ticket.requesterEmail}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Designation</label>
                        <p className="text-sm text-gray-800">{ticket.requesterDesignation || '-'}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800 mb-2">Ticket Activity</h3>
                      {ticket.activities && ticket.activities.length > 0 ? (
                        ticket.activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-2">
                            <span className="text-lg">📋</span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-800">{activity.userName}</p>
                              <p className="text-xs text-gray-600">{activity.action}</p>
                              <p className="text-xs text-gray-500">
                                {formatDateTime(activity.createdAt, 'dd-MM-yyyy hh:mm a')}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No activity yet</p>
                      )}
                      {hasUpdatePermission && (
                        <div className="mt-4 pt-4 border-t">
                          <label className="block text-xs text-gray-600 mb-1">Update Status</label>
                          <select
                            value={ticket.status}
                            onChange={(e) => handleStatusUpdate(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="OPEN">Open</option>
                            <option value="PENDING">Pending</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TicketDetail;
