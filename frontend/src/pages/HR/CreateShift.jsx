import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { shiftService } from '../../api/shiftService';

const graceOptions = [5, 10, 15, 20, 25, 30];

const CreateShift = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    graceMinutes: 15,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.startTime || !formData.endTime) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    try {
      await shiftService.create({
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        graceMinutes: Number(formData.graceMinutes),
      });
      navigate('/hr/shift-roster');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shift');
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-6 py-6">

          {/* ✅ HEADER WITH BACK LOGO */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/hr/shift-roster')}
              className="p-2 rounded-full hover:bg-gray-200"
              aria-label="Go back"
            >
              {/* Back Arrow Logo */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="hidden">
              {/* Page title removed - shown in topbar */}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-3xl shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">
                  Shift Name
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. General Shift"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">
                    From
                  </label>
                  <input
                    type="time"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">
                    To
                  </label>
                  <input
                    type="time"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">
                    Grace (minutes)
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2"
                    value={formData.graceMinutes}
                    onChange={(e) =>
                      handleChange('graceMinutes', e.target.value)
                    }
                  >
                    {graceOptions.map((value) => (
                      <option key={value} value={value}>
                        {value} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded text-sm font-semibold hover:bg-gray-300"
                  onClick={() => navigate('/hr/shift-roster')}
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

export default CreateShift;
