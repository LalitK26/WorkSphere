import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiThumbsUp,
  FiUserCheck,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import { adminDashboardService } from '../../api/adminDashboardService';

const PrivateDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await adminDashboardService.getDashboardStats();
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50/50">
        <div className="text-center">
          <p className="text-red-600 mb-4 font-medium">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { summaryCards, hiringFlow, activeJobOpenings, userActivity, recentActivity } = dashboardData;

  // Helper to get funnel value - defaulting to total for the funnel overview
  const getFunnelValue = (stage) => {
    return hiringFlow['total'][stage] || 0;
  };

  return (
    <div className="page-container bg-gray-50/50 min-h-screen font-sans">
      {/* Professional Enterprise Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <FiBriefcase className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm font-medium">
              Comprehensive overview of recruitment activity and system health
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-responsive-stats mb-8">
        <OverviewCard
          title="Total Candidates"
          value={summaryCards.candidates.total}
          icon={<FiUsers className="w-6 h-6" />}
          color="blue"
        />
        <OverviewCard
          title="Total Job Openings"
          value={summaryCards.jobOpenings.total}
          icon={<FiBriefcase className="w-6 h-6" />}
          color="purple"
        />
        <OverviewCard
          title="Interviews Scheduled"
          value={getFunnelValue('technical') + getFunnelValue('hrRound')}
          icon={<FiCalendar className="w-6 h-6" />}
          color="amethyst"
        />
        <OverviewCard
          title="Offers Issued"
          value={summaryCards.offers.total}
          icon={<FiFileText className="w-6 h-6" />}
          color="emerald"
        />
        <OverviewCard
          title="Offer Accepted"
          value={summaryCards.hired.total}
          icon={<FiUserCheck className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Recruitment Funnel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 hover:shadow-md transition-shadow duration-300">
        <h2 className="text-xl font-bold text-gray-900 mb-8">Recruitment Funnel</h2>
        <div className="flex items-center justify-between overflow-x-auto pb-4 gap-4 px-2">
          <FunnelStage label="Applied" count={getFunnelValue('applied')} />
          <FunnelArrow />
          <FunnelStage label="Shortlisted" count={getFunnelValue('shortlisted')} />
          <FunnelArrow />
          <FunnelStage label="Technical Round" count={getFunnelValue('technical')} />
          <FunnelArrow />
          <FunnelStage label="HR Round" count={getFunnelValue('hrRound')} />
          <FunnelArrow />
          <FunnelStage label="Offer Issued" count={getFunnelValue('offer')} />
          <FunnelArrow />
          <FunnelStage label="Offer Accepted" count={getFunnelValue('joined')} />
        </div>
      </div>

      {/* Active Job Openings & User Activity - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Job Openings */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex overflow-hidden hover:shadow-md transition-all duration-300">
          {/* Slim sidebar */}
          <div className="w-1.5 bg-blue-600 flex-shrink-0"></div>
          <div className="p-8 flex-1 overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-sans">Active Job Openings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Job Title</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Department</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Openings</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stage</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeJobOpenings.length > 0 ? (
                    activeJobOpenings.slice(0, 5).map((job) => ( // Limit to 5 for cleaner layout in split view
                      <tr key={job.id} className="hover:bg-gray-50/80 transition-colors duration-150 group">
                        <td className="py-4 px-4 text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{job.jobTitle}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{job.department}</td>
                        <td className="py-4 px-4 text-sm text-gray-600 font-medium">{job.numberOfOpenings}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{job.currentStage}</td>
                        <td className="py-4 px-4">
                          <StatusBadge status={job.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-gray-400">
                        No active job openings
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Activity Summary */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Activity</h2>
          <div className="space-y-4">
            <ActivityRow
              title="Active Recruiters"
              value={userActivity.activeRecruiters}
              icon={<FiUsers className="w-5 h-5 text-blue-600" />}
            />
            <ActivityRow
              title="Active Technical Interviewers"
              value={userActivity.activeTechnicalInterviewers}
              icon={<FiUsers className="w-5 h-5 text-purple-600" />}
            />
            <ActivityRow
              title="Interviews Today"
              value={userActivity.interviewsToday}
              icon={<FiCalendar className="w-5 h-5 text-orange-600" />}
            />
            <ActivityRow
              title="Waiting for Feedback"
              value={userActivity.waitingForFeedback}
              icon={<FiClock className="w-5 h-5 text-amber-600" />}
            />
          </div>
          {userActivity.waitingForFeedback > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-6 flex items-start gap-3">
              <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Feedback Needed</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {userActivity.waitingForFeedback} {userActivity.waitingForFeedback === 1 ? 'interview' : 'interviews'} pending feedback for more than 48h.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-8 hover:shadow-md transition-shadow duration-300">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, idx) => <ActivityItem key={idx} activity={activity} />)
          ) : (
            <p className="text-gray-400 text-center py-12">No recent activity</p>
          )}
        </div>
      </div>

    </div>
  );
};

// Funnel Components
const FunnelStage = ({ label, count }) => {
  return (
    <div className="group flex flex-col items-center justify-center p-5 rounded-xl min-w-[150px] bg-blue-50 border border-blue-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden">
      <span className="text-3xl font-bold text-blue-600 mb-1 z-10">{count}</span>
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide z-10">{label}</span>
    </div>
  );
};

const FunnelArrow = () => (
  <div className="px-2 text-gray-300 flex-shrink-0">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  </div>
);

// New Overview and Activity Components for updated layout
const OverviewCard = ({ title, value, icon, color }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amethyst: 'bg-fuchsia-50 text-fuchsia-600', // Matches the purple calendar icon in image
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="stat-card-responsive bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="flex flex-col h-full justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="stat-value-responsive text-gray-900 tracking-tight">{value}</h3>
      </div>
      <div className={`p-4 rounded-xl ${colorStyles[color] || 'bg-gray-50 text-gray-600'}`}>
        {icon}
      </div>
    </div>
  );
};

const ActivityRow = ({ title, value, icon }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all duration-200 group">
    <div className="flex items-center gap-4">
      <div className="bg-white p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{title}</span>
    </div>
    <span className="text-lg font-bold text-gray-900">{value}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    ON_HOLD: { label: 'Paused', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
    CLOSED: { label: 'Closed', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-800 border border-gray-200' };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${cfg.cls}`}>{cfg.label}</span>;
};

const ActivityItem = ({ activity }) => {
  const iconMap = {
    briefcase: <div className="p-2 rounded-full bg-blue-100 text-blue-600"><FiBriefcase className="w-4 h-4" /></div>,
    check: <div className="p-2 rounded-full bg-emerald-100 text-emerald-600"><FiCheckCircle className="w-4 h-4" /></div>,
    calendar: <div className="p-2 rounded-full bg-purple-100 text-purple-600"><FiCalendar className="w-4 h-4" /></div>,
    file: <div className="p-2 rounded-full bg-orange-100 text-orange-600"><FiFileText className="w-4 h-4" /></div>,
  };

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors duration-200 group border border-transparent hover:border-gray-100">
      <div className="mt-0.5 group-hover:scale-110 transition-transform duration-200">
        {iconMap[activity.icon] || <div className="p-2 rounded-full bg-gray-100 text-gray-600"><FiFileText className="w-4 h-4" /></div>}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
        <p className="text-xs text-gray-500 mt-1.5 font-medium">{activity.timeAgo}</p>
      </div>
    </div>
  );
};

export default PrivateDashboard;
