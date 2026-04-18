import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { leaveTypeService } from '../../api/leaveService';
import { designationService } from '../../api/designationService';
import { departmentService } from '../../api/departmentService';
import MultiSelectDropdown from './MultiSelectDropdown';

const AddNewLeaveType = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    allotmentType: 'MONTHLY',
    noOfLeaves: '0',
    paidStatus: 'PAID',
    effectiveAfterValue: '0',
    effectiveAfterUnit: 'DAYS',
    unusedLeavesAction: 'CARRY_FORWARD',
    overUtilizationAction: 'DO_NOT_ALLOW',
    allowedInProbation: false,
    allowedInNoticePeriod: false,
    genders: [],
    maritalStatuses: [],
    departments: [],
    designations: [],
  });

  const genderOptions = ['Male', 'Female', 'Others'];
  const maritalStatusOptions = ['Single', 'Married', 'Widower', 'Widow', 'Separate', 'Divorced'];

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    try {
      const [departmentsRes, designationsRes] = await Promise.all([
        departmentService.getAll(),
        designationService.getAll(),
      ]);
      const departmentNames = (departmentsRes.data || [])
        .map((dept) => dept.name)
        .filter(Boolean);
      setDepartments(departmentNames);
      setDesignations(designationsRes.data || []);
    } catch (error) {
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      allotmentType: 'MONTHLY',
      noOfLeaves: '0',
      paidStatus: 'PAID',
      effectiveAfterValue: '0',
      effectiveAfterUnit: 'DAYS',
      unusedLeavesAction: 'CARRY_FORWARD',
      overUtilizationAction: 'DO_NOT_ALLOW',
      allowedInProbation: false,
      allowedInNoticePeriod: false,
      genders: [],
      maritalStatuses: [],
      departments: [],
      designations: [],
    });
    setActiveTab('general');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNoOfLeavesChange = (value) => {
    const sanitized = value.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
    setFormData((prev) => ({ ...prev, noOfLeaves: formatted }));
  };

  const clampEffectiveAfterValue = (value, unit) => {
    if (value === '') return '';
    let numericValue = parseInt(value, 10);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      numericValue = 0;
    }
    if (unit === 'MONTHS' && numericValue > 12) {
      numericValue = 12;
    }
    return `${numericValue}`;
  };

  const handleEffectiveAfterValueChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '');
    setFormData((prev) => ({
      ...prev,
      effectiveAfterValue: clampEffectiveAfterValue(digitsOnly, prev.effectiveAfterUnit),
    }));
  };

  const handleEffectiveAfterUnitChange = (unit) => {
    setFormData((prev) => ({
      ...prev,
      effectiveAfterUnit: unit,
      effectiveAfterValue: clampEffectiveAfterValue(prev.effectiveAfterValue, unit),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        noOfLeaves: formData.noOfLeaves === '' ? 0 : parseFloat(formData.noOfLeaves),
        effectiveAfterValue: formData.effectiveAfterValue === '' ? 0 : parseInt(formData.effectiveAfterValue, 10),
      };
      const response = await leaveTypeService.create(payload);
      onSave(response.data);
      resetForm();
    } catch (error) {
      alert(error?.response?.data?.message || 'Error creating leave type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Leave Type" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entitlement')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'entitlement'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Entitlement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applicability')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'applicability'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Applicability
          </button>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">General</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="E.g. Sick, Casual"
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Allotment Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.allotmentType}
                onChange={(e) => setFormData({ ...formData, allotmentType: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="MONTHLY">Monthly Leave Type</option>
                <option value="YEARLY">Yearly Leave Type</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No of {formData.allotmentType === 'MONTHLY' ? 'Monthly' : 'Yearly'} Leaves <span className="text-gray-400">?</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.noOfLeaves}
                onChange={(e) => handleNoOfLeavesChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Paid Status <span className="text-gray-400">?</span>
              </label>
              <select
                required
                value={formData.paidStatus}
                onChange={(e) => setFormData({ ...formData, paidStatus: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>
        )}

        {/* Entitlement Tab */}
        {activeTab === 'entitlement' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Entitlement</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective After <span className="text-gray-400">?</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.effectiveAfterValue}
                  onChange={(e) => handleEffectiveAfterValueChange(e.target.value)}
                  className="w-24 border border-gray-300 rounded px-3 py-2 text-gray-900"
                />
                <select
                  value={formData.effectiveAfterUnit}
                  onChange={(e) => handleEffectiveAfterUnitChange(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="DAYS">Day(s)</option>
                  <option value="MONTHS">Month(s)</option>
                </select>
                <span className="flex items-center text-gray-700">of Joining</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowedInProbation"
                checked={formData.allowedInProbation}
                onChange={(e) => setFormData({ ...formData, allowedInProbation: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="allowedInProbation" className="text-sm font-medium text-gray-700">
                Allowed in probation <span className="text-gray-400">?</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unused Leaves <span className="text-gray-400">?</span>
              </label>
              <select
                value={formData.unusedLeavesAction}
                onChange={(e) => setFormData({ ...formData, unusedLeavesAction: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="CARRY_FORWARD">Carry Forward</option>
                <option value="LAPSE">Lapse</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Over Utilization <span className="text-gray-400">?</span>
              </label>
              <select
                value={formData.overUtilizationAction}
                onChange={(e) => setFormData({ ...formData, overUtilizationAction: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="DO_NOT_ALLOW">Do not allow</option>
                <option value="ALLOW_PAID">Allow and mark as paid</option>
                <option value="ALLOW_UNPAID">Allow and mark as unpaid</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowedInNoticePeriod"
                checked={formData.allowedInNoticePeriod}
                onChange={(e) => setFormData({ ...formData, allowedInNoticePeriod: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="allowedInNoticePeriod" className="text-sm font-medium text-gray-700">
                Allowed in notice period <span className="text-gray-400">?</span>
              </label>
            </div>
          </div>
        )}

        {/* Applicability Tab */}
        {activeTab === 'applicability' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Applicability</h3>
            <MultiSelectDropdown
              label="Gender *"
              placeholder="Select gender"
              options={genderOptions.map((gender) => ({ label: gender, value: gender }))}
              selected={formData.genders}
              onChange={(values) => setFormData({ ...formData, genders: values })}
            />

            <MultiSelectDropdown
              label="Marital Status *"
              placeholder="Select marital status"
              options={maritalStatusOptions.map((status) => ({ label: status, value: status }))}
              selected={formData.maritalStatuses}
              onChange={(values) => setFormData({ ...formData, maritalStatuses: values })}
            />

            <MultiSelectDropdown
              label="Department *"
              placeholder="Select departments"
              options={departments.map((dept) => ({ label: dept, value: dept }))}
              selected={formData.departments}
              onChange={(values) => setFormData({ ...formData, departments: values })}
            />

            <MultiSelectDropdown
              label="Designation *"
              placeholder="Select designations"
              options={designations.map((desig) => ({ label: desig.name, value: desig.id }))}
              selected={formData.designations}
              onChange={(values) => setFormData({ ...formData, designations: values })}
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            ✓ Save
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddNewLeaveType;

