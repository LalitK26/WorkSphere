import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../api/ticketService';
import { employeeService } from '../../api/employeeService';
import { projectService } from '../../api/projectService';
import { departmentService } from '../../api/departmentService';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import SearchableEmployeeSelect from '../../components/UI/SearchableEmployeeSelect';

const CreateTicket = () => {
  const { isAdmin, user, getModulePermission } = useAuth();
  const navigate = useNavigate();

  const hasAllAddPermission = isAdmin() || getModulePermission('Tickets', 'add') === 'All';

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'LOW',
    requesterId: null,
    department: '',
    projectId: null,
    ticketType: '',
    channelName: '',
    tags: '',
    requesterEmail: '',
    files: [],
  });

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Requester dropdown is now handled by SearchableEmployeeSelect component

  useEffect(() => {
    if (hasAllAddPermission) {
      loadDepartments();
    } else {
      setFormData((prev) => ({
        ...prev,
        requesterId: user?.userId,
        requesterEmail: user?.email || ''
      }));
    }
    loadProjects();
  }, [hasAllAddPermission, user]);

  // Click outside handling is now done by SearchableEmployeeSelect component

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      setDepartments(response.data.map(dept => dept.name).sort());
    } catch (error) {
    }
  };

  // Employees are now loaded on-demand by SearchableEmployeeSelect component
  // No need to load all employees upfront

  const loadProjects = async () => {
    try {
      const viewPermission = getModulePermission('Projects', 'view');
      const hasAllProjectView = isAdmin() || viewPermission === 'All';
      const response = hasAllProjectView ? await projectService.getAll() : await projectService.getMyProjects();
      setProjects(response.data);
    } catch (error) {
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setAttachedFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileContent: base64String,
            fileSize: file.size,
            contentType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields for admin
      if (hasAllAddPermission) {
        if (!formData.requesterId) {
          setError('Please select a requester');
          setLoading(false);
          return;
        }
        if (!formData.department || formData.department.trim() === '') {
          setError('Please select a department');
          setLoading(false);
          return;
        }
      }

      // Employee email is already set in formData when selected via SearchableEmployeeSelect

      const submitData = {
        ...formData,
        requesterId: hasAllAddPermission ? formData.requesterId : user?.userId,
        assignGroup: hasAllAddPermission ? (formData.department && formData.department.trim() !== '' ? formData.department : null) : null,
        requesterEmail: formData.requesterEmail || user?.email || '',
        requesterType: 'EMPLOYEE',
        files: attachedFiles,
      };

      await ticketService.create(submitData);
      navigate('/tickets');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          (err.response?.data?.error ? 'Database error occurred. Please check the logs for details.' : 'Failed to create ticket');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">

          {/* ------------ HEADER (Back + Title + Breadcrumb) ------------ */}
          <div className="mb-6">

            <div className="flex items-center gap-3 mb-2">
              {/* Back Button */}
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 mr-1"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium"></span>
              </button>

              {/* Title removed - shown in topbar */}
            </div>

            {/* Breadcrumb removed */}
            <nav className="hidden">
              <span>Tickets</span> <span className="mx-2">/</span>
              <span>Create</span>
            </nav>
          </div>
          {/* ------------------------------------------------------------ */}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Ticket Details</h2>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Requester Name */}
              {hasAllAddPermission && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requester Name <span className="text-red-500">*</span>
                  </label>

                  <SearchableEmployeeSelect
                    selectedIds={formData.requesterId ? [String(formData.requesterId)] : []}
                    onSelectionChange={async (selectedIds) => {
                      const selectedId = selectedIds[0] ? Number(selectedIds[0]) : null;
                      if (selectedId) {
                        // Get employee details to get email
                        try {
                          const empResponse = await employeeService.getById(selectedId);
                          setFormData({
                            ...formData,
                            requesterId: selectedId,
                            requesterEmail: empResponse.data.email || ''
                          });
                        } catch (error) {
                          setFormData({
                            ...formData,
                            requesterId: selectedId,
                            requesterEmail: ''
                          });
                        }
                      } else {
                        setFormData({
                          ...formData,
                          requesterId: null,
                          requesterEmail: ''
                        });
                      }
                    }}
                    multiple={false}
                    placeholder="Select requester..."
                    className="w-full"
                  />
                </div>
              )}

              {/* Department */}
              {hasAllAddPermission && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="">--</option>
                    {departments.map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <div className="flex gap-2">
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">--</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="flex gap-2">
                  <select
                    value={formData.ticketType}
                    onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">--</option>
                    <option value="Question">Question</option>
                    <option value="Bug">Bug</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Support">Support</option>
                  </select>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Ticket Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.fileName}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Details */}
              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-4">Other Details</h3>

                {/* Priority */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                {/* Channel Name */}
                {hasAllAddPermission && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Channel Name</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.channelName}
                        onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">--</option>
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Chat">Chat</option>
                        <option value="Portal">Portal</option>
                      </select>
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Comma-separated tags"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

              </div>

              {/* Bottom Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateTicket;
