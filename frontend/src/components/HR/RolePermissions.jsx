import { useState, useEffect } from 'react';
import { roleService } from '../../api/roleService';

const RolePermissions = ({ roleId, roleName, memberCount, isAdmin = false }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const modules = [
    'Employees',
    'Projects',
    'Tasks',
    'Attendance',
    'Tickets',
    'Events',
    'Leaves',
    'Holidays',
    'Department',
    'Designations',
    'Shift Roster',
  ];

  useEffect(() => {
    if (roleId) {
      loadPermissions();
    }
  }, [roleId]);

  const loadPermissions = async () => {
    if (!roleId) return;

    try {
      setLoading(true);
      setError('');
      const response = await roleService.getPermissions(roleId);
      setPermissions(response.data.permissions || []);
    } catch (error) {
      // Only show error if it's not a 404 or table doesn't exist
      if (error.response?.status !== 404) {
        setError('Failed to load permissions. Please try again.');
      } else {
        setError('Permissions not initialized yet. Please create the role first.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module, field, value) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.module === module ? { ...perm, [field]: value } : perm
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await roleService.updatePermissions(roleId, { permissions });
      setError(''); // Clear any previous errors
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMsg.textContent = 'Permissions saved successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (module, field) => {
    const perm = permissions.find((p) => p.module === module);
    return perm ? perm[field] : 'None';
  };

  const getAddOptions = () => ['All', 'None'];
  const getViewUpdateOptions = () => ['All', 'Added', 'Owned', 'Added & Owned', 'None'];
  const getDeleteOptions = () => ['All', 'Added', 'None'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{roleName || 'Permissions'}</h2>
            {roleName && memberCount !== undefined && (
              <p className="text-sm text-gray-500">
                {memberCount} Member{memberCount !== 1 ? 's' : ''}
              </p>
            )}
            {isAdmin && (
              <p className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded inline-block">
                Admin permissions can not be changed.
              </p>
            )}
          </div>
          {!isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Module
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Add
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                View
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Update
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modules.map((module, index) => (
              <tr key={module} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {module}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={getPermissionValue(module, 'add')}
                    onChange={(e) => handlePermissionChange(module, 'add', e.target.value)}
                    disabled={isAdmin}
                    className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {getAddOptions().map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={getPermissionValue(module, 'view')}
                    onChange={(e) => handlePermissionChange(module, 'view', e.target.value)}
                    disabled={isAdmin}
                    className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {getViewUpdateOptions().map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={getPermissionValue(module, 'update')}
                    onChange={(e) => handlePermissionChange(module, 'update', e.target.value)}
                    disabled={isAdmin}
                    className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {getViewUpdateOptions().map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={getPermissionValue(module, 'delete')}
                    onChange={(e) => handlePermissionChange(module, 'delete', e.target.value)}
                    disabled={isAdmin}
                    className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {getDeleteOptions().map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RolePermissions;

