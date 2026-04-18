import React, { useState, useEffect } from 'react';
import { interviewService } from '../../api/interviewService';
import { FiX, FiAward } from 'react-icons/fi';

import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const TechnicalRoundTab = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedResult, setSelectedResult] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      const data = await interviewService.getTechnicalRoundCandidates();
      setCandidates(data);
    } catch (err) {
      console.error('Error fetching technical round candidates:', err);
      showToast(err.response?.data?.message || 'Failed to load candidates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (candidate) => {
    if (!candidate.interviewId) {
      showToast('No interview scheduled for this candidate', 'warning');
      return;
    }
    setSelectedCandidate(candidate);
    setSelectedResult('');
    setResultRemarks('');
    setShowResultModal(true);
  };

  const initiateSubmitResult = () => {
    if (!selectedResult) {
      showToast('Please select a result', 'error');
      return;
    }

    setShowResultModal(false);

    setConfirmationModal({
      isOpen: true,
      title: 'Confirm Result Submission',
      message: `Are you sure you want to mark this candidate as ${selectedResult === 'SHORTLISTED' ? 'SHORTLISTED' : 'REJECTED'}?`,
      confirmText: 'Submit Result',
      type: selectedResult === 'SHORTLISTED' ? 'primary' : 'danger',
      isLoading: false,
      onConfirm: executeSubmitResult
    });
  };

  const executeSubmitResult = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      await interviewService.submitTechnicalResult(
        selectedCandidate.interviewId,
        selectedResult,
        resultRemarks
      );

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      setSuccessModal({
        isOpen: true,
        title: 'Result Submitted',
        message: 'Result submitted successfully!',
        onOk: () => {
          closeSuccess();
          setSelectedCandidate(null);
          fetchCandidates();
        }
      });
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      console.error('Error submitting result:', err);
      showToast(err.response?.data?.message || 'Failed to submit result', 'error');
      setShowResultModal(true);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Technical Round Candidates</h2>

      {candidates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No candidates assigned for technical round
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Interviewer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {candidate.candidateName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.jobTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.candidateEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.interviewerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {candidate.result === 'SHORTLISTED' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Shortlisted
                      </span>
                    )}
                    {candidate.result === 'REJECTED' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                    {candidate.result === 'PENDING' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleResultClick(candidate)}
                      className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                      title="Submit Result"
                    >
                      <FiAward className="w-4 h-4" />
                      Result
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Result Submission Modal */}
      {showResultModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Submit Interview Result</h3>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Candidate:</strong> {selectedCandidate.candidateName}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Job Role:</strong> {selectedCandidate.jobTitle}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Result <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="result"
                      value="SHORTLISTED"
                      checked={selectedResult === 'SHORTLISTED'}
                      onChange={(e) => setSelectedResult(e.target.value)}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <span className="font-medium text-green-700">Shortlisted</span>
                      <p className="text-xs text-gray-500">Candidate passed the technical round</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="result"
                      value="REJECTED"
                      checked={selectedResult === 'REJECTED'}
                      onChange={(e) => setSelectedResult(e.target.value)}
                      className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-medium text-red-700">Rejected</span>
                      <p className="text-xs text-gray-500">Candidate did not meet requirements</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={resultRemarks}
                  onChange={(e) => setResultRemarks(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any additional comments or feedback..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={initiateSubmitResult}
                  disabled={!selectedResult}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Submit Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
};

export default TechnicalRoundTab;
