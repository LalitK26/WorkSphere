import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobOpeningService } from '../../api/jobOpeningService';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import SuccessModal from '../../components/SuccessModal';

const JobOpeningForm = ({ jobId: propJobId, isInSidePanel = false, onClose, onSuccess }) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const id = isInSidePanel ? propJobId : paramId;
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    jobTitle: '',
    jobName: '',
    location: '',
    jobType: 'FULL_TIME',
    workMode: 'REMOTE',
    department: '',
    applicationDate: '',
    expectedJoiningDate: '',
    numberOfOpenings: '',
    minExperienceYears: '',
    requiredSkills: '',
    status: 'ACTIVE',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (isEditMode) {
      loadJobOpening();
    }
  }, [id]);

  const loadJobOpening = async () => {
    try {
      setLoading(true);
      const job = await jobOpeningService.getJobOpeningById(id);
      setFormData({
        jobTitle: job.jobTitle || '',
        jobName: job.jobName || '',
        location: job.location || '',
        jobType: job.jobType || 'FULL_TIME',
        workMode: job.workMode || 'REMOTE',
        department: job.department || '',
        applicationDate: job.applicationDate || '',
        expectedJoiningDate: job.expectedJoiningDate || '',
        numberOfOpenings: job.numberOfOpenings ?? 0,
        minExperienceYears: job.minExperienceYears !== null && job.minExperienceYears !== undefined ? job.minExperienceYears : 0,
        requiredSkills: job.requiredSkills || '',
        status: job.status || 'ACTIVE',
      });
    } catch (err) {
      showToast('Failed to load job opening. Please try again.', 'error');
      console.error('Error loading job opening:', err);
      navigate('/job-openings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === 'numberOfOpenings' || name === 'minExperienceYears')
        ? value.replace(/[^0-9]/g, '')   // allow only digits while typing
        : value,

    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }
    if (!formData.jobName.trim()) {
      newErrors.jobName = 'Job name is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.applicationDate) {
      newErrors.applicationDate = 'Application date is required';
    }
    if (formData.numberOfOpenings < 0) {
      newErrors.numberOfOpenings = 'Number of openings cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const initiateSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: isEditMode ? 'Update Job Opening' : 'Create Job Opening',
      message: `Are you sure you want to ${isEditMode ? 'update' : 'create'} this job opening?`,
      confirmText: isEditMode ? 'Update' : 'Create',
      type: 'primary',
      isLoading: false,
      onConfirm: executeSubmit
    });
  };

  const executeSubmit = async () => {
    try {
      setConfirmationModal(prev => ({ ...prev, isLoading: true }));
      setLoading(true);

      const submitData = {
        jobTitle: formData.jobTitle,
        jobName: formData.jobName,
        location: formData.location,
        jobType: formData.jobType,
        workMode: formData.workMode,
        department: formData.department,
        applicationDate: formData.applicationDate,
        expectedJoiningDate: formData.expectedJoiningDate || null,
        numberOfOpenings: parseInt(formData.numberOfOpenings || 0),
        minExperienceYears: parseInt(formData.minExperienceYears || 0),
        requiredSkills: formData.requiredSkills || null,
      };

      if (isEditMode) {
        submitData.status = formData.status;
        await jobOpeningService.updateJobOpening(id, submitData);
      } else {
        await jobOpeningService.createJobOpening(submitData);
      }

      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));

      // Handle success based on usage mode
      if (isInSidePanel) {
        // Side panel mode: call parent callback to close modal and refresh
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Standalone mode: show success modal with redirect
        setSuccessModal({
          isOpen: true,
          title: isEditMode ? 'Job Updated' : 'Job Created',
          message: `Job opening has been ${isEditMode ? 'updated' : 'created'} successfully!`,
          onOk: () => {
            closeSuccess();
            navigate('/job-openings');
          }
        });
      }
    } catch (err) {
      setConfirmationModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      showToast(`Failed to ${isEditMode ? 'update' : 'create'} job opening. Please try again.`, 'error');
      console.error('Error saving job opening:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    if (isInSidePanel) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600">Loading...</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className={isInSidePanel ? "" : "min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8"}>
      <div className={isInSidePanel ? "" : "max-w-4xl mx-auto"}>
        {!isInSidePanel && (
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">
              {isEditMode ? 'Edit Job Opening' : 'Create Job Opening'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEditMode ? 'Update job opening details' : 'Fill in the details to create a new job opening'}
            </p>
          </div>
        )}

        <form onSubmit={initiateSubmit} className={isInSidePanel ? "space-y-6 border border-gray-200 rounded-lg p-6" : "bg-white rounded-lg shadow border border-gray-200 p-6 sm:p-8"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700">Job Title *</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.jobTitle ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="e.g., Senior Frontend Developer"
              />
              {errors.jobTitle && <p className="text-red-700 text-sm mt-1">{errors.jobTitle}</p>}
            </div>

            {/* Job Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700">Job Name *</label>
              <input
                type="text"
                name="jobName"
                value={formData.jobName}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.jobName ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="e.g., Frontend Developer Position"
              />
              {errors.jobName && <p className="text-red-700 text-sm mt-1">{errors.jobName}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="e.g., New York, NY"
              />
              {errors.location && <p className="text-red-700 text-sm mt-1">{errors.location}</p>}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.department ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="e.g., Engineering"
              />
              {errors.department && <p className="text-red-700 text-sm mt-1">{errors.department}</p>}
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Job Type *</label>
              <select
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Work Mode *</label>
              <select
                name="workMode"
                value={formData.workMode}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="REMOTE">Remote</option>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            {/* Application Date */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Application Date *</label>
              <input
                type="date"
                name="applicationDate"
                value={formData.applicationDate}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.applicationDate ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.applicationDate && <p className="text-red-700 text-sm mt-1">{errors.applicationDate}</p>}
            </div>

            {/* Expected Joining Date */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Expected Joining Date</label>
              <input
                type="date"
                name="expectedJoiningDate"
                value={formData.expectedJoiningDate}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Number of Openings */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Number of Openings *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="numberOfOpenings"
                value={formData.numberOfOpenings}
                onChange={handleChange}
                className={`w-full bg-white border ${errors.numberOfOpenings ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.numberOfOpenings && <p className="text-red-700 text-sm mt-1">{errors.numberOfOpenings}</p>}
            </div>

            {/* Minimum Experience Years */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Minimum Experience (Years)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="minExperienceYears"
                value={formData.minExperienceYears}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
              <p className="text-gray-500 text-xs mt-1">Optional: Minimum years of experience required (default: 0)</p>
            </div>

            {/* Required Skills */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700">Required Skills</label>
              <textarea
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                rows="3"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Java, Spring Boot, React, SQL (comma-separated or one per line)"
              />
              <p className="text-gray-500 text-xs mt-1">Optional: List required skills for this position</p>
            </div>

            {/* Status (only in edit mode) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              type="button"
              onClick={() => isInSidePanel && onClose ? onClose() : navigate('/job-openings')}
              className="px-4 sm:px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>

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
    </div >
  );
};

export default JobOpeningForm;
