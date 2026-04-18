import React, { useEffect, useState } from 'react';
import Modal from '../UI/Modal';
import { formatDate } from '../../utils/formatters';
import { getFullImageUrl } from '../../utils/imageUrl';

const LeaveDetailsModal = ({ leave, isAdmin, canUpdate, canDelete, hasAllUpdatePermission, isOpen, onClose, onUpdateStatus, onDelete, updating }) => {
  const [status, setStatus] = useState(leave?.status || 'PENDING');

  useEffect(() => {
    setStatus(leave?.status || 'PENDING');
  }, [leave]);

  if (!leave) {
    return null;
  }

  const durationText = () => {
    if (leave.durationType === 'FIRST_HALF') return 'First Half';
    if (leave.durationType === 'SECOND_HALF') return 'Second Half';
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${leave.durationType === 'MULTIPLE' ? 'Multiple Days' : 'Full Day'} (${days} day${days > 1 ? 's' : ''})`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave Details" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Detail label="Employee" value={leave.userFullName} />
          <Detail
            label="Date Range"
            value={`${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`}
          />
          <Detail label="Duration" value={durationText()} />
          <Detail label="Leave Type" value={leave.leaveTypeName} />
          <Detail label="Paid / Unpaid" value={leave.paidStatus || 'N/A'} />
          <Detail label="Status" value={leave.status} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Reason</h4>
          <div className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 bg-gray-50 min-h-[80px]">
            {leave.reason || '—'}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Attached File</h4>
          {leave.fileUrl ? (
            <a
              href={getFullImageUrl(leave.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm hover:text-blue-800 break-all"
            >
              {leave.fileUrl}
            </a>
          ) : (
            <p className="text-sm text-gray-600">No attachment provided</p>
          )}
        </div>

        {canUpdate ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Update Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        ) : (
          <Detail label="Current Status" value={leave.status} />
        )}

        <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 flex-col-reverse sm:flex-row sm:items-center">
          {canDelete && (
            <button
              type="button"
              className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200 text-sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this leave? This action cannot be undone.')) {
                  onDelete?.();
                }
              }}
              disabled={updating}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
            disabled={updating}
          >
            Close
          </button>
          {hasAllUpdatePermission && (
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => onUpdateStatus(status)}
              disabled={status === leave.status || updating}
            >
              {updating ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
);

export default LeaveDetailsModal;


