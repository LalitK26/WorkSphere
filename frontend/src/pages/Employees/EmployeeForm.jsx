import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeService } from '../../api/employeeService';
import { designationService } from '../../api/designationService';
import { roleService } from '../../api/roleService';
import { departmentService } from '../../api/departmentService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Avatar from '../../components/UI/Avatar';
import SearchableSelect from '../../components/UI/SearchableSelect';
import { compressImage } from '../../utils/imageCompression';

const initialFormState = {
  email: '',
  firstName: '',
  lastName: '',
  employeeId: '',
  password: '',
  roleId: '',
  designationId: '',
  reportingManagerId: '',
  department: '',
  country: '',
  mobile: '',
  gender: '',
  joiningDate: '',
  dateOfBirth: '',
  language: '',
  address: '',
  about: '',
  loginAllowed: true,
  receiveEmailNotifications: true,
  hourlyRate: '',
  slackMemberId: '',
  skills: '',
  probationEndDate: '',
  noticePeriodStartDate: '',
  noticePeriodEndDate: '',
  employmentType: '',
  maritalStatus: '',
  internshipEndDate: '',
  businessAddress: '',
  exitDate: '',
  status: 'ACTIVE',
  profilePictureUrl: '',
};

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const formModifiedRef = useRef(false);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    // Reset form modification tracker when id changes
    formModifiedRef.current = false;
    dataLoadedRef.current = false;
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    try {
      // Load dropdown data first (this takes time)
      const [designationsRes, rolesRes, employeesRes, departmentsRes] = await Promise.all([
        designationService.getAll(),
        roleService.getAll(),
        employeeService.getAll(),
        departmentService.getAll(),
      ]);
      setDesignations(designationsRes.data);
      setRoles(rolesRes.data);
      setManagers(employeesRes.data);
      setDepartments(departmentsRes.data);

      if (id) {
        // Editing existing employee - always load data
        const employeeRes = await employeeService.getById(id);
        const employee = employeeRes.data;
        setFormData({
          ...initialFormState,
          email: employee.email || '',
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          employeeId: employee.employeeId || '',
          password: '', // Clear password field when editing - only update if user enters new password
          roleId: employee.roleId || '',
          designationId: employee.designationId || '',
          reportingManagerId: employee.reportingManagerId || '',
          department: employee.department || '',
          country: employee.country || '',
          mobile: employee.mobile || '',
          gender: employee.gender || '',
          joiningDate: employee.joiningDate || '',
          dateOfBirth: employee.dateOfBirth || '',
          language: employee.language || '',
          address: employee.address || '',
          about: employee.about || '',
          loginAllowed: employee.loginAllowed ?? true,
          receiveEmailNotifications: employee.receiveEmailNotifications ?? true,
          hourlyRate: employee.hourlyRate || '',
          slackMemberId: employee.slackMemberId || '',
          skills: employee.skills || '',
          probationEndDate: employee.probationEndDate || '',
          noticePeriodStartDate: employee.noticePeriodStartDate || '',
          noticePeriodEndDate: employee.noticePeriodEndDate || '',
          employmentType: employee.employmentType || '',
          maritalStatus: employee.maritalStatus || '',
          internshipEndDate: employee.internshipEndDate || '',
          businessAddress: employee.businessAddress || '',
          exitDate: employee.exitDate || '',
          status: employee.status || 'ACTIVE',
          profilePictureUrl: employee.profilePictureUrl || '',
        });
      } else {
        // New employee - only reset if form hasn't been modified by user
        if (!formModifiedRef.current) {
          setFormData(initialFormState);
        }
      }
      dataLoadedRef.current = true;
    } catch (error) {
      dataLoadedRef.current = true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }
    if (!id && !formData.password.trim()) {
      setFormError('Password is required for new employees.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        roleId: formData.roleId || null,
        designationId: formData.designationId || null,
        reportingManagerId: formData.reportingManagerId || null,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        profilePictureUrl: undefined, // Don't send profile picture URL in payload
        // Only include password if it's provided (for new employees) or if it's changed (for editing)
        password: formData.password && formData.password.trim() ? formData.password : undefined,
      };
      delete payload.profilePictureFile; // Remove temporary file reference

      let employeeId = id;
      if (id) {
        await employeeService.update(id, payload);
      } else {
        const response = await employeeService.create(payload);
        employeeId = response.data.id;
        
        // Upload profile picture if provided for new employee
        if (formData.profilePictureFile) {
          await employeeService.uploadProfilePicture(employeeId, formData.profilePictureFile);
        }
      }
      navigate('/employees');
    } catch (error) {
      const message = error.response?.data?.message || 'Error saving employee';
      setFormError(message);
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
    setLoading(true);

    try {
      // Compress image if it's larger than 500 KB
      const compressedFile = await compressImage(file, 500);

      // If editing existing employee, upload immediately
      if (id) {
        const response = await employeeService.uploadProfilePicture(id, compressedFile);
        setFormData((prev) => ({ ...prev, profilePictureUrl: response.data.profilePictureUrl }));
      } else {
        // For new employee, store file temporarily (will upload after employee is created)
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, profilePictureUrl: reader.result, profilePictureFile: compressedFile }));
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error uploading profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 hidden">
            {/* Page title removed - shown in topbar */}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">{id ? 'Update Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-semibold mb-4 text-gray-300">Account Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase">
                    Employee ID
                  </label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) => {
                          formModifiedRef.current = true;
                          setFormData({ ...formData, employeeId: e.target.value });
                        }}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase">Salutation</label>
                      <select
                        value={formData.gender === 'Male' ? 'Mr' : formData.gender === 'Female' ? 'Ms' : ''}
                        onChange={(e) => {
                          formModifiedRef.current = true;
                          setFormData({
                            ...formData,
                            gender: e.target.value === 'Mr' ? 'Male' : e.target.value === 'Ms' ? 'Female' : '',
                          });
                        }}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select</option>
                        <option value="Mr">Mr</option>
                        <option value="Ms">Ms</option>
                      </select>
                    </div>
                    <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase">
                    Employee Email <span className="text-red-500">*</span>
                  </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {id && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase">
                          Change Password
                        </label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    {!id && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <SearchableSelect
                        label="Designation"
                        value={formData.designationId}
                        onChange={(value) => setFormData({ ...formData, designationId: value })}
                        options={designations}
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id}
                        placeholder="Select Designation"
                        searchPlaceholder="Search designation..."
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Department"
                        value={formData.department}
                        onChange={(value) => setFormData({ ...formData, department: value })}
                        options={departments}
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.name}
                        placeholder="Select Department"
                        searchPlaceholder="Search department..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Mobile</label>
                      <input
                        type="text"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Joining Date</label>
                      <input
                        type="date"
                        value={formData.joiningDate || ''}
                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth || ''}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Reporting To"
                        value={formData.reportingManagerId}
                        onChange={(value) => setFormData({ ...formData, reportingManagerId: value })}
                        options={managers.filter((m) => String(m.id) !== String(id))}
                        getOptionLabel={(opt) => opt.fullName}
                        getOptionValue={(opt) => opt.id}
                        placeholder="Select Manager"
                        searchPlaceholder="Search manager..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Language</label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">User Role</label>
                      <select
                        value={formData.roleId}
                        onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold mt-6 sm:mt-8 mb-4 text-gray-300">Other Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Login Allowed?</label>
                      <div className="mt-2 flex space-x-4 text-sm">
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={formData.loginAllowed === true}
                            onChange={() => setFormData({ ...formData, loginAllowed: true })}
                          />
                          <span>Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={formData.loginAllowed === false}
                            onChange={() => setFormData({ ...formData, loginAllowed: false })}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">
                        Receive email notifications?
                      </label>
                      <div className="mt-2 flex space-x-4 text-sm">
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={formData.receiveEmailNotifications === true}
                            onChange={() => setFormData({ ...formData, receiveEmailNotifications: true })}
                          />
                          <span>Yes</span>
                        </label>
                        <label className="inline-flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={formData.receiveEmailNotifications === false}
                            onChange={() => setFormData({ ...formData, receiveEmailNotifications: false })}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Slack Member ID</label>
                      <input
                        type="text"
                        value={formData.slackMemberId}
                        onChange={(e) => setFormData({ ...formData, slackMemberId: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Hourly Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 uppercase">Skills</label>
                      <input
                        type="text"
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        placeholder="e.g. communication, ReactJS"
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Probation End Date</label>
                      <input
                        type="date"
                        value={formData.probationEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">
                        Notice Period Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.noticePeriodStartDate || ''}
                        onChange={(e) => setFormData({ ...formData, noticePeriodStartDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">
                        Notice Period End Date
                      </label>
                      <input
                        type="date"
                        value={formData.noticePeriodEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, noticePeriodEndDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Employment Type</label>
                      <select
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Marital Status</label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Internship End Date</label>
                      <input
                        type="date"
                        value={formData.internshipEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, internshipEndDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Business Address</label>
                      <input
                        type="text"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Exit Date</label>
                      <input
                        type="date"
                        value={formData.exitDate || ''}
                        onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase">About</label>
                      <textarea
                        value={formData.about}
                        onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 flex flex-col items-center">
                    <Avatar
                      profilePictureUrl={formData.profilePictureUrl}
                      fullName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Employee'}
                      size="w-24 h-24 sm:w-28 sm:h-28"
                      className="mb-4"
                    />
                    <div className="w-full">
                      <label className="block text-xs font-medium text-gray-400 uppercase">Profile Picture</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="mt-2 block w-full text-xs text-gray-600"
                      />
                      {formData.profilePictureUrl && (
                        <button
                          type="button"
                          className="mt-2 text-xs text-red-600 hover:text-red-700"
                          onClick={() => setFormData({ ...formData, profilePictureUrl: '' })}
                        >
                          Remove picture
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {formError && <div className="mt-4 text-red-400 text-sm">{formError}</div>}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:space-x-4 sm:space-y-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/employees')}
                  className="flex-1 sm:flex-none px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition-colors"
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

export default EmployeeForm;

