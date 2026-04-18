import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Avatar from '../../components/UI/Avatar';
import { employeeService } from '../../api/employeeService';
import { formatDate } from '../../utils/formatters';

const ReadOnlyField = ({ label, value }) => (
  <div className="mb-4">
    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
    <div className="mt-1 text-sm text-gray-900 border border-gray-300 bg-gray-50 rounded px-3 py-2 min-h-[40px] flex items-center">
      {value || '-'}
    </div>
  </div>
);

const EmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        const response = await employeeService.getById(id);
        setEmployee(response.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="hidden">
              {/* Page title removed - shown in topbar */}
            </div>
            <button
              className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-xs sm:text-sm transition-colors whitespace-nowrap"
              onClick={() => navigate('/employees')}
            >
              Back to List
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Update Employee</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2">
                <h3 className="text-xs sm:text-sm font-semibold mb-4 text-gray-300">Account Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <ReadOnlyField label="Employee ID" value={employee.employeeId} />
                  <ReadOnlyField label="Salutation" value={employee.gender === 'Male' ? 'Mr' : employee.gender === 'Female' ? 'Ms' : ''} />
                  <ReadOnlyField label="Employee Name" value={employee.fullName} />
                  <ReadOnlyField label="Employee Email" value={employee.email} />
                  <ReadOnlyField label="Designation" value={employee.designationName} />
                  <ReadOnlyField label="Department" value={employee.department} />
                  <ReadOnlyField label="Country" value={employee.country} />
                  <ReadOnlyField label="Mobile" value={employee.mobile} />
                  <ReadOnlyField label="Gender" value={employee.gender} />
                  <ReadOnlyField
                    label="Joining Date"
                    value={employee.joiningDate ? formatDate(employee.joiningDate) : ''}
                  />
                  <ReadOnlyField
                    label="Date of Birth"
                    value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : ''}
                  />
                  <ReadOnlyField label="Reporting To" value={employee.reportingManagerName} />
                  <ReadOnlyField label="Language" value={employee.language} />
                  <ReadOnlyField label="User Role" value={employee.roleName} />
                  <ReadOnlyField label="Status" value={employee.status} />
                </div>

                <h3 className="text-xs sm:text-sm font-semibold mt-6 sm:mt-8 mb-4 text-gray-300">Other Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <ReadOnlyField label="Slack Member ID" value={employee.slackMemberId} />
                  <ReadOnlyField label="Hourly Rate" value={employee.hourlyRate} />
                  <ReadOnlyField label="Skills" value={employee.skills} />
                  <ReadOnlyField
                    label="Probation End Date"
                    value={employee.probationEndDate ? formatDate(employee.probationEndDate) : ''}
                  />
                  <ReadOnlyField
                    label="Notice Period Start Date"
                    value={employee.noticePeriodStartDate ? formatDate(employee.noticePeriodStartDate) : ''}
                  />
                  <ReadOnlyField
                    label="Notice Period End Date"
                    value={employee.noticePeriodEndDate ? formatDate(employee.noticePeriodEndDate) : ''}
                  />
                  <ReadOnlyField label="Employment Type" value={employee.employmentType} />
                  <ReadOnlyField label="Marital Status" value={employee.maritalStatus} />
                  <ReadOnlyField
                    label="Internship End Date"
                    value={employee.internshipEndDate ? formatDate(employee.internshipEndDate) : ''}
                  />
                  <ReadOnlyField label="Business Address" value={employee.businessAddress} />
                  <ReadOnlyField
                    label="Exit Date"
                    value={employee.exitDate ? formatDate(employee.exitDate) : ''}
                  />
                  <ReadOnlyField label="Login Allowed" value={employee.loginAllowed ? 'Yes' : 'No'} />
                  <ReadOnlyField
                    label="Receive email notifications"
                    value={employee.receiveEmailNotifications ? 'Yes' : 'No'}
                  />
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <ReadOnlyField label="Address" value={employee.address} />
                  <ReadOnlyField label="About" value={employee.about} />
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 flex flex-col items-center border border-gray-200">
                  <Avatar
                    profilePictureUrl={employee.profilePictureUrl}
                    fullName={employee.fullName}
                    size="w-24 h-24 sm:w-28 sm:h-28"
                    className="mb-4"
                  />
                  <div className="mt-4 text-center w-full">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 break-words">{employee.fullName}</div>
                    <div className="text-xs text-gray-400 mt-1 break-words">{employee.designationName}</div>
                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-sky-700/40 text-sky-200">
                        On Internship
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeView;


