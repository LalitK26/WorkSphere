import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { advancedAnalyticsService } from '../../api/advancedAnalyticsService';
import { FiArrowUp, FiArrowDown, FiAlertCircle, FiHelpCircle } from 'react-icons/fi';

const AdvancedDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiringActivityPeriod, setHiringActivityPeriod] = useState('weekly');
  const [hiringActivityData, setHiringActivityData] = useState(null);
  const [recruiterPerformance, setRecruiterPerformance] = useState([]);
  const [technicalInterviewers, setTechnicalInterviewers] = useState([]);
  const [offerInsights, setOfferInsights] = useState(null);
  const [departmentAnalysis, setDepartmentAnalysis] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, [hiringActivityPeriod]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [hiringData, recruiterData, interviewerData, offerData, deptData] = await Promise.all([
        advancedAnalyticsService.getHiringActivityOverTime(hiringActivityPeriod),
        advancedAnalyticsService.getRecruiterPerformance(),
        advancedAnalyticsService.getTechnicalInterviewerOverview(),
        advancedAnalyticsService.getOfferAndHiringInsights(),
        advancedAnalyticsService.getDepartmentRoleAnalysis(),
      ]);

      setHiringActivityData(hiringData);
      setRecruiterPerformance(recruiterData.recruiters || []);
      setTechnicalInterviewers(interviewerData.interviewers || []);
      setOfferInsights(offerData);
      setDepartmentAnalysis(deptData);
    } catch (err) {
      console.error('Error fetching advanced analytics:', err);
      setError('Failed to load advanced analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading advanced dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4 font-medium">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Chart colors matching Figma design
  const colors = {
    applications: '#3B82F6', // Blue
    screening: '#A855F7', // Purple
    technical: '#F97316', // Orange
    hr: '#10B981', // Green for HR
    offersGenerated: '#16A34A', // Dark Green
    offersAccepted: '#86EFAC', // Light Green
    generated: '#3B82F6', // Blue
    accepted: '#22C55E', // Green
    rejected: '#EF4444', // Red
  };

  // Prepare data for charts
  const applicationFlowData = hiringActivityData?.applicationFlow || [];
  const offerPerformanceData = hiringActivityData?.offerPerformance || [];
  const offerTrendsData = offerInsights?.offerTrends || [];
  const dropOutData = offerInsights?.dropOutPoints || [];

  const COLORS_PIE = ['#3B82F6', '#22C55E', '#EF4444']; // Blue (Generated), Green (Accepted), Red (Rejected)

  return (
    <div className="page-container bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Advanced Dashboard</h1>
            <p className="text-gray-600 text-sm">Deeper insights and hiring performance analytics</p>
          </div>
        </div>
      </div>

      {/* Hiring Activity Over Time */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Hiring Activity Over Time</h2>
            <p className="text-sm text-gray-500 mt-1">Track application flow and offer performance across time periods</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setHiringActivityPeriod('weekly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${hiringActivityPeriod === 'weekly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setHiringActivityPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${hiringActivityPeriod === 'monthly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application Flow Chart */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Application Flow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={applicationFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="period"
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke={colors.applications}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Applications"
                />
                <Line
                  type="monotone"
                  dataKey="screening"
                  stroke={colors.screening}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Screening"
                />
                <Line
                  type="monotone"
                  dataKey="technical"
                  stroke={colors.technical}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Technical"
                />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke={colors.hr}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="HR"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Offer Performance Chart */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Offer Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={offerPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="period"
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Bar dataKey="generated" fill={colors.offersGenerated} name="Offers Generated" />
                <Bar dataKey="accepted" fill={colors.offersAccepted} name="Offers Accepted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recruiter Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recruiter Performance</h2>
        <div className="table-responsive-wrapper">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Recruiter</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Jobs</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Candidates</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Interviews</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pending Interviews</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Offer Success</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rejection Rate</th>
              </tr>
            </thead>
            <tbody>
              {recruiterPerformance.map((recruiter, index) => {
                const offerSuccessColor = recruiter.offerSuccess >= 75 ? 'text-green-600' : 'text-orange-600';
                const rejectionRateColor = recruiter.rejectionRate > 50 ? 'text-red-600' : recruiter.rejectionRate > 45 ? 'text-orange-600' : 'text-gray-700';

                return (
                  <tr key={recruiter.recruiterId || index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{recruiter.recruiterName}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{recruiter.jobs}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{recruiter.candidates}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{recruiter.totalInterviews}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{recruiter.pendingInterviews}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${recruiter.offerSuccess >= 75 ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                            style={{ width: `${Math.min(recruiter.offerSuccess, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${offerSuccessColor}`}>
                          {recruiter.offerSuccess}%
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium ${rejectionRateColor}`}>
                      {recruiter.rejectionRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Interviewer Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Interviewer Overview</h2>
        <div className="table-responsive-wrapper">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Interviewer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Interviews</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Candidates</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Shortlist Rate</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rejection Rate</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pending Feedback</th>
              </tr>
            </thead>
            <tbody>
              {technicalInterviewers.map((interviewer, index) => {
                const pendingFeedbackColor = interviewer.pendingFeedback > 3 ? 'text-red-600' : 'text-gray-700';

                return (
                  <tr key={interviewer.interviewerId || index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{interviewer.interviewerName}</td>
                    <td className="py-3 px-4 text-sm text-blue-600 font-medium">{interviewer.interviews}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{interviewer.totalCandidates}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(interviewer.shortlistRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">{interviewer.shortlistRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{interviewer.rejectionRate}%</td>
                    <td className="py-3 px-4 text-sm">
                      {interviewer.pendingFeedback > 3 ? (
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${pendingFeedbackColor}`}>
                            {interviewer.pendingFeedback}
                          </span>
                          <FiAlertCircle className="text-red-500 w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-gray-700">{interviewer.pendingFeedback}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offer & Hiring Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Offer and Hiring Insights</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Offer Trends Over Time */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Offer Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={offerTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="period"
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="generated"
                  stroke={colors.generated}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Generated"
                />
                <Line
                  type="monotone"
                  dataKey="accepted"
                  stroke={colors.accepted}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Accepted"
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke={colors.rejected}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Rejected"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Acceptance Rate</p>
                <p className="text-lg font-bold text-blue-700">
                  {offerInsights?.acceptanceRate?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Avg Time to Accept</p>
                <p className="text-lg font-bold text-green-700">
                  {offerInsights?.avgTimeToAccept?.toFixed(1) || 0} days
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Pending Offers</p>
                <p className="text-lg font-bold text-purple-700">
                  {offerInsights?.pendingOffers || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Candidate Drop-out Points */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Candidate Drop-out Points</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dropOutData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage, count }) => `${name}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {dropOutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {dropOutData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }}
                  />
                  <span className="text-gray-700">{item.category}</span>
                  <span className="text-gray-500 ml-auto">{item.count} {item.count === 1 ? 'offer' : 'offers'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Department & Role-Based Analysis */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Department & Role-Based Analysis</h2>
        <div className="table-responsive-wrapper mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Active Roles</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rejection Rate</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Offer Acceptance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {departmentAnalysis?.departments?.map((dept, index) => {
                const rejectionRateColor = dept.rejectionRate > 50 ? 'text-red-600' : 'text-gray-700';
                const offerAcceptanceColor = dept.offerAcceptance >= 75 ? 'text-green-600' : dept.offerAcceptance >= 65 ? 'text-orange-600' : 'text-red-600';
                const statusColor = dept.status === 'Strong' ? 'text-green-600' : dept.status === 'Needs Attention' ? 'text-red-600' : 'text-gray-600';
                const statusIcon = dept.status === 'Strong' ? <FiArrowUp className="w-4 h-4" /> : dept.status === 'Needs Attention' ? <FiAlertCircle className="w-4 h-4" /> : null;

                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{dept.department}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{dept.activeRoles}</td>
                    <td className={`py-3 px-4 text-sm font-medium ${rejectionRateColor}`}>
                      {dept.rejectionRate}%
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${dept.offerAcceptance >= 75
                                ? 'bg-green-500'
                                : dept.offerAcceptance >= 65
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              }`}
                            style={{ width: `${Math.min(dept.offerAcceptance, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${offerAcceptanceColor}`}>
                          {dept.offerAcceptance}%
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium ${statusColor}`}>
                      <div className="flex items-center gap-1">
                        {statusIcon}
                        <span>{dept.status}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Insight Cards */}
        {departmentAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departmentAnalysis.topPerformer && Object.keys(departmentAnalysis.topPerformer).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiArrowUp className="text-green-600 w-5 h-5" />
                  <span className="text-sm font-semibold text-green-800">Top Performer</span>
                </div>
                <p className="text-sm text-gray-700">
                  {departmentAnalysis.topPerformer.department} team: {departmentAnalysis.topPerformer.offerAcceptance}% acceptance
                </p>
              </div>
            )}
            {departmentAnalysis.needsAttention && Object.keys(departmentAnalysis.needsAttention).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertCircle className="text-red-600 w-5 h-5" />
                  <span className="text-sm font-semibold text-red-800">Needs Attention</span>
                </div>
                <p className="text-sm text-gray-700">
                  {departmentAnalysis.needsAttention.department} team: {departmentAnalysis.needsAttention.rejectionRate}% rejection
                </p>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiArrowDown className="text-blue-600 w-5 h-5" />
                <span className="text-sm font-semibold text-blue-800">Improvement Area</span>
              </div>
              <p className="text-sm text-gray-700">
                Review screening criteria for better candidate quality
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help Icon */}
      <div className="fixed bottom-6 right-6">
        <button className="bg-gray-200 hover:bg-gray-300 rounded-full p-3 shadow-lg transition-colors">
          <FiHelpCircle className="w-6 h-6 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default AdvancedDashboard;
