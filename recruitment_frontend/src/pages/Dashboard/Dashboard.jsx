import { useAuth } from '../../context/AuthContext';
import CandidateDashboard from './CandidateDashboard';
import InterviewerDashboard from './InterviewerDashboard';
import RecruiterDashboard from './RecruiterDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { isCandidate, user, isRecruitmentAdmin } = useAuth();

  if (isCandidate()) {
    return <CandidateDashboard />;
  }

  // Technical Interviewer Dashboard
  if (user?.role === 'TECHNICAL_INTERVIEWER') {
    return <InterviewerDashboard />;
  }

  // Recruiter Dashboard
  if (user?.role === 'RECRUITER') {
    return <RecruiterDashboard />;
  }

  // Admin Dashboard - check for RECRUITMENT_ADMIN role
  if (isRecruitmentAdmin() || user?.role === 'RECRUITMENT_ADMIN' || user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  return null;
};

export default Dashboard;

