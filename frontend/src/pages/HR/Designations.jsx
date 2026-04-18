import { useEffect, useMemo, useState } from 'react';
import { designationService } from '../../api/designationService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const Designations = () => {
  const { isAdmin, getModulePermission } = useAuth();
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formData, setFormData] = useState({ name: '', description: '', parentDesignationId: '' });
  const [parentSearch, setParentSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  // Get permissions for Designations module
  const canAdd = isAdmin() || getModulePermission('Designations', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Designations', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Designations', 'delete') !== 'None';

  useEffect(() => {
    loadDesignations();
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

  const loadDesignations = async (search = '') => {
    try {
      setLoading(true);
      const response = await designationService.getAll(search);
      setDesignations(response.data);
    } catch (error) {
      alert('Unable to load designations');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    setSearchTerm(trimmed);
    await loadDesignations(trimmed);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', parentDesignationId: '' });
    setParentSearch('');
    setSelectedDesignation(null);
  };

  const openCreateModal = () => {
    setFormMode('create');
    resetForm();
    setIsFormModalOpen(true);
  };

  const openEditModal = (designation) => {
    setFormMode('edit');
    setSelectedDesignation(designation);
    setFormData({
      name: designation.name || '',
      description: designation.description || '',
      parentDesignationId: designation.parentDesignationId || '',
    });
    setParentSearch('');
    setIsFormModalOpen(true);
  };

  const openViewModal = (designation) => {
    setSelectedDesignation(designation);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        parentDesignationId: formData.parentDesignationId || null,
      };

      if (!payload.name) {
        alert('Name is required');
        return;
      }

      if (formMode === 'create') {
        await designationService.create(payload);
      } else if (selectedDesignation) {
        await designationService.update(selectedDesignation.id, payload);
      }

      setIsFormModalOpen(false);
      resetForm();
      await loadDesignations(searchTerm);
    } catch (error) {
      const message = error?.response?.data?.message || 'Error saving designation';
      alert(message);
    }
  };

  const handleDelete = async (designation) => {
    const confirmed = window.confirm(`Delete ${designation.name}?`);
    if (!confirmed) return;
    try {
      await designationService.delete(designation.id);
      await loadDesignations(searchTerm);
    } catch (error) {
      alert('Error deleting designation');
    }
  };

  const parentOptions = useMemo(() => {
    const currentId = formMode === 'edit' ? selectedDesignation?.id : null;
    return designations
      .filter((designation) => designation.id !== currentId)
      .filter((designation) =>
        designation.name.toLowerCase().includes(parentSearch.toLowerCase())
      );
  }, [designations, parentSearch, formMode, selectedDesignation]);

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'parentDesignationName',
      label: 'Parent Designation',
      render: (value) => value || '-',
    },
    { key: 'description', label: 'Description' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => formatDate(value),
    },
    ...((canUpdate || canDelete) ? [{
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <div className="relative">
          {/* Three dots button */}
          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();

              const rect = e.currentTarget.getBoundingClientRect();
              const menu = e.currentTarget.nextElementSibling;

              menu.style.top = `${rect.bottom + 4}px`;
              menu.style.left = `${rect.left}px`;
              menu.classList.toggle('hidden');
            }}
          >
            ⋮
          </button>

          {/* Dropdown menu */}
          <div className="fixed hidden w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
            <button
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                openViewModal(row);
                e.currentTarget.parentElement.classList.add('hidden');
              }}
            >
              View
            </button>

            {canUpdate && (
              <button
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(row);
                  e.currentTarget.parentElement.classList.add('hidden');
                }}
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                  e.currentTarget.parentElement.classList.add('hidden');
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ),
    }] : []),
  ];


  if (loading && isInitialLoad) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col space-y-3 sm:space-y-4 md:flex-row md:items-center md:space-y-0 md:justify-between mb-4 sm:mb-6">
            <div className="hidden">
              {/* Page title removed - shown in topbar */}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Search designation"
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
                  + Add Designation
                </button>
              )}
            </div>
          </div>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {designations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-500">
                No designations found
              </div>
            ) : (
              designations.map((designation) => (
                <div key={designation.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{designation.name}</h3>
                      {designation.parentDesignationName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Parent: <span className="text-gray-700">{designation.parentDesignationName}</span>
                        </p>
                      )}
                      {designation.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{designation.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {formatDate(designation.createdAt)}
                      </p>
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
                        <div className="fixed hidden w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
                          <button
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              openViewModal(designation);
                              e.currentTarget.parentElement.classList.add('hidden');
                            }}
                          >
                            View
                          </button>
                          {canUpdate && (
                            <button
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(designation);
                                e.currentTarget.parentElement.classList.add('hidden');
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(designation);
                                e.currentTarget.parentElement.classList.add('hidden');
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
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)] scroll-smooth table-scrollbar">
            <div className="min-w-full inline-block align-middle">
              <Table columns={columns} data={designations} />
            </div>
          </div>
          {loading && !isInitialLoad && (
            <p className="text-sm text-gray-500 mt-2">Refreshing data...</p>
          )}

          <Modal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              resetForm();
            }}
            title={formMode === 'create' ? 'Add Designation' : 'Edit Designation'}
            variant="panel"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g. Team Lead"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parent</label>
                <input
                  type="text"
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  placeholder="Search parent"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
                />
                <select
                  value={formData.parentDesignationId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parentDesignationId: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                  size={parentOptions.length > 5 ? 5 : parentOptions.length + 1}
                  style={{ maxHeight: parentOptions.length > 5 ? '150px' : 'auto', overflowY: parentOptions.length > 5 ? 'auto' : 'visible' }}
                >
                  <option value="">-- No Parent --</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>

          <Modal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedDesignation(null);
            }}
            title="Designation Details"
          >
            {selectedDesignation && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedDesignation.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parent</p>
                  <p className="text-base text-gray-900">
                    {selectedDesignation.parentDesignationName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-base text-gray-900">
                    {selectedDesignation.description || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-base text-gray-900">{formatDate(selectedDesignation.createdAt)}</p>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
};

export default Designations;

