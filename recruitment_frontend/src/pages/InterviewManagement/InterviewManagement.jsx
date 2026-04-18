import { useState, useEffect } from 'react';
import { interviewService } from '../../api/interviewService';
import { FiUsers, FiUserPlus, FiSearch, FiX, FiCalendar, FiClock, FiBriefcase, FiCode, FiMail, FiPhone, FiAward, FiLoader } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const InterviewManagement = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showIndividualAssignModal, setShowIndividualAssignModal] = useState(false);
  const [selectedCandidateForAssign, setSelectedCandidateForAssign] = useState(null);
  const [individualSelectedInterviewer, setIndividualSelectedInterviewer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assigningIndividual, setAssigningIndividual] = useState(false);
  const [activeTab, setActiveTab] = useState('unassigned');
  const [selectedJobTitle, setSelectedJobTitle] = useState(null);

  // Modal States
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    isLoading: false,
    onConfirm: () => { }
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onOk: () => { }
  });

  const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  const closeSuccess = () => setSuccessModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [candidatesData, interviewersData] = await Promise.all([
        interviewService.getShortlistedCandidates(),
        interviewService.getTechnicalInterviewers(),
      ]);
      setCandidates(candidatesData || []);
      setInterviewers(interviewersData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = () => {
    setShowAssignModal(true);
    setSelectedCandidates([]);
    setSelectedInterviewer('');
    setSearchTerm('');
  };

  const handleCandidateToggle = (candidate) => {
    setSelectedCandidates((prev) => {
      const exists = prev.find((c) => c.jobApplicationId === candidate.jobApplicationId);
      if (exists) {
        return prev.filter((c) => c.jobApplicationId !== candidate.jobApplicationId);
      } else {
        return [...prev, candidate];
      }
    });
  };

  const initiateAssign = () => {
    if (!selectedInterviewer || selectedCandidates.length === 0) {
      showToast('Please select an interviewer and at least one candidate', 'error');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Bulk Assignment',
      message: `Are you sure you want to assign this interviewer to ${selectedCandidates.length} candidate(s)?`,
      confirmText: 'Assign All',
      type: 'primary',
      isLoading: false,
      onConfirm: executeAssign
    });
  };

  const executeAssign = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setAssigning(true);

      const candidateApplicationIds = selectedCandidates.map((c) => c.jobApplicationId);
      await interviewService.assignInterviewer(selectedInterviewer, candidateApplicationIds);

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Assignment Complete',
        message: `Successfully assigned interviewer to ${selectedCandidates.length} candidate(s).`,
        onOk: () => {
          closeSuccess();
          setShowAssignModal(false);
          setSelectedCandidates([]);
          setSelectedInterviewer('');
          fetchData();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error assigning interviewer:', err);
      showToast(err.response?.data?.message || 'Failed to assign interviewer', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleIndividualAssignClick = (candidate) => {
    setSelectedCandidateForAssign(candidate);
    setIndividualSelectedInterviewer('');
    setShowIndividualAssignModal(true);
  };

  const initiateIndividualAssign = () => {
    if (!individualSelectedInterviewer || !selectedCandidateForAssign) {
      showToast('Please select an interviewer', 'error');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Assignment',
      message: `Are you sure you want to assign this interviewer to ${selectedCandidateForAssign.candidateName}?`,
      confirmText: 'Assign',
      type: 'primary',
      isLoading: false,
      onConfirm: executeIndividualAssign
    });
  };

  const executeIndividualAssign = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setAssigningIndividual(true);

      await interviewService.assignInterviewer(
        individualSelectedInterviewer,
        [selectedCandidateForAssign.jobApplicationId]
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Assignment Complete',
        message: 'Interviewer assigned successfully.',
        onOk: () => {
          closeSuccess();
          setShowIndividualAssignModal(false);
          setSelectedCandidateForAssign(null);
          setIndividualSelectedInterviewer('');
          fetchData();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error assigning interviewer:', err);
      showToast(err.response?.data?.message || 'Failed to assign interviewer', 'error');
    } finally {
      setAssigningIndividual(false);
    }
  };

  // Separate candidates into assigned and unassigned
  const assignedCandidates = candidates.filter(
    (candidate) => candidate.interviewerId !== null && candidate.interviewerId !== undefined
  );
  const unassignedCandidates = candidates.filter(
    (candidate) => candidate.interviewerId === null || candidate.interviewerId === undefined
  );

  // Get candidates for the active tab
  const activeCandidates = activeTab === 'assigned' ? assignedCandidates : unassignedCandidates;

  // Apply search filter to active tab's candidates
  // Calculate job stats
  const jobStats = candidates.reduce((acc, candidate) => {
    const title = candidate.jobTitle ? candidate.jobTitle.trim() : 'Unknown';
    if (!acc[title]) {
      acc[title] = { jobTitle: title, count: 0 };
    }
    acc[title].count++;
    return acc;
  }, {});
  const jobStatistics = Object.values(jobStats);

  const handleJobTitleClick = (jobTitle) => {
    if (selectedJobTitle === jobTitle) {
      setSelectedJobTitle(null);
    } else {
      setSelectedJobTitle(jobTitle);
    }
  };

  // Helper function to filter candidates
  const filterCandidates = (cands) => {
    return cands.filter((candidate) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        candidate.candidateName?.toLowerCase().includes(searchLower) ||
        candidate.candidateEmail?.toLowerCase().includes(searchLower) ||
        candidate.jobTitle?.toLowerCase().includes(searchLower)
      );

      // Job Filter Logic
      let matchesJob = true;
      if (selectedJobTitle) {
        const title = candidate.jobTitle ? candidate.jobTitle.trim() : 'Unknown';
        matchesJob = title === selectedJobTitle;
      }

      return matchesSearch && matchesJob;
    });
  };

  // Apply filters to both lists to get accurate counts for tabs
  const filteredAssignedCandidates = filterCandidates(assignedCandidates);
  const filteredUnassignedCandidates = filterCandidates(unassignedCandidates);

  // Get the candidates to display based on active tab
  const filteredCandidates = activeTab === 'assigned' ? filteredAssignedCandidates : filteredUnassignedCandidates;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600 mt-1">
                <FiCode className="text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Technical Round</h1>
                <p className="text-sm text-gray-500 mt-0.5">Assign technical interviewers to candidates</p>
              </div>
            </div>

            {/* Right: Quick Stats & Action Button */}
            {!loading && (
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-8 w-full sm:w-auto">
                <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:items-center sm:gap-6 text-sm">
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none">
                    <span className="text-gray-500 font-medium text-[10px] sm:text-xs uppercase tracking-wider">Total</span>
                    <span className="font-bold text-gray-900 text-lg leading-none">{candidates.length}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0 bg-blue-50 sm:bg-transparent rounded-lg sm:rounded-none">
                    <span className="text-blue-600 font-medium text-[10px] sm:text-xs uppercase tracking-wider">Assigned</span>
                    <span className="font-bold text-blue-700 text-lg leading-none">{assignedCandidates.length}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0 bg-amber-50 sm:bg-transparent rounded-lg sm:rounded-none">
                    <span className="text-amber-600 font-medium text-[10px] sm:text-xs uppercase tracking-wider">Unassigned</span>
                    <span className="font-bold text-amber-700 text-lg leading-none">{unassignedCandidates.length}</span>
                  </div>
                </div>
                <button
                  onClick={handleAssignClick}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md transition-all w-full sm:w-auto"
                >
                  <FiUserPlus className="w-5 h-5" />
                  Assign Interviewer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Job Title Filter Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications by Job Title</h2>
          {jobStatistics.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {jobStatistics.map((stat) => (
                  <button
                    key={stat.jobTitle}
                    onClick={() => handleJobTitleClick(stat.jobTitle)}
                    className={`group relative bg-white rounded-xl border-2 p-6 text-left transition-all duration-200 ${selectedJobTitle === stat.jobTitle
                      ? 'border-blue-500 shadow-lg shadow-blue-100 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                  >
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 transition-colors ${selectedJobTitle === stat.jobTitle
                      ? 'bg-blue-100'
                      : 'bg-gray-100 group-hover:bg-blue-50'
                      }`}>
                      <FiBriefcase className={`text-xl ${selectedJobTitle === stat.jobTitle ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                        }`} />
                    </div>

                    {/* Job Title */}
                    <h3 className="text-base font-semibold text-gray-900 mb-1 truncate" title={stat.jobTitle}>
                      {stat.jobTitle}
                    </h3>

                    {/* Application Count */}
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${selectedJobTitle === stat.jobTitle ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                        {stat.count}
                      </span>
                      <span className="text-sm text-gray-500">
                        {stat.count === 1 ? 'candidate' : 'candidates'}
                      </span>
                    </div>

                    {/* Active Indicator */}
                    {selectedJobTitle === stat.jobTitle && (
                      <div className="absolute top-4 right-4">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedJobTitle && (
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedJobTitle(null)}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <span>Clear filter: {selectedJobTitle}</span>
                    <FiX className="text-lg" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiBriefcase className="text-3xl text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No job statistics available</p>
              <p className="text-sm text-gray-500">Statistics will appear when candidates are available</p>
            </div>
          )}
        </div>
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="flex gap-1 p-1">
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 font-medium text-xs sm:text-sm transition-colors relative rounded-lg ${activeTab === 'unassigned'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Unassigned Candidates
              <span
                className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${activeTab === 'unassigned'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                {filteredUnassignedCandidates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 font-medium text-xs sm:text-sm transition-colors relative rounded-lg ${activeTab === 'assigned'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Assigned Candidates
              <span
                className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${activeTab === 'assigned'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                {filteredAssignedCandidates.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search candidates by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Candidates List */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              {activeTab === 'unassigned'
                ? 'No unassigned candidates found'
                : 'No assigned candidates found'}
            </p>
            <p className="text-gray-400 text-sm">
              {activeTab === 'unassigned'
                ? 'All candidates have been assigned to technical interviewers'
                : 'No candidates have been assigned yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.jobApplicationId}
                className={`bg-white rounded-r-xl rounded-l-md border border-gray-200 p-6 transition-all duration-200 border-l-[4px] ${activeTab === 'assigned'
                  ? 'border-l-blue-500 shadow-sm hover:shadow-md'
                  : 'border-l-amber-500 shadow-md hover:shadow-xl hover:border-blue-300 transform hover:-translate-y-0.5'
                  }`}
              >
                {/* Header: Name + Status */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {candidate.candidateName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Applied for:</span> {candidate.jobTitle}
                    </p>
                  </div>
                  {candidate.interviewerName && (
                    <div className="flex items-center gap-3 ml-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border bg-blue-50 text-blue-700 border-blue-200">
                        <FiUsers className="text-sm" />
                        Assigned
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FiMail className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                      <p className="text-sm font-medium text-gray-900">{candidate.candidateEmail}</p>
                    </div>
                  </div>
                  {candidate.interviewerName && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FiUsers className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Interviewer</p>
                        <p className="text-sm font-medium text-gray-900">{candidate.interviewerName}</p>
                        <p className="text-xs text-gray-500">{candidate.interviewerEmail}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button for Unassigned Candidates */}
                {!candidate.interviewerName && activeTab === 'unassigned' && (
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleIndividualAssignClick(candidate)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                    >
                      <FiUserPlus className="text-base" />
                      Assign Interviewer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Individual Assign Interviewer Modal */}
        {showIndividualAssignModal && selectedCandidateForAssign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Assign Interviewer</h2>
                  <button
                    onClick={() => {
                      setShowIndividualAssignModal(false);
                      setSelectedCandidateForAssign(null);
                      setIndividualSelectedInterviewer('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <p><strong>Candidate:</strong> {selectedCandidateForAssign.candidateName}</p>
                  <p><strong>Job Title:</strong> {selectedCandidateForAssign.jobTitle}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Interviewer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={individualSelectedInterviewer}
                    onChange={(e) => setIndividualSelectedInterviewer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an interviewer...</option>
                    {interviewers.map((interviewer) => (
                      <option key={interviewer.id} value={interviewer.id}>
                        {interviewer.name} ({interviewer.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowIndividualAssignModal(false);
                    setSelectedCandidateForAssign(null);
                    setIndividualSelectedInterviewer('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateIndividualAssign}
                  disabled={assigningIndividual || !individualSelectedInterviewer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {assigningIndividual ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Interviewer Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Assign Interviewer</h2>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Interviewer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedInterviewer}
                    onChange={(e) => setSelectedInterviewer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an interviewer...</option>
                    {interviewers.map((interviewer) => (
                      <option key={interviewer.id} value={interviewer.id}>
                        {interviewer.name} ({interviewer.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Candidates <span className="text-red-500">*</span>
                  </label>
                  {unassignedCandidates.length === 0 ? (
                    <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="text-center">
                        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium mb-1">
                          All candidates have been assigned
                        </p>
                        <p className="text-sm text-gray-500">
                          All candidates have been assigned to technical interviewers. No candidates are available for assignment at this time.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {unassignedCandidates
                          .filter((candidate) => {
                            const searchLower = searchTerm.toLowerCase();
                            return (
                              candidate.candidateName?.toLowerCase().includes(searchLower) ||
                              candidate.candidateEmail?.toLowerCase().includes(searchLower) ||
                              candidate.jobTitle?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((candidate) => {
                            const isSelected = selectedCandidates.some(
                              (c) => c.jobApplicationId === candidate.jobApplicationId
                            );
                            return (
                              <div
                                key={candidate.jobApplicationId}
                                className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                                  ? 'bg-blue-50 border-blue-500'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                                onClick={() => handleCandidateToggle(candidate)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {candidate.candidateName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {candidate.jobTitle} • {candidate.candidateEmail}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleCandidateToggle(candidate)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {selectedCandidates.length} candidate(s) selected
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateAssign}
                  disabled={assigning || !selectedInterviewer || selectedCandidates.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={closeConfirmation}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmText={confirmationModal.confirmText}
          cancelText={confirmationModal.cancelText}
          type={confirmationModal.type}
          isLoading={confirmationModal.isLoading}
        />

        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={successModal.onOk}
          title={successModal.title}
          message={successModal.message}
          buttonText="OK"
        />
      </div>
    </div>
  );
};

export default InterviewManagement;
