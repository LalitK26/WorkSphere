import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../../api/interviewService';
import { FiX, FiCalendar, FiLink, FiVideo, FiCheckCircle, FiXCircle, FiUsers, FiMail, FiClock, FiLoader, FiSearch, FiFileText } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import Modal from '../../components/UI/Modal';

const HRRoundTab = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleModalTab, setScheduleModalTab] = useState('notScheduled');

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'primary',
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
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await interviewService.getHRRoundCandidates();
      setCandidates(data);
    } catch (err) {
      console.error('Error fetching HR round candidates:', err);
      showToast(err.response?.data?.message || 'Failed to load candidates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleClick = () => {
    setShowScheduleModal(true);
    setSelectedCandidates([]);
    setInterviewDate('');
    setInterviewTime('');
    setNotes('');
    setModalSearchTerm('');
    setScheduleModalTab('notScheduled');
  };

  const handleCandidateToggle = (candidateId) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const initiateScheduleInterview = () => {
    if (selectedCandidates.length === 0) {
      showToast('Please select at least one candidate', 'error');
      return;
    }
    if (!interviewDate || !interviewTime) {
      showToast('Please select interview date and time', 'error');
      return;
    }

    setShowScheduleModal(false);

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Schedule',
      message: `Are you sure you want to schedule interviews for ${selectedCandidates.length} candidate(s)?\nDate: ${interviewDate}\nTime: ${interviewTime}`,
      confirmText: 'Schedule',
      type: 'primary',
      isLoading: false,
      onConfirm: executeScheduleInterview
    });
  };

  const executeScheduleInterview = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      await interviewService.scheduleHRInterview(
        selectedCandidates,
        interviewDate,
        interviewTime,
        notes
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Scheduling Successful',
        message: 'HR interviews have been scheduled successfully!',
        onOk: () => {
          closeSuccess();
          setSelectedCandidates([]);
          setInterviewDate('');
          setInterviewTime('');
          setNotes('');
          fetchCandidates();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error scheduling interview:', err);
      showToast(err.response?.data?.message || 'Failed to schedule interview', 'error');
      setShowScheduleModal(true);
    }
  };

  const handleJoinMeeting = (interviewId) => {
    // Navigate to the built-in WebRTC video conferencing meeting page
    navigate(`/interview/${interviewId}/meeting`);
  };

  const initiateResultUpdate = (interviewId, result, candidateName) => {
    const isShortlist = result === 'SHORTLISTED';
    setConfirmationModal({
      isOpen: true,
      title: isShortlist ? 'Confirm Shortlist' : 'Confirm Rejection',
      message: `Are you sure you want to ${isShortlist ? 'shortlist' : 'reject'} ${candidateName}?${isShortlist ? '\n\nThis candidate will be marked as HR-shortlisted and will be available for offer generation.' : '\n\nThis candidate will be removed from the hiring pipeline.'}`,
      confirmText: isShortlist ? 'Shortlist' : 'Reject',
      type: isShortlist ? 'primary' : 'danger',
      isLoading: false,
      onConfirm: () => executeResultUpdate(interviewId, result)
    });
  };

  const executeResultUpdate = async (interviewId, result) => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      await interviewService.updateHRResult(interviewId, result);

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: result === 'SHORTLISTED' ? 'Candidate Shortlisted' : 'Candidate Rejected',
        message: `Candidate has been ${result === 'SHORTLISTED' ? 'shortlisted' : 'rejected'} successfully!`,
        onOk: () => {
          closeSuccess();
          fetchCandidates();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error updating HR result:', err);
      showToast(err.response?.data?.message || 'Failed to update result', 'error');
    }
  };

  const getResultBadge = (result) => {
    if (result === 'SHORTLISTED') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Passed
        </span>
      );
    } else if (result === 'REJECTED') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Rejected
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          Scheduled
        </span>
      );
    }
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate candidates for schedule modal
  const scheduledCandidates = candidates.filter(c =>
    c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'COMPLETED'
  );
  const notScheduledCandidates = candidates.filter(c =>
    !c.interviewStatus || (c.interviewStatus !== 'SCHEDULED' && c.interviewStatus !== 'COMPLETED')
  );

  // Filter candidates in modal based on search term and active tab
  const modalFilteredCandidates = (scheduleModalTab === 'notScheduled' ? notScheduledCandidates : scheduledCandidates).filter(candidate =>
    candidate.candidateName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    candidate.candidateEmail.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    candidate.jobTitle.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const scheduledCount = candidates.filter(c => c.interviewStatus === 'SCHEDULED').length;
  const completedCount = candidates.filter(c => c.interviewStatus === 'COMPLETED').length;
  const shortlistedCount = candidates.filter(c => c.result === 'SHORTLISTED').length;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600 mt-1">
                <FiUsers className="text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">HR Round</h1>
                <p className="text-sm text-gray-500 mt-0.5">Schedule and manage HR interviews</p>
              </div>
            </div>

            {/* Right: Quick Stats & Action Button */}
            {!loading && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 sm:gap-6 text-sm">
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                    <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">Total</span>
                    <span className="font-bold text-gray-900 text-lg leading-none">{candidates.length}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                    <span className="text-green-600 font-medium text-xs uppercase tracking-wider">Scheduled</span>
                    <span className="font-bold text-green-700 text-lg leading-none">{scheduledCount}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col items-center md:items-end p-2 sm:p-0">
                    <span className="text-blue-600 font-medium text-xs uppercase tracking-wider">Shortlisted</span>
                    <span className="font-bold text-blue-700 text-lg leading-none">{shortlistedCount}</span>
                  </div>
                </div>
                <button
                  onClick={handleScheduleClick}
                  className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 sm:gap-2 font-medium shadow-sm hover:shadow transition-all text-xs sm:text-sm"
                >
                  <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  Schedule Interview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              No candidates shortlisted for HR round yet
            </p>
            <p className="text-gray-400 text-sm">
              Candidates who pass the technical round will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates
              .slice()
              .sort((a, b) => {
                const getPriority = (status) => {
                  if (status === 'SCHEDULED') return 0;
                  if (status === 'COMPLETED') return 2;
                  return 1;
                };
                return getPriority(a.interviewStatus) - getPriority(b.interviewStatus);
              })
              .map((candidate) => {
                const borderColor = candidate.result === 'SHORTLISTED'
                  ? 'border-l-green-500'
                  : candidate.result === 'REJECTED'
                    ? 'border-l-red-500'
                    : candidate.interviewStatus === 'SCHEDULED' || candidate.interviewStatus === 'COMPLETED'
                      ? 'border-l-blue-500'
                      : 'border-l-amber-500';

                return (
                  <div
                    key={candidate.id}
                    className={`bg-white rounded-r-xl rounded-l-md border border-gray-200 p-6 transition-all duration-200 border-l-[4px] ${borderColor} shadow-sm hover:shadow-md`}
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
                      <div className="flex items-center gap-3 ml-4">
                        {getResultBadge(candidate.result)}
                        {candidate.interviewStatus && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${candidate.interviewStatus === 'SCHEDULED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : candidate.interviewStatus === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                            {candidate.interviewStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FiMail className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.candidateEmail}</p>
                        </div>
                      </div>
                      {candidate.interviewDate && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiCalendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Date</p>
                            <p className="text-sm font-medium text-gray-900">{candidate.interviewDate}</p>
                          </div>
                        </div>
                      )}
                      {candidate.interviewTime && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <FiClock className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Time</p>
                            <p className="text-sm font-medium text-gray-900">{candidate.interviewTime}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {candidate.interviewId && candidate.result === 'PENDING' && (
                      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleJoinMeeting(candidate.interviewId)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          title="Join WebRTC Meeting"
                        >
                          <FiVideo className="text-base" />
                          Join Meeting
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Schedule Interview Modal */}
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiCalendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">Schedule Interview</span>
            </div>
          }
          size="xl"
          variant="panel"
        >
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="space-y-6">
              {/* Candidate Selection Section */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <FiUsers className="w-4 h-4 text-blue-600" />
                  Select Candidate <span className="text-red-500">*</span>
                </label>

                {/* Tabs for Not Scheduled / Scheduled */}
                <div className="flex gap-2 mb-4 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleModalTab('notScheduled');
                      setSelectedCandidates([]);
                    }}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${scheduleModalTab === 'notScheduled'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } rounded-t-lg`}
                  >
                    Not Scheduled
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {notScheduledCandidates.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleModalTab('scheduled');
                      setSelectedCandidates([]);
                    }}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${scheduleModalTab === 'scheduled'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } rounded-t-lg`}
                  >
                    Scheduled
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                      {scheduledCandidates.length}
                    </span>
                  </button>
                </div>

                <div className="relative mb-3">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search candidates by name, email, or job title..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow-inner">
                  {modalFilteredCandidates.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium">No {scheduleModalTab === 'notScheduled' ? 'unscheduled' : 'scheduled'} candidates found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or check the {scheduleModalTab === 'notScheduled' ? 'Scheduled' : 'Not Scheduled'} tab</p>
                    </div>
                  ) : (
                    modalFilteredCandidates.map((candidate) => (
                      <label
                        key={candidate.jobApplicationId}
                        className="flex items-center p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.jobApplicationId)}
                          onChange={() => handleCandidateToggle(candidate.jobApplicationId)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{candidate.candidateName}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {candidate.jobTitle} • {candidate.candidateEmail}
                          </div>
                          {scheduleModalTab === 'scheduled' && candidate.interviewDate && candidate.interviewTime && (
                            <div className="text-xs text-blue-600 mt-1.5 font-medium">
                              📅 Scheduled: {candidate.interviewDate} at {candidate.interviewTime}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <div className="mt-3 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700">
                    {selectedCandidates.length} candidate(s) selected
                  </p>
                </div>
              </div>

              {/* Interview Date and Time Section */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                      <FiCalendar className="w-4 h-4 text-blue-600" />
                      Interview Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                      <FiClock className="w-4 h-4 text-blue-600" />
                      Interview Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <FiFileText className="w-4 h-4 text-blue-600" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all resize-none"
                  placeholder="Optional notes about the interview..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateScheduleInterview}
                  disabled={selectedCandidates.length === 0 || !interviewDate || !interviewTime}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Schedule Interview
                </button>
              </div>
            </div>
          </div>
        </Modal>

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

export default HRRoundTab;
