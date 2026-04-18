import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { leaveService } from '../../api/leaveService';
import { employeeService } from '../../api/employeeService';
import Avatar from '../UI/Avatar';
import { formatDate } from '../../utils/formatters';

const MyLeavesView = forwardRef(({ user }, ref) => {
  const [employee, setEmployee] = useState(null);
  const [quota, setQuota] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const quotaRes = await leaveService.getQuota();
      setQuota(quotaRes.data || []);

      if (user?.userId) {
        try {
          const employeeRes = await employeeService.getById(user.userId);
          setEmployee(employeeRes.data || null);
        } catch (err) {
          setEmployee({
            fullName: user.fullName,
            designationName: user.role,
          });
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const totalRemaining = quota.reduce((sum, q) => sum + (q.remainingLeaves || 0), 0);

  useImperativeHandle(ref, () => ({
    refresh: loadData,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {employee && (
          <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
            <Avatar
              profilePictureUrl={employee.profilePictureUrl}
              fullName={employee.fullName}
              size="w-20 h-20"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{employee.fullName}</h2>
              <p className="text-sm text-gray-600">{employee.designationName || 'Employee'}</p>
              {(employee.joiningDate || employee.createdAt) && (
                <p className="text-xs text-gray-500 mt-1">
                  Joined on {formatDate(employee.joiningDate || employee.createdAt)}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Remaining Leaves</h3>
          <div className="text-4xl font-bold text-blue-600">{totalRemaining}</div>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Leaves Quota</h3>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No of Leaves
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Leaves Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Leaves
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Over Utilized
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unused Leaves
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quota.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No leave quota available
                    </td>
                  </tr>
                ) : (
                  quota.map((q) => (
                    <tr key={q.leaveTypeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          {q.leaveTypeName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.noOfLeaves}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {q.monthlyLimit !== null ? q.monthlyLimit : '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.totalLeavesTaken}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.remainingLeaves}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.overUtilized}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.unusedLeaves}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

export default MyLeavesView;


