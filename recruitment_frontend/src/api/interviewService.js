import apiClient from './apiClient';

export const interviewService = {
  // Get shortlisted candidates (Admin/Recruiter)
  getShortlistedCandidates: async () => {
    const response = await apiClient.get('/recruitment/interviews/shortlisted-candidates');
    return response.data;
  },

  // Assign interviewer to candidates (Admin/Recruiter)
  assignInterviewer: async (interviewerId, candidateApplicationIds) => {
    const response = await apiClient.post('/recruitment/interviews/assign-interviewer', {
      interviewerId,
      candidateApplicationIds,
    });
    return response.data;
  },

  // Get assigned candidates (Technical Interviewer)
  getMyAssignedCandidates: async () => {
    const response = await apiClient.get('/recruitment/interviews/my-assigned-candidates');
    return response.data;
  },

  // Schedule interview (Technical Interviewer)
  scheduleInterview: async (interviewAssignmentIds, interviewDate, interviewTime, notes) => {
    const response = await apiClient.post('/recruitment/interviews/schedule', {
      interviewAssignmentIds,
      interviewDate,
      interviewTime,
      notes,
    });
    return response.data;
  },

  // Get upcoming interviews (Candidate)
  getMyUpcomingInterviews: async () => {
    const response = await apiClient.get('/recruitment/interviews/my-upcoming-interviews');
    return response.data;
  },

  // Get all technical interviewers (for dropdown)
  getTechnicalInterviewers: async () => {
    const response = await apiClient.get('/recruitment/interviews/technical-interviewers');
    return response.data;
  },

  // Get all recruiters (for dropdown)
  getRecruiters: async () => {
    const response = await apiClient.get('/recruitment/interviews/recruiters');
    return response.data;
  },

  // Reschedule interview (Technical Interviewer)
  rescheduleInterview: async (interviewId, interviewDate, interviewTime) => {
    const response = await apiClient.put(`/recruitment/interviews/${interviewId}/reschedule`, {
      interviewDate,
      interviewTime,
    });
    return response.data;
  },

  // Get candidate details (Technical Interviewer)
  getCandidateDetails: async (jobApplicationId) => {
    const response = await apiClient.get(`/recruitment/interviews/candidate/${jobApplicationId}/details`);
    return response.data;
  },

  // Get scheduled interviews (Technical Interviewer)
  getMyScheduledInterviews: async () => {
    const response = await apiClient.get('/recruitment/interviews/my-scheduled-interviews');
    return response.data;
  },

  // Get scheduled HR interviews (Recruiter/Admin)
  getMyHRInterviews: async (search = '', status = 'All', page = 0, size = 10) => {
    const response = await apiClient.get('/recruitment/interviews/my-hr-interviews', {
      params: { search, status, page, size }
    });
    return response.data;
  },

  // Get all scheduled technical interviews (Recruiter/Admin)
  getAllTechnicalInterviews: async (search = '', page = 0, size = 10) => {
    const response = await apiClient.get('/recruitment/interviews/all-technical-interviews', {
      params: { search, page, size }
    });
    return response.data;
  },

  // Generate Meet link for an interview (Technical Interviewer)
  generateMeetLink: async (interviewId) => {
    const response = await apiClient.post(`/recruitment/interviews/${interviewId}/generate-meet-link`);
    return response.data;
  },

  // Submit technical round result (Technical Interviewer)
  submitTechnicalResult: async (interviewId, result, remarks, assignedRecruiterId = null) => {
    const response = await apiClient.post(`/recruitment/interviews/${interviewId}/submit-result`, {
      result,
      remarks,
      assignedRecruiterId,
    });
    return response.data;
  },

  // Get candidates in Technical Round (Technical Interviewer)
  getTechnicalRoundCandidates: async () => {
    const response = await apiClient.get('/recruitment/interviews/technical-round');
    return response.data;
  },

  // Get candidates in HR Round (Recruiter/Admin)
  getHRRoundCandidates: async () => {
    const response = await apiClient.get('/recruitment/interviews/hr-round');
    return response.data;
  },

  // Schedule HR Round interview (Recruiter/Admin)
  scheduleHRInterview: async (candidateApplicationIds, interviewDate, interviewTime, notes) => {
    const response = await apiClient.post('/recruitment/interviews/hr-round/schedule', {
      candidateApplicationIds,
      interviewDate,
      interviewTime,
      notes,
    });
    return response.data;
  },

  // Log proctoring violation (Candidate)
  logProctoringViolation: async (interviewId, violationType, description, timestamp) => {
    const response = await apiClient.post('/recruitment/interviews/proctoring-violations', {
      interviewId,
      violationType,
      description,
      timestamp,
    });
    return response.data;
  },

  // Get proctoring violations for an interview (Technical Interviewer)
  getProctoringViolations: async (interviewId) => {
    const response = await apiClient.get(`/recruitment/interviews/${interviewId}/proctoring-violations`);
    return response.data;
  },

  // Update HR Round result (Admin/Recruiter)
  updateHRResult: async (interviewId, result) => {
    const response = await apiClient.put(`/recruitment/interviews/${interviewId}/hr-result`, {
      result,
    });
    return response.data;
  },

  // Check if interviewer is present in meeting (Candidate)
  isInterviewerPresent: async (interviewId) => {
    const response = await apiClient.get(`/recruitment/interviews/${interviewId}/interviewer-present`);
    return response.data;
  },
};

