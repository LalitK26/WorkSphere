import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiLock, FiUsers, FiBriefcase } from 'react-icons/fi';
import { jobOpeningService } from '../../api/jobOpeningService';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';
import Modal from '../../components/UI/Modal';
import JobOpeningForm from './JobOpeningForm';
import { useToast } from '../../context/ToastContext';

const JobOpenings = () => {
  const { showToast } = useToast();
  const [jobOpenings, setJobOpenings] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, isLoading: false });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onOk: () => { }
  });
  const [statistics, setStatistics] = useState({
    activeOpenings: 0,
    totalOpenings: 0,
    onHold: 0,
    closedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  const loadData = async (page) => {
    try {
      setLoading(true);
      const [jobsData, statsData] = await Promise.all([
        jobOpeningService.getAllJobOpenings(page, pageSize),
        jobOpeningService.getStatistics(),
      ]);
      setJobOpenings(jobsData?.content || []);
      setTotalPages(jobsData?.totalPages || 0);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      setError('Failed to load job openings. Please try again.');
      console.error('Error loading job openings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleCreate = () => {
    setIsSidePanelOpen(true);
    setEditingJobId(null);
  };

  const handleEdit = (id) => {
    setIsSidePanelOpen(true);
    setEditingJobId(id);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setEditingJobId(null);
  };

  const handleFormSuccess = () => {
    handleCloseSidePanel();
    loadData();
    showToast('Job opening saved successfully!', 'success');
  };

  const handleCloseClick = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const handleConfirmClose = async () => {
    const id = confirmModal.id;
    if (!id) return;

    try {
      setConfirmModal(prev => ({ ...prev, isLoading: true }));
      await jobOpeningService.closeJobOpening(id);

      setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false, id: null }));

      setSuccessModal({
        isOpen: true,
        title: 'Job Closed',
        message: 'The job opening has been closed successfully.',
        onOk: () => {
          setSuccessModal(prev => ({ ...prev, isOpen: false }));
          loadData();
        }
      });
    } catch (err) {
      setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      showToast('Failed to close job opening. Please try again.', 'error');
      console.error('Error closing job opening:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
      ON_HOLD: { bg: 'bg-orange-100', text: 'text-orange-800' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm mt-0.5">
              <FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Job Openings</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                Oversee and manage your organization's open positions.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md text-sm font-medium w-full sm:w-auto"
          >
            <FiPlus className="w-5 h-5" />
            Create Opening
          </button>
        </div>
      </div>

      <div className="content-max-width page-container">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid-responsive-4-col mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">{statistics.activeOpenings}</div>
            <div className="text-sm text-gray-600">Active Openings</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">{statistics.totalOpenings}</div>
            <div className="text-sm text-gray-600">Total Openings</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">{statistics.onHold}</div>
            <div className="text-sm text-gray-600">On Hold</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">{statistics.closedThisMonth}</div>
            <div className="text-sm text-gray-600">Closed This Month</div>
          </div>
        </div>

        {/* Job Openings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="table-responsive-wrapper">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Openings</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobOpenings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      No job openings found. Create your first job opening to get started.
                    </td>
                  </tr>
                ) : (
                  jobOpenings.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-medium text-gray-900">{job.jobTitle}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          Posted {formatDate(job.postedDate)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{job.department}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{job.location}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{job.jobType.replace('_', '-')}</td>
                      <td className="px-4 sm:px-6 py-4">{getStatusBadge(job.status)}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FiUsers className="w-4 h-4" />
                          {job.numberOfOpenings}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handleEdit(job.id)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          {job.status !== 'CLOSED' && (
                            <button
                              onClick={() => handleCloseClick(job.id)}
                              className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded transition-colors"
                              title="Close"
                            >
                              <FiLock className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Page {currentPage + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded border ${currentPage === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className={`px-3 py-1 rounded border ${currentPage >= totalPages - 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmClose}
        title="Close Job Opening"
        message="Are you sure you want to close this job opening? This action cannot be undone."
        confirmText="Close Opening"
        type="danger"
        isLoading={confirmModal.isLoading}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={successModal.onOk}
        title={successModal.title}
        message={successModal.message}
        buttonText="OK"
      />

      {/* Side Panel for Create/Edit Form */}
      <Modal
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
        title={editingJobId ? 'Edit Job Opening' : 'Create Job Opening'}
        variant="panel"
      >
        <JobOpeningForm
          jobId={editingJobId}
          isInSidePanel={true}
          onClose={handleCloseSidePanel}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div >
  );
};

export default JobOpenings;
