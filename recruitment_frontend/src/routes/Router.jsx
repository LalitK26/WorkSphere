import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Auth/Login';
import VerifyEmail from '../pages/Auth/VerifyEmail';
import Dashboard from '../pages/Dashboard/Dashboard';
import UserManagement from '../pages/UserManagement/UserManagement';
import CompleteProfile from '../pages/Candidate/CompleteProfile';
import MyProfile from '../pages/Candidate/MyProfile';
import DocumentsPage from '../pages/Candidate/Documents';
import JobListings from '../pages/Candidate/JobListings';
import JobDetails from '../pages/Candidate/JobDetails';
import MyApplications from '../pages/Candidate/MyApplications';
import JobOpenings from '../pages/JobOpenings/JobOpenings';
import JobOpeningForm from '../pages/JobOpenings/JobOpeningForm';
import Screening from '../pages/Screening/Screening';
import CandidateProfileView from '../pages/Screening/CandidateProfileView';
import InterviewManagement from '../pages/InterviewManagement/InterviewManagement';
import InterviewManagementTabs from '../pages/InterviewManagement/InterviewManagementTabs';
import InterviewerInterviewManagement from '../pages/InterviewManagement/InterviewerInterviewManagement';
import Interviews from '../pages/Interviews/Interviews';
import RecruiterInterviews from '../pages/Interviews/RecruiterInterviews';
import UpcomingInterviews from '../pages/Candidate/UpcomingInterviews';
import ProctoredInterview from '../pages/Candidate/ProctoredInterview';
import EmbeddedInterviewMeeting from '../pages/Interview/EmbeddedInterviewMeeting';
import GenerateOffer from '../pages/Offers/GenerateOffer';
import OfferManagement from '../pages/Offers/OfferManagement';
import MyOffers from '../pages/Candidate/MyOffers';
import OfferDetails from '../pages/Candidate/OfferDetails';
import Notifications from '../pages/Candidate/Notifications';
import EmailTemplatePreview from '../pages/EmailTemplates/EmailTemplatePreview';
import Layout from '../components/Layout';

/*
  Protected Route Wrapper
  - Checks if user is logged in.
  - If candidate, checks if profile is complete.
*/
const ProtectedRoute = ({ children }) => {
  const { user, loading, isCandidate, isProfileComplete } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce profile completion for candidates
  if (isCandidate() && !isProfileComplete()) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

/*
  Profile Route Wrapper
  - Only for candidates.
  - If profile is already complete, redirect to dashboard.
*/
const ProfileRoute = ({ children }) => {
  const { user, loading, isCandidate, isProfileComplete } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isCandidate()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isProfileComplete()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based route wrapper for admin/recruiter
const AdminRecruiterRoute = ({ children }) => {
  const { user, loading, isAdminOrRecruiter } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || !isAdminOrRecruiter()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based route wrapper for candidates
const CandidateRoute = ({ children }) => {
  const { user, loading, isCandidate } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || !isCandidate()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based route wrapper for technical interviewer
const TechnicalInterviewerRoute = ({ children }) => {
  const { user, loading, isTechnicalInterviewer } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || !isTechnicalInterviewer()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based component for Interview Management
const RoleBasedInterviewManagement = () => {
  const { user, loading, isAdminOrRecruiter, isTechnicalInterviewer } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminOrRecruiter()) {
    return <InterviewManagementTabs />;
  }

  if (isTechnicalInterviewer()) {
    return <InterviewerInterviewManagement />;
  }

  return <Navigate to="/dashboard" replace />;
};

// Role-based component that renders different views based on user role
const RoleBasedJobOpenings = ({ children }) => {
  const { user, loading, isAdminOrRecruiter, isCandidate } = useAuth();
  const [adminComponent, candidateComponent] = children;

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminOrRecruiter()) {
    return adminComponent;
  }

  if (isCandidate()) {
    return candidateComponent;
  }

  return <Navigate to="/dashboard" replace />;
};

// Role-based component for Interviews section
const RoleBasedInterviews = () => {
  const { user, loading, isAdminOrRecruiter, isTechnicalInterviewer } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isTechnicalInterviewer()) {
    return <Interviews />;
  }

  if (isAdminOrRecruiter()) {
    return <RecruiterInterviews />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/complete-profile"
        element={
          <ProfileRoute>
            <CompleteProfile />
          </ProfileRoute>
        }
      />
      {/* Embedded Interview Meeting - Full screen, no layout */}
      <Route
        path="/interview/:interviewId/meeting"
        element={
          <ProtectedRoute>
            <EmbeddedInterviewMeeting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard/*" element={<Dashboard />} />
        {/* Job Openings Routes - Role-based routing */}
        <Route
          path="job-openings"
          element={
            <RoleBasedJobOpenings>
              <JobOpenings />
              <JobListings />
            </RoleBasedJobOpenings>
          }
        />
        <Route
          path="job-openings/create"
          element={
            <AdminRecruiterRoute>
              <JobOpeningForm />
            </AdminRecruiterRoute>
          }
        />
        <Route
          path="job-openings/edit/:id"
          element={
            <AdminRecruiterRoute>
              <JobOpeningForm />
            </AdminRecruiterRoute>
          }
        />
        <Route
          path="job-openings/:id"
          element={
            <CandidateRoute>
              <JobDetails />
            </CandidateRoute>
          }
        />
        <Route
          path="screening"
          element={
            <AdminRecruiterRoute>
              <Screening />
            </AdminRecruiterRoute>
          }
        />
        <Route
          path="screening/candidate/:candidateId"
          element={
            <AdminRecruiterRoute>
              <CandidateProfileView />
            </AdminRecruiterRoute>
          }
        />
        <Route path="users" element={<UserManagement />} />
        <Route
          path="interview-management"
          element={<RoleBasedInterviewManagement />}
        />
        <Route
          path="technical-round"
          element={<RoleBasedInterviewManagement />}
        />
        <Route
          path="hr-round"
          element={<RoleBasedInterviewManagement />}
        />
        <Route
          path="interviews"
          element={<RoleBasedInterviews />}
        />
        <Route
          path="my-applications"
          element={
            <CandidateRoute>
              <MyApplications />
            </CandidateRoute>
          }
        />
        <Route
          path="upcoming-interviews"
          element={
            <CandidateRoute>
              <UpcomingInterviews />
            </CandidateRoute>
          }
        />
        <Route
          path="proctored-interview/:interviewId"
          element={
            <CandidateRoute>
              <ProctoredInterview />
            </CandidateRoute>
          }
        />
        {/* Offer Routes - Admin/Recruiter */}
        <Route
          path="offers/generate"
          element={
            <AdminRecruiterRoute>
              <GenerateOffer />
            </AdminRecruiterRoute>
          }
        />
        <Route
          path="offers/management"
          element={
            <AdminRecruiterRoute>
              <OfferManagement />
            </AdminRecruiterRoute>
          }
        />
        {/* Offer Routes - Candidate */}
        <Route
          path="my-offers"
          element={
            <CandidateRoute>
              <MyOffers />
            </CandidateRoute>
          }
        />
        <Route
          path="my-offers/:id"
          element={
            <CandidateRoute>
              <OfferDetails />
            </CandidateRoute>
          }
        />
        <Route path="my-profile" element={<MyProfile />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route
          path="notifications"
          element={
            <CandidateRoute>
              <Notifications />
            </CandidateRoute>
          }
        />
        <Route
          path="email-templates"
          element={
            <AdminRecruiterRoute>
              <EmailTemplatePreview />
            </AdminRecruiterRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRouter;

