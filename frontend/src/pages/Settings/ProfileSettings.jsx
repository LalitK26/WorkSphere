import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../api/profileService';
import Sidebar from '../../components/Layout/Sidebar';
import SettingsSidebar from '../../components/Layout/SettingsSidebar';
import Topbar from '../../components/Layout/Topbar';
import Avatar from '../../components/UI/Avatar';
import { useLocation } from 'react-router-dom';
import { compressImage } from '../../utils/imageCompression';

const ProfileSettings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [showSettingsSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: '',
    mobile: '',
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    address: '',
    about: '',
    profilePictureUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const countries = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Japan', 'China', 'Brazil', 'Mexico', 'Spain', 'Italy', 'Russia',
    'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
  ];

  const maritalStatusOptions = ['Single', 'Married', 'Divorced', 'Widow', 'Widower'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // For now, we'll use the employee service to get current user data
      // In a real scenario, you'd have a /employees/me endpoint
      const response = await profileService.getCurrentProfile();
      const profile = response.data;
      
      // Format dateOfBirth if it's a LocalDate object or ISO string
      let formattedDateOfBirth = '';
      if (profile.dateOfBirth) {
        if (typeof profile.dateOfBirth === 'string') {
          formattedDateOfBirth = profile.dateOfBirth.split('T')[0];
        } else if (profile.dateOfBirth.year && profile.dateOfBirth.month && profile.dateOfBirth.day) {
          // Handle LocalDate object from backend
          const year = profile.dateOfBirth.year;
          const month = String(profile.dateOfBirth.month).padStart(2, '0');
          const day = String(profile.dateOfBirth.day).padStart(2, '0');
          formattedDateOfBirth = `${year}-${month}-${day}`;
        }
      }

      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        password: '',
        country: profile.country || '',
        mobile: profile.mobile || '',
        gender: profile.gender || '',
        dateOfBirth: formattedDateOfBirth,
        maritalStatus: profile.maritalStatus || '',
        address: profile.address || '',
        about: profile.about || '',
        profilePictureUrl: profile.profilePictureUrl || '',
      });
    } catch (error) {
      // If /employees/me doesn't exist, try to get user from auth context
      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: user.email || '',
          firstName: user.fullName?.split(' ')[0] || '',
          lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Image must be JPG, JPEG, PNG, or WEBP');
      return;
    }

    setFormError('');
    setSaving(true);

    try {
      // Compress image if it's larger than 500 KB
      const compressedFile = await compressImage(file, 500);
      
      // Upload compressed file to backend
      const response = await profileService.uploadProfilePicture(compressedFile);
      setFormData((prev) => ({ ...prev, profilePictureUrl: response.data.profilePictureUrl }));
      setSuccessMessage('Profile picture uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error uploading profile picture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        country: formData.country || null,
        mobile: formData.mobile || null,
        gender: formData.gender || null,
        dateOfBirth: formData.dateOfBirth || null,
        maritalStatus: formData.maritalStatus || null,
        address: formData.address || null,
        about: formData.about || null,
        // Profile picture is now uploaded separately, don't send it here
      };

      // Only include password if it's been changed
      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      await profileService.updateProfile(payload);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear password field after successful save
      setFormData((prev) => ({ ...prev, password: '' }));
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-lg font-medium text-gray-600">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <SettingsSidebar onClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-[512px]">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 hidden">
              {/* Page title removed - shown in topbar */}
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                  {formError}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                  {successMessage}
                </div>
              )}

              {/* Profile Picture */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Avatar
                    profilePictureUrl={formData.profilePictureUrl}
                    fullName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Profile'}
                    size="w-24 h-24"
                    className="rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 w-full sm:w-auto flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1 break-words max-w-full">JPG, PNG or WEBP. Images above 500 KB will be auto-compressed</p>
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="First Name"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Last Name"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password.</p>
              </div>

              {/* Country and Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Gender and Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Marital Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => updateField('maritalStatus', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Marital Status</option>
                  {maritalStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your address"
                />
              </div>

              {/* About */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => updateField('about', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                  placeholder="Tell us about yourself"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileSettings;

