import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { candidateJobService } from '../../api/candidateJobService';
import { interviewService } from '../../api/interviewService';
import {
    FiBriefcase,
    FiCalendar,
    FiClock,
    FiCheckCircle,
    FiLoader,
    FiFileText,
    FiVideo,
    FiUser,
    FiChevronDown,
    FiX
} from 'react-icons/fi';

const CandidateDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [upcomingInterviews, setUpcomingInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [interviewerPresence, setInterviewerPresence] = useState(new Map()); // Track interviewer presence for each interview

    // --- Helper Logic for Scoring Applications (reused) ---
    const scoreApp = (app) => {
        if (app.status === 'REJECTED' || app.status === 'WITHDRAWN') return -100;
        let score = 0;
        if (app.status === 'ACCEPTED' || app.status === 'OFFER_RELEASED') score += 50;
        else if (app.interviewRound === 'HR') score += 40;
        else if (app.interviewRound === 'TECHNICAL') score += 30;
        else if (app.status === 'SHORTLISTED') score += 20;
        else if (app.status === 'REVIEWING' || app.status === 'PENDING') score += 10;
        return score;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [appsData, interviewsData] = await Promise.all([
                    candidateJobService.getMyApplications(),
                    interviewService.getMyUpcomingInterviews()
                ]);

                const apps = appsData || [];
                setApplications(apps);
                setUpcomingInterviews(interviewsData || []);

                // Determine default selected app
                if (apps.length > 0) {
                    const sorted = [...apps].sort((a, b) => {
                        const scoreA = scoreApp(a);
                        const scoreB = scoreApp(b);
                        if (scoreA !== scoreB) return scoreB - scoreA;
                        return new Date(b.updatedAt) - new Date(a.updatedAt);
                    });
                    setSelectedAppId(sorted[0].id);
                }

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Poll for interviewer presence for upcoming interviews
    useEffect(() => {
        if (upcomingInterviews.length === 0) return;

        const checkPresence = async () => {
            const presenceMap = new Map();
            for (const interview of upcomingInterviews) {
                try {
                    const isPresent = await interviewService.isInterviewerPresent(interview.id);
                    presenceMap.set(interview.id, isPresent);
                } catch (err) {
                    console.error(`Error checking presence for interview ${interview.id}:`, err);
                    presenceMap.set(interview.id, false);
                }
            }
            setInterviewerPresence(presenceMap);
        };

        // Check immediately
        checkPresence();

        // Poll every 5 seconds
        const interval = setInterval(checkPresence, 5000);

        return () => clearInterval(interval);
    }, [upcomingInterviews]);

    const selectedApp = applications.find(a => a.id === selectedAppId) || null;

    const getDisplayName = () => {
        if (user?.firstName) return user.firstName;
        if (user?.fullName) return user.fullName; // Fallback to full name if first name missing
        return 'Candidate';
    };

    const displayName = getDisplayName();

    /**
     * Determines the current step in the recruitment journey based on explicit stage statuses.
     * Each stage (Screening, Technical, HR, Offer) has its own independent status.
     * Returns the highest step number that is currently active or completed.
     */
    const getJourneyStep = (app) => {
        if (!app) return 0;

        // Step 5: Offer - Check offer status
        if (app.offerStatus && app.offerStatus !== 'PENDING') {
            return 5; // Offer stage is active
        }

        // Step 4: HR Round - Check HR status
        if (app.hrStatus && app.hrStatus !== 'PENDING') {
            return 4; // HR stage is active
        }

        // Step 3: Technical Round - Check technical status
        if (app.technicalStatus && app.technicalStatus !== 'PENDING') {
            return 3; // Technical stage is active
        }

        // Step 2: Screening - Check screening status
        if (app.screeningStatus && app.screeningStatus !== 'PENDING') {
            return 2; // Screening stage is active
        }

        // Step 1: Applied - Default state
        return 1;
    };

    const currentStep = getJourneyStep(selectedApp);

    /**
     * Determines the visual status of each step based on independent stage statuses.
     * Returns: 'completed', 'current', 'upcoming', or 'rejected'
     */
    const getStepStatus = (stepId, app) => {
        if (!app) return 'upcoming';

        // Map step IDs to their corresponding status fields
        const statusMap = {
            1: 'PASSED', // Applied is always completed if we have an application
            2: app.screeningStatus,
            3: app.technicalStatus,
            4: app.hrStatus,
            5: app.offerStatus
        };

        const stepStatus = statusMap[stepId];

        // Step 1 (Applied) is always completed
        if (stepId === 1) return 'completed';

        // Check if this stage is completed (PASSED or ACCEPTED)
        if (stepStatus === 'PASSED' || stepStatus === 'ACCEPTED' || stepStatus === 'SENT') {
            return 'completed';
        }

        // Check if this stage is rejected
        if (stepStatus === 'REJECTED') {
            return 'rejected';
        }

        // Check if this is the current active step
        if (stepId === currentStep) {
            return 'current';
        }

        // Otherwise, it's upcoming
        return 'upcoming';
    };

    const steps = [
        { id: 1, label: 'Applied' },
        { id: 2, label: 'Screening' },
        { id: 3, label: 'Technical' },
        { id: 4, label: 'HR Round' },
        { id: 5, label: 'Offer' }
    ];

    // --- Logic for Summary Cards (Global Stats, not just selected app) ---
    const activeAppsCount = applications.filter(a => a.status !== 'REJECTED' && a.status !== 'WITHDRAWN').length;

    // Filter interviews
    const pendingInterviewsList = upcomingInterviews.filter(i => !i.interviewResult && i.status !== 'COMPLETED');
    const completedInterviewsList = upcomingInterviews.filter(i => i.interviewResult || i.status === 'COMPLETED');

    const upcomingInterviewsCount = pendingInterviewsList.length;
    const completedInterviewsCount = completedInterviewsList.length;

    // Status text based on SELECTED app
    const applicationStatusLabel = selectedApp ?
        (selectedApp.status === 'ACCEPTED' ? 'Offer Received' :
            selectedApp.interviewRound === 'HR' ? 'In HR Round' :
                selectedApp.interviewRound === 'TECHNICAL' ? 'In Technical Round' :
                    selectedApp.status === 'SHORTLISTED' ? 'Shortlisted' :
                        selectedApp.status === 'REVIEWING' ? 'In Review' : 'Pending')
        : 'No Selection';


    // --- Helper renders ---
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <FiLoader className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            {/* 1. Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

                    </div>
                    <p className="text-gray-500 font-semibold">Track your recruitment progress and upcoming interviews</p>
                </div>
                <div className="flex items-center gap-4 hidden md:flex">
                    <div className="text-right max-w-[200px]">
                        <p className="text-sm text-gray-400 font-semibold">Welcome back,</p>
                        <p className="font-semibold text-gray-700 truncate" title={displayName}>
                            {displayName}
                        </p>
                    </div>
                    {/* Placeholder Avatar if needed, or simple initial */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {displayName.charAt(0)}
                    </div>
                </div>
            </div>

            {/* 2. Recruitment Journey */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-gray-900">Recruitment Journey</h2>

                            {/* Job Selector Dropdown */}
                            {applications.length > 1 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                        Change Role <FiChevronDown className={`transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                                    </button>

                                    {/* Backdrop to close dropdown when clicking outside */}
                                    {isDropdownOpen && (
                                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                    )}

                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-100 shadow-lg rounded-lg py-1 z-50">
                                            {applications.map(app => (
                                                <button
                                                    key={app.id}
                                                    onClick={() => {
                                                        setSelectedAppId(app.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate ${selectedAppId === app.id ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                                                >
                                                    {app.jobTitle}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 mt-4 font-semibold">
                            {selectedApp
                                ? <>Progress for <span className="font-semibold text-gray-700">{selectedApp.jobTitle}</span> at {selectedApp.companyName}</>
                                : 'Select an active application to view progress'}
                        </p>
                    </div>

                    {selectedApp && (
                        <span className={`self-start md:self-center px-3 py-1 rounded-full text-xs font-semibold 
               ${selectedApp.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                selectedApp.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-50 text-blue-700'}
             `}>
                            {selectedApp.status}
                        </span>
                    )}
                </div>

                {/* Stepper */}
                <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
                    <div className="relative flex items-center justify-between w-full max-w-5xl mx-auto mt-4 min-w-[500px] sm:min-w-0">
                        {/* Connecting Lines Layer */}
                        <div className="absolute top-5 left-0 w-full flex items-center justify-between px-8 -z-10 h-0.5">
                            {steps.slice(0, -1).map((step, index) => {
                                // Line is active if the NEXT step is current or completed (meaning we have traversed this path)
                                // Example: Step 1->2. If Current is 2, path 1->2 is active.
                                // If Current is 1, path 1->2 is inactive.
                                const isLineActive = (index + 2) <= currentStep;

                                return (
                                    <div
                                        key={`line-${index}`}
                                        className={`flex-1 h-0.5 transition-all duration-500 mx-2
                         ${isLineActive ? 'bg-green-500' : 'bg-gray-200'}
                       `}
                                    ></div>
                                );
                            })}
                        </div>

                        {steps.map((step) => {
                            const status = getStepStatus(step.id, selectedApp);

                            return (
                                <div key={step.id} className="flex flex-col items-center group relative bg-white px-2">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                        ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : ''}
                        ${status === 'current' ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : ''}
                        ${status === 'upcoming' ? 'bg-white border-gray-300 text-gray-400' : ''}
                        ${status === 'rejected' ? 'bg-red-500 border-red-500 text-white' : ''}
                      `}
                                    >
                                        {status === 'completed' ? (
                                            <FiCheckCircle className="text-xl" />
                                        ) : status === 'rejected' ? (
                                            <FiX className="text-xl" />
                                        ) : (
                                            <span className="font-bold text-sm">{step.id}</span>
                                        )}
                                    </div>
                                    <span
                                        className={`mt-3 text-xs sm:text-sm font-medium transition-colors duration-300 absolute top-12 whitespace-nowrap
                        ${status === 'completed' ? 'text-green-600' : ''}
                        ${status === 'current' ? 'text-blue-600 font-bold' : ''}
                        ${status === 'upcoming' ? 'text-gray-400' : ''}
                        ${status === 'rejected' ? 'text-red-600' : ''}
                      `}
                                    >
                                        {step.label}
                                    </span>
                                    <div className="h-6 w-full"></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="h-6"></div>
            </div>

            {/* 3. Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Applications */}
                <div
                    onClick={() => navigate('/my-applications')}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-blue-600 transition-colors">Active Applications</p>
                        <h3 className="text-3xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{activeAppsCount}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <FiBriefcase className="text-2xl" />
                    </div>
                </div>

                {/* Upcoming Interviews */}
                <div
                    onClick={() => navigate('/upcoming-interviews')}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                >
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-purple-600 transition-colors">Upcoming Interviews</p>
                        <h3 className="text-3xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{upcomingInterviewsCount}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <FiCalendar className="text-2xl" />
                    </div>
                </div>

                {/* Completed Interviews */}
                <div
                    onClick={() => navigate('/upcoming-interviews?tab=completed')}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                >
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-green-600 transition-colors">Completed Interviews</p>
                        <h3 className="text-3xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">{completedInterviewsCount}</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-100 transition-colors">
                        <FiCheckCircle className="text-2xl" />
                    </div>
                </div>

                {/* Application Status (Relative to Selected App) */}
                <div
                    onClick={() => navigate('/my-applications')}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
                >
                    <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-amber-600 transition-colors">Selected App Status</p>
                        <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-amber-700 transition-colors" title={applicationStatusLabel}>
                            {applicationStatusLabel}
                        </h3>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-amber-600 flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                        <FiFileText className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 4. Recent Applications List */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Recent Applications</h2>
                            {applications.length > 0 && (
                                <a href="/my-applications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</a>
                            )}
                        </div>

                        <div className="flex-1 p-2">
                            {applications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center">
                                    <FiBriefcase className="mx-auto text-4xl mb-3 text-gray-300" />
                                    No applications yet
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {applications.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4).map((app) => (
                                        <div key={app.id}
                                            onClick={() => setSelectedAppId(app.id)}
                                            className={`p-4 rounded-lg transition-colors flex items-center justify-between group cursor-pointer 
                                                ${selectedAppId === app.id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-semibold text-base truncate transition-colors ${selectedAppId === app.id ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                                                    {app.jobTitle}
                                                </h4>
                                                <p className="text-sm text-gray-500 mb-2">{app.companyName}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    {app.interviewRound && (
                                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                                                            <FiClock className="w-3 h-3" />
                                                            {app.interviewRound === 'TECHNICAL' ? 'Technical Round' : app.interviewRound === 'HR' ? 'HR Round' : 'Interview'}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {formatDate(app.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border
                          ${app.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        app.status === 'SHORTLISTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-yellow-50 text-yellow-700 border-yellow-200'}
                        `}>
                                                    {app.status === 'REVIEWING' ? 'In Review' : app.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Upcoming Interviews */}
                <div className="lg:col-span-1 flex flex-col">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Upcoming Interviews</h2>
                            {pendingInterviewsList.length > 0 && (
                                <a href="/upcoming-interviews" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</a>
                            )}
                        </div>

                        <div className="p-4 flex-1">
                            {pendingInterviewsList.length === 0 ? (
                                <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center p-8">
                                    <FiCalendar className="mx-auto text-4xl mb-3 text-gray-300" />
                                    No scheduled interviews
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingInterviewsList.slice(0, 3).map((interview) => (
                                        <div key={interview.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${interview.interviewRound === 'TECHNICAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                        `}>
                                                    {interview.interviewRound === 'TECHNICAL' ? 'Technical' : 'HR Round'}
                                                </span>

                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="WebRTC Ready"></div>
                                            </div>

                                            <h4 className="font-bold text-gray-900 text-sm mb-1">{interview.jobTitle}</h4>
                                            <div className="text-xs text-gray-500 mb-4">{user?.companyName || 'WorkSphere India'}</div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <FiCalendar className="text-gray-400" />
                                                    <span className="font-medium">{formatDate(interview.interviewDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <FiClock className="text-gray-400" />
                                                    <span className="font-medium">{formatTime(interview.interviewTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <FiUser className="text-gray-400" />
                                                    <span className="truncate">{interview.interviewerName}</span>
                                                </div>                                            </div>

                                            {interviewerPresence.get(interview.id) ? (
                                                <button
                                                    onClick={() => window.open(`/interview/${interview.id}/meeting`, '_self')}
                                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FiVideo /> Join Meeting
                                                </button>
                                            ) : (
                                                <div className="w-full py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                                                    <FiUser className="text-gray-400" />
                                                    Interviewer has not joined yet
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDashboard;

