import { useState, useEffect, useCallback } from 'react';
import { roleService } from '../../api/roleService';
import RolePermissions from './RolePermissions';

const AddRoleModal = ({ isOpen, onClose, onSave, roles }) => {
  const [newRole, setNewRole] = useState({ name: '', description: '', importFromRoleId: '' });
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setNewRole({ name: '', description: '', importFromRoleId: '' });
    setError('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setNewRole({ name: '', description: '', importFromRoleId: '' });
      setError('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setError('');

    if (!newRole.name.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      const roleData = {
        name: newRole.name,
        description: newRole.description || '',
        type: 'EMPLOYEE',
        importFromRoleId: newRole.importFromRoleId ? parseInt(newRole.importFromRoleId) : null,
      };

      const response = await roleService.create(roleData);
      handleClose();
      onSave(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create role');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gray-900/50 px-4 py-8">
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col my-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Add Role"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Roles & Permissions</h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <form onSubmit={handleCreateRole}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="e.g. HR"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                rows="3"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Import from Role (Optional)
              </label>
              <select
                value={newRole.importFromRoleId}
                onChange={(e) => setNewRole({ ...newRole, importFromRoleId: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If not selected, will inherit Employee role permissions by default
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ManageRole = ({ onRoleUpdate }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedRoleName, setSelectedRoleName] = useState(null);
  const [selectedMemberCount, setSelectedMemberCount] = useState(0);
  const [selectedRoleType, setSelectedRoleType] = useState(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await roleService.getAll();
      setRoles(response.data);
    } catch (error) {
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleCreated = async (newRoleData) => {
    await loadRoles();
    if (onRoleUpdate) onRoleUpdate();
    // Auto-select the newly created role
    setSelectedRoleId(newRoleData.id);
    setSelectedRoleName(newRoleData.name);
    setSelectedMemberCount(newRoleData.memberCount || 0);
    setSelectedRoleType(newRoleData.type);
  };

  const handleDeleteRole = async (id, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await roleService.delete(id);
      // Clear selection if deleted role was selected
      if (selectedRoleId === id) {
        setSelectedRoleId(null);
        setSelectedRoleName(null);
        setSelectedMemberCount(0);
        setSelectedRoleType(null);
      }
      await loadRoles();
      if (onRoleUpdate) onRoleUpdate();
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMsg.textContent = `Role "${roleName}" deleted successfully!`;
      document.body.appendChild(successMsg);
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const handleResetPermissions = async (id) => {
    const role = roles.find(r => r.id === id);
    const roleName = role ? role.name : 'this role';
    if (!window.confirm(`Are you sure you want to reset permissions for "${roleName}" to Employee default?`)) {
      return;
    }

    try {
      await roleService.resetPermissions(id);
      if (role) {
        setSelectedRoleId(id);
        setSelectedRoleName(role.name);
        setSelectedMemberCount(getMemberCount(role));
        setSelectedRoleType(role.type);
      }
      if (onRoleUpdate) onRoleUpdate();
      // Reload permissions after reset
      if (selectedRoleId === id) {
        // Trigger reload by toggling selectedRoleId
        setSelectedRoleId(null);
        setTimeout(() => setSelectedRoleId(id), 100);
      }
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMsg.textContent = 'Permissions reset to Employee default successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reset permissions');
    }
  };

  const isDefaultRole = (role) => {
    return role.type === 'ADMIN' || role.type === 'EMPLOYEE' || role.type === 'CLIENT';
  };

  const isAdminRole = (role) => {
    return role.type === 'ADMIN';
  };

  const isEmployeeRole = (role) => {
    // Check ONLY by name (case-insensitive), not by type
    // This is because new roles default to EMPLOYEE type but have different names
    return role.name?.toLowerCase() === 'employee';
  };

  const canDeleteRole = (role) => {
    // Only Admin role (by type) and Employee role (by name "Employee") cannot be deleted
    // All other roles (HR, Operation Manager, etc.) can be deleted
    return !isAdminRole(role) && !isEmployeeRole(role);
  };

  const handleRoleSelect = (roleId, roleName, memberCount, roleType) => {
    if (selectedRoleId === roleId) {
      // Toggle off if clicking the same role
      setSelectedRoleId(null);
      setSelectedRoleName(null);
      setSelectedMemberCount(0);
      setSelectedRoleType(null);
    } else {
      setSelectedRoleId(roleId);
      setSelectedRoleName(roleName);
      setSelectedMemberCount(memberCount);
      setSelectedRoleType(roleType);
    }
  };

  const getMemberCount = (role) => {
    return role.memberCount || 0;
  };

  if (loading) {
    return <div className="p-4">Loading roles...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center space-x-2"
        >
          <span>+</span>
          <span>Add Role</span>
        </button>
      </div>


      <div className="p-4 space-y-3">
        {roles.map((role) => (
          <div key={role.id}>
            <div
              className={`border rounded-lg p-4 transition-colors ${
                selectedRoleId === role.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mb-3">
                <div className="font-semibold text-gray-900 text-base mb-1">{role.name}</div>
                <div className="text-sm text-gray-600">
                  {getMemberCount(role)} Member{getMemberCount(role) !== 1 ? 's' : ''}
                </div>
                {isAdminRole(role) && (
                  <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded inline-block">
                    Admin permissions can not be changed.
                  </div>
                )}
                {!canDeleteRole(role) && (
                  <div className="text-xs text-gray-500 mt-2">
                    {isAdminRole(role) ? 'Admin role can not be deleted.' : 'Employee role can not be deleted.'}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRoleSelect(role.id, role.name, getMemberCount(role), role.type)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-1.5 ${
                    selectedRoleId === role.id
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <span>🔑</span>
                  <span>Permissions</span>
                </button>
                {canDeleteRole(role) && (
                  <button
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center justify-center"
                    title="Delete Role"
                  >
                    <span>🗑️</span>
                  </button>
                )}
                {!isAdminRole(role) && (
                  <button
                    onClick={() => handleResetPermissions(role.id)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium flex items-center justify-center space-x-1.5"
                    title="Reset Permissions to Employee Default"
                  >
                    <span>🔄</span>
                  </button>
                )}
              </div>
            </div>
            {selectedRoleId === role.id && (
              <div className="mt-3 ml-0">
                <RolePermissions
                  roleId={selectedRoleId}
                  roleName={selectedRoleName}
                  memberCount={selectedMemberCount}
                  isAdmin={isAdminRole(role)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleRoleCreated}
        roles={roles}
      />
    </div>
  );
};

export default ManageRole;

