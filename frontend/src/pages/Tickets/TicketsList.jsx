import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../api/ticketService';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Table from '../../components/UI/Table';
import Avatar from '../../components/UI/Avatar';
import { formatDateTime } from '../../utils/formatters';

const TicketsList = () => {
  const { isAdmin, user, getModulePermission } = useAuth();
  const navigate = useNavigate();

  // Get permissions for Tickets module - use actual permission values
  // This ensures users with "Added", "Owned", or "Added and Owned" see employee UI
  const canAdd = getModulePermission('Tickets', 'add') !== 'None';
  const canUpdate = getModulePermission('Tickets', 'update') !== 'None';
  const canDelete = getModulePermission('Tickets', 'delete') !== 'None';
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState({
    totalTickets: 0,
    closedTickets: 0,
    openTickets: 0,
    pendingTickets: 0,
    resolvedTickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const [ticketsResponse, summaryResponse] = await Promise.all([
        ticketService.getAll(statusFilter),
        ticketService.getSummary(),
      ]);
      setTickets(ticketsResponse.data);
      setSummary(summaryResponse.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryClick = (status) => {
    if (statusFilter === status) {
      setStatusFilter(null);
    } else {
      setStatusFilter(status);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.ticketNumber?.toLowerCase().includes(searchLower) ||
      ticket.subject?.toLowerCase().includes(searchLower) ||
      ticket.requesterName?.toLowerCase().includes(searchLower)
    );
  });

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

  const columns = [
    {
      key: 'ticketNumber',
      label: 'Ticket #',
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'subject',
      label: 'Ticket Subject',
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.status === 'OPEN' && (
            <span className="text-xs text-green-600 font-semibold">New</span>
          )}
        </div>
      ),
    },
    {
      key: 'requesterName',
      label: 'Requester Name',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Avatar
            profilePictureUrl={row.requesterProfilePicture}
            fullName={value}
            size="w-8 h-8"
          />
          <div>
            <div className="font-medium">{value}</div>
            {row.requesterDesignation && (
              <div className="text-xs text-gray-500">{row.requesterDesignation}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Requested On',
      render: (value) => formatDateTime(value, 'dd-MM-yyyy hh:mm a'),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    ...(canUpdate || canDelete ? [{
      key: 'actions',
      label: 'Action',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tickets/${row.id}`);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View"
          >
            👁️
          </button>
          {canDelete && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this ticket?')) {
                  try {
                    await ticketService.delete(row.id);
                    loadData();
                  } catch (error) {
                    alert('Failed to delete ticket');
                  }
                }
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="mb-4 sm:mb-6 hidden">
            {/* Page title removed - shown in topbar */}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div
              onClick={() => handleSummaryClick(null)}
              className={`bg-white rounded-lg shadow p-3 sm:p-4 cursor-pointer transition-all ${
                statusFilter === null ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Tickets</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{summary.totalTickets}</p>
                </div>
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
            </div>
            <div
              onClick={() => handleSummaryClick('CLOSED')}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                statusFilter === 'CLOSED' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Closed Tickets</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{summary.closedTickets}</p>
                </div>
                <span className="text-xl sm:text-2xl">✅</span>
              </div>
            </div>
            <div
              onClick={() => handleSummaryClick('OPEN')}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                statusFilter === 'OPEN' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.openTickets}</p>
                </div>
                <span className="text-2xl">🔴</span>
              </div>
            </div>
            <div
              onClick={() => handleSummaryClick('PENDING')}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                statusFilter === 'PENDING' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Tickets</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.pendingTickets}</p>
                </div>
                <span className="text-2xl">⏳</span>
              </div>
            </div>
            <div
              onClick={() => handleSummaryClick('RESOLVED')}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                statusFilter === 'RESOLVED' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved Tickets</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.resolvedTickets}</p>
                </div>
                <span className="text-2xl">✔️</span>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open Tickets</option>
                  <option value="PENDING">Pending Tickets</option>
                  <option value="RESOLVED">Resolved Tickets</option>
                  <option value="CLOSED">Closed Tickets</option>
                </select>
                <input
                  type="text"
                  placeholder="Start typing to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {canAdd && (
                  <button
                    onClick={() => navigate('/tickets/create')}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                  >
                    <span className="sm:hidden">+ Create</span>
                    <span className="hidden sm:inline">+ Create Ticket</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/tickets/files')}
                  className="px-4 py-2.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                >
                  <span className="sm:hidden">📁</span>
                  <span className="hidden sm:inline">📁 Files</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-lg shadow">
            <Table
              columns={columns}
              data={filteredTickets}
              onRowClick={(row) => navigate(`/tickets/${row.id}`)}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TicketsList;

