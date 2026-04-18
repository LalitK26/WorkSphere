import { screeningService } from './screeningService';
import { interviewService } from './interviewService';
import { jobOpeningService } from './jobOpeningService';
import offerService from './offerService';

export const adminDashboardService = {
  // Get all dashboard statistics
  // Get all dashboard statistics
  getDashboardStats: async () => {
    try {
      // Fetch all necessary data in parallel
      const [jobOpenings, applications, shortlistedCandidates, hrRoundCandidates, hrInterviews, technicalInterviewers, recruiters, jobStats, allOffers, technicalInterviewsData] = await Promise.all([
        jobOpeningService.getAllJobOpenings(0, 1000).then(res => res.content || []),
        screeningService.getAllApplications(0, 10000).then(res => res.content || []),
        interviewService.getShortlistedCandidates(),
        interviewService.getHRRoundCandidates(),
        interviewService.getMyHRInterviews('', 'All', 0, 1000).then(res => res.content || []),
        interviewService.getTechnicalInterviewers(),
        interviewService.getRecruiters(),
        jobOpeningService.getStatistics(),
        offerService.getAllOffers(0, 10000).then(res => res.content || []).catch(() => []),
        interviewService.getAllTechnicalInterviews('', 0, 1000).catch(() => ({ totalElements: 0 }))
      ]);

      // Calculate statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const isToday = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date.getTime() === today.getTime();
      };

      const isThisWeek = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date >= today && date < weekFromNow;
      };

      // Offers and Rejections
      const offersIssued = (allOffers || []).filter(offer => offer.status === 'SENT' || offer.status === 'CREATED');
      const offersAccepted = (allOffers || []).filter(offer => offer.status === 'ACCEPTED');
      const rejectedCandidates = (applications || []).filter(app => app.status === 'REJECTED').length;

      // Total active job openings
      const activeJobOpeningsCount = (jobOpenings || []).filter(job => job.status === 'ACTIVE').length;

      // Total applications
      const totalApplications = (applications || []).length;

      // Get technical interviews from shortlisted candidates
      const technicalInterviews = (shortlistedCandidates || []).filter(c =>
        c.interviewId && (c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED')
      );

      // Interviews today
      const hrInterviewsToday = (hrInterviews || []).filter(interview => {
        if (!interview.interviewDate) return false;
        const interviewDate = new Date(interview.interviewDate);
        interviewDate.setHours(0, 0, 0, 0);
        return interviewDate.getTime() === today.getTime() &&
          (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED');
      });

      const technicalInterviewsToday = technicalInterviews.filter(interview => {
        if (!interview.interviewDate) return false;
        const interviewDate = new Date(interview.interviewDate);
        interviewDate.setHours(0, 0, 0, 0);
        return interviewDate.getTime() === today.getTime();
      });

      const interviewsToday = hrInterviewsToday.length + technicalInterviewsToday.length;

      // Interviews this week
      const hrInterviewsThisWeek = (hrInterviews || []).filter(interview => {
        if (!interview.interviewDate) return false;
        const interviewDate = new Date(interview.interviewDate);
        interviewDate.setHours(0, 0, 0, 0);
        return interviewDate >= today && interviewDate < weekFromNow &&
          (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED');
      });

      const technicalInterviewsThisWeek = technicalInterviews.filter(interview => {
        if (!interview.interviewDate) return false;
        const interviewDate = new Date(interview.interviewDate);
        interviewDate.setHours(0, 0, 0, 0);
        return interviewDate >= today && interviewDate < weekFromNow;
      });

      const interviewsThisWeek = hrInterviewsThisWeek.length + technicalInterviewsThisWeek.length;

      // Calculate Technical Round Candidates
      const hrCandidateIds = new Set((hrRoundCandidates || []).map(c => c.jobApplicationId));
      let technicalRoundCount = 0;
      if (technicalInterviewsData && technicalInterviewsData.totalElements !== undefined) {
        technicalRoundCount = technicalInterviewsData.totalElements;
      } else if (technicalInterviewsData && Array.isArray(technicalInterviewsData.content)) {
        technicalRoundCount = technicalInterviewsData.content.length;
      } else if (Array.isArray(technicalInterviewsData)) {
        technicalRoundCount = technicalInterviewsData.length;
      }

      return {
        summaryCards: {
          totalJobOpenings: activeJobOpeningsCount,
          totalApplications: totalApplications,
          interviewsToday: interviewsToday,
          interviewsThisWeek: interviewsThisWeek,
          offersGenerated: offersIssued.length,
          finalSelected: offersAccepted.length,
          offersAccepted: offersAccepted.length,
          rejectedCandidates: rejectedCandidates,
          // Nested objects for compatibility if needed, though PrivateDashboard uses flat keys mostly now
          candidates: { total: totalApplications },
          jobOpenings: { total: activeJobOpeningsCount },
          interviews: { today: interviewsToday },
          offers: { total: offersIssued.length },
          hired: { total: offersAccepted.length }
        },
        hiringFlow: {
          applied: totalApplications,
          screening: {
            pending: (applications || []).filter(app => app.status === 'APPLIED' || app.status === 'PENDING').length,
            scheduled: 0,
            cleared: (shortlistedCandidates || []).length
          },
          technical: {
            scheduled: technicalRoundCount,
            cleared: (hrRoundCandidates || []).length
          },
          hrRound: {
            scheduled: (hrRoundCandidates || []).length,
            cleared: offersIssued.length
          },
          offer: {
            pending: offersIssued.length,
            accepted: offersAccepted.length
          },
          hired: offersAccepted.length,
          // Flattened 'total' object for getFunnelValue helper in PrivateDashboard
          total: {
            applied: totalApplications,
            shortlisted: (shortlistedCandidates || []).length,
            technical: technicalRoundCount,
            hrRound: (hrRoundCandidates || []).length,
            offer: offersIssued.length,
            joined: offersAccepted.length
          }
        },
        activeJobOpenings: (jobOpenings || []).filter(job => job.status === 'ACTIVE' || job.status === 'ON_HOLD').map(job => ({
          id: job.id,
          jobTitle: job.jobTitle,
          department: job.department,
          numberOfOpenings: job.numberOfOpenings ?? 0,
          currentStage: getCurrentStage(job, applications, shortlistedCandidates, hrRoundCandidates, hrInterviews),
          status: job.status
        })),
        userActivity: {
          activeRecruiters: (recruiters || []).length,
          activeTechnicalInterviewers: (technicalInterviewers || []).length,
          interviewsToday: interviewsToday,
          waitingForFeedback: getWaitingForFeedback(hrInterviews, shortlistedCandidates)
        },
        recentActivity: await getRecentActivity(applications, jobOpenings, hrInterviews, allOffers, shortlistedCandidates)
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
};

// Helper function to determine current stage of a job
function getCurrentStage(job, applications, shortlistedCandidates, hrRoundCandidates, hrInterviews) {
  const jobApplications = (applications || []).filter(app => app.jobOpeningId === job.id);

  if (jobApplications.length === 0) return 'No Applications';

  // Check if any are in HR round
  const hrCandidates = (hrRoundCandidates || []).filter(c =>
    jobApplications.some(app => app.id === c.jobApplicationId)
  );
  if (hrCandidates.length > 0) return 'HR Round';

  // Check if any are in technical round
  const techCandidates = (shortlistedCandidates || []).filter(c =>
    jobApplications.some(app => app.id === c.jobApplicationId)
  );
  if (techCandidates.length > 0) return 'Technical Round';

  // Check if any are shortlisted
  const shortlisted = jobApplications.filter(app => app.status === 'SHORTLISTED');
  if (shortlisted.length > 0) return 'Screening';

  return 'Applied';
}

// Helper function to get interviews waiting for feedback
function getWaitingForFeedback(hrInterviews, shortlistedCandidates) {
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let waitingCount = 0;

  // Check HR interviews completed but no result
  (hrInterviews || []).forEach(interview => {
    if (interview.status === 'COMPLETED' && !interview.result) {
      const completedDate = interview.completedAt ? new Date(interview.completedAt) : null;
      if (completedDate && completedDate < fortyEightHoursAgo) {
        waitingCount++;
      }
    }
  });

  // Check technical interviews completed but no result
  (shortlistedCandidates || []).forEach(candidate => {
    if (candidate.interviewStatus === 'COMPLETED' && !candidate.interviewResult) {
      const completedDate = candidate.interviewCompletedAt ? new Date(candidate.interviewCompletedAt) : null;
      if (completedDate && completedDate < fortyEightHoursAgo) {
        waitingCount++;
      }
    }
  });

  return waitingCount;
}

// Helper function to get recent activity
async function getRecentActivity(applications, jobOpenings, hrInterviews, offers, shortlistedCandidates) {
  const activities = [];

  // Recent job openings (sorted by created date)
  (jobOpenings || [])
    .sort((a, b) => new Date(b.createdAt || b.postedDate) - new Date(a.createdAt || a.postedDate))
    .slice(0, 5)
    .forEach(job => {
      activities.push({
        type: 'job_created',
        message: `New job opening created: ${job.jobTitle}`,
        timestamp: job.createdAt || job.postedDate,
        icon: 'briefcase'
      });
    });

  // Recent shortlistings
  (applications || [])
    .filter(app => app.status === 'SHORTLISTED')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .forEach(app => {
      activities.push({
        type: 'shortlisted',
        message: `${app.candidateName || app.candidate?.fullName || 'Candidate'} shortlisted for ${app.jobTitle || 'role'}`,
        timestamp: app.updatedAt,
        icon: 'check'
      });
    });

  // Recent HR interview scheduling
  (hrInterviews || [])
    .filter(i => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED')
    .sort((a, b) => new Date(b.createdAt || b.scheduledAt || b.interviewDate) - new Date(a.createdAt || a.scheduledAt || a.interviewDate))
    .slice(0, 5)
    .forEach(interview => {
      activities.push({
        type: 'interview_scheduled',
        message: `HR interview scheduled with ${interview.candidateName || 'candidate'}`,
        timestamp: interview.createdAt || interview.scheduledAt || interview.interviewDate,
        icon: 'calendar'
      });
    });

  // Recent technical interview scheduling
  (shortlistedCandidates || [])
    .filter(c => c.interviewId && (c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED'))
    .sort((a, b) => new Date(b.interviewDate || b.interviewScheduledAt) - new Date(a.interviewDate || a.interviewScheduledAt))
    .slice(0, 5)
    .forEach(candidate => {
      activities.push({
        type: 'interview_scheduled',
        message: `Technical interview scheduled with ${candidate.candidateName || candidate.candidate?.fullName || 'candidate'}`,
        timestamp: candidate.interviewDate || candidate.interviewScheduledAt,
        icon: 'calendar'
      });
    });

  // Recent offer generation
  (offers || [])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .forEach(offer => {
      activities.push({
        type: 'offer_generated',
        message: `Offer letter generated for ${offer.candidateName || offer.candidate?.fullName || 'candidate'}`,
        timestamp: offer.createdAt,
        icon: 'file'
      });
    });

  // Sort all activities by timestamp and return most recent 10
  return activities
    .filter(activity => activity.timestamp) // Filter out activities without timestamps
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(activity.timestamp)
    }));
}

// Helper function to format time ago
function getTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
}

// Helper: Check if date is today
function isToday(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// Helper: Check if date is within current week
function isThisWeek(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  return date >= weekStart && date <= weekEnd;
}
