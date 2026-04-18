import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import { departmentService } from '../../api/departmentService';
import { useAuth } from '../../context/AuthContext';

const defaultFormState = {
  name: '',
  parentDepartmentId: null,
  description: '',
};

const Departments = () => {
  const { isAdmin, getModulePermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState(defaultFormState);
  const [viewDepartment, setViewDepartment] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get permissions for Department module
  const canAdd = isAdmin() || getModulePermission('Department', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Department', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Department', 'delete') !== 'None';

  useEffect(() => {
    loadDepartments('');
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        document.querySelectorAll('.fixed.hidden').forEach(el => {
          if (!el.classList.contains('hidden')) {
            el.classList.add('hidden');
          }
        });
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadDepartments = async (search = '') => {
    try {
      setLoading(true);
      const response = await departmentService.getAll(search);
      setDepartments(response.data);
      setError('');
    } catch (error) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    setSearchTerm(trimmed);
    await loadDepartments(trimmed);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData(defaultFormState);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (department) => {
    setModalMode('edit');
    setViewDepartment(department);
    setFormData({
      name: department.name,
      parentDepartmentId: department.parentDepartmentId || null,
      description: department.description || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (department) => {
    setViewDepartment(department);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setViewDepartment(null);
    setFormData(defaultFormState);
    setError('');
    setParentDepartmentSearch('');
  };

  // ✅ FIXED SYNTAX ERROR HERE
  const handleDelete = async (department) => {
    const confirmed = window.confirm(`Delete ${department.name}?`);
    if (!confirmed) return;

    try {
      await departmentService.delete(department.id);
      await loadDepartments(searchTerm); // Reload departments after deletion
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete department';
      alert(errorMessage);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        parentDepartmentId: formData.parentDepartmentId || null,
        description: formData.description?.trim() || null,
      };

      if (modalMode === 'edit') {
        await departmentService.update(viewDepartment.id, payload);
      } else {
        await departmentService.create(payload);
      }

      await loadDepartments(searchTerm); // Reload departments after create/update
      closeModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to save department';
      setError(errorMessage);
    }
  };

  const [parentDepartmentSearch, setParentDepartmentSearch] = useState('');

  const parentOptions = useMemo(() => {
    let options = departments.map((dept) => ({ id: dept.id, name: dept.name }));
    
    if (modalMode === 'edit' && viewDepartment) {
      options = options.filter((dept) => dept.id !== viewDepartment.id);
    }
    
    // Filter by search term
    if (parentDepartmentSearch.trim()) {
      const searchLower = parentDepartmentSearch.toLowerCase();
      options = options.filter((dept) => dept.name.toLowerCase().includes(searchLower));
    }
    
    return options;
  }, [departments, modalMode, viewDepartment, parentDepartmentSearch]);

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'parentDepartmentName',
      label: 'Parent Department',
      render: (value) => value || '--',
    },
    ...((canUpdate || canDelete) ? [{
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <div className="relative">
          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();

              const rect = e.currentTarget.getBoundingClientRect();
              const menu = e.currentTarget.nextSibling;

              menu.style.top = `${rect.bottom + 4}px`;
              menu.style.left = `${rect.left}px`;
              menu.classList.toggle('hidden');
            }}
          >
            ⋮
          </button>

          <div
            className="fixed hidden w-32 bg-white border border-gray-200 rounded shadow-lg z-50"
          >
            <button
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => openViewModal(row)}
            >
              View
            </button>

            {canUpdate && (
              <button
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => openEditModal(row)}
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                onClick={() => handleDelete(row)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ),
    }] : []),

  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
              <p>Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
              <div className="flex flex-col space-y-3 sm:space-y-4 md:flex-row md:items-center md:space-y-0 md:justify-between">
                <div className="hidden">
                  {/* Page title removed - shown in topbar */}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
                  <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <input
                      type="text"
                      placeholder="Search department"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 sm:flex-initial px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded whitespace-nowrap ${loading
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Search
                    </button>
                  </form>
                  {canAdd && (
                    <button
                      onClick={openCreateModal}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      + Add Department
                    </button>
                  )}
                </div>
              </div>

              {error && !isModalOpen && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-xs sm:text-sm">
                  {error}
                </div>
              )}

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {departments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-6 text-center text-sm text-gray-500">
                    No departments found
                  </div>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="bg-white rounded-xl shadow border border-gray-200 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{dept.name}</h3>
                          {dept.parentDepartmentName && (
                            <p className="text-xs text-gray-500 mt-1">
                              Parent: <span className="text-gray-700">{dept.parentDepartmentName}</span>
                            </p>
                          )}
                        </div>
                        {(canUpdate || canDelete) && (
                          <div className="relative ml-2 flex-shrink-0">
                            <button
                              className="p-2 rounded hover:bg-gray-100 text-gray-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menu = e.currentTarget.nextElementSibling;
                                if (menu) {
                                  menu.style.top = `${rect.bottom + 4}px`;
                                  menu.style.left = `${rect.left}px`;
                                  menu.classList.toggle('hidden');
                                }
                              }}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            <div className="fixed hidden w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
                              <button
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                onClick={() => {
                                  openViewModal(dept);
                                  document.querySelectorAll('.fixed.hidden').forEach(el => el.classList.add('hidden'));
                                }}
                              >
                                View
                              </button>
                              {canUpdate && (
                                <button
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                  onClick={() => {
                                    openEditModal(dept);
                                    document.querySelectorAll('.fixed.hidden').forEach(el => el.classList.add('hidden'));
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                                  onClick={() => {
                                    handleDelete(dept);
                                    document.querySelectorAll('.fixed.hidden').forEach(el => el.classList.add('hidden'));
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-xl shadow border border-gray-200 overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)] scroll-smooth table-scrollbar">
                <div className="min-w-full inline-block align-middle">
                  <Table columns={columns} data={departments} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen && modalMode !== 'view'}
        onClose={closeModal}
        title={modalMode === 'edit' ? 'Edit Department' : 'Add Department'}
        size="md"
        variant="panel"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="e.g. Human Resource"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Parent Department
            </label>
            <input
              type="text"
              value={parentDepartmentSearch}
              onChange={(e) => setParentDepartmentSearch(e.target.value)}
              placeholder="Search parent department"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 mb-2"
            />
            <select
              value={formData.parentDepartmentId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentDepartmentId: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="block w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              size={parentOptions.length > 5 ? 5 : parentOptions.length + 1}
              style={{ maxHeight: parentOptions.length > 5 ? '150px' : 'auto', overflowY: parentOptions.length > 5 ? 'auto' : 'visible' }}
            >
              <option value="">--</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              rows="3"
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen && modalMode === 'view'}
        onClose={closeModal}
        title="Department Details"
        size="sm"
      >
        {viewDepartment && (
          <div className="space-y-4 text-gray-900">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-sm font-semibold text-gray-900">
                {viewDepartment.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Parent Department</p>
              <p className="text-lg text-gray-900">
                {viewDepartment.parentDepartmentName || '--'}
              </p>
            </div>
            {viewDepartment.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-lg text-gray-900">
                  {viewDepartment.description}
                </p>
              </div>
            )}
            <button
              onClick={closeModal}
              className="mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Departments;
