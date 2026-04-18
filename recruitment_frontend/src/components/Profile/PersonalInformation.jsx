import React, { useEffect } from 'react';
import { FiUser, FiMail, FiPhone } from 'react-icons/fi';

const PersonalInformation = ({ data, updateData, errors, aadhaarVerified = false, aadhaarData = null, aadhaarVerifiedFields = {} }) => {
    // Determine which fields are read-only based on Aadhaar verification
    const isReadOnly = (fieldName) => {
        // If aadhaarVerifiedFields is provided (from MyProfile), use it
        if (aadhaarVerifiedFields && Object.keys(aadhaarVerifiedFields).length > 0) {
            return aadhaarVerifiedFields[fieldName] || false;
        }
        // Otherwise, if aadhaarData is provided (from CompleteProfile), check if field exists
        if (aadhaarVerified && aadhaarData) {
            const readOnlyFields = ['firstName', 'lastName', 'middleName', 'dateOfBirth'];
            return readOnlyFields.includes(fieldName);
        }
        return false;
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Personal Information</h2>
            <p className="text-gray-500 mb-6 text-sm">Please provide your basic details as they appear on official documents</p>
            
            {aadhaarVerified && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                        <span className="font-semibold">✓ Aadhaar Verified:</span> Some fields are auto-filled and locked from Aadhaar verification.
                    </p>
                </div>
            )}

            {/* Name Row: First, Middle, Last */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                        type="text"
                        name="firstName"
                        value={data.firstName || ''}
                        onChange={(e) => updateData({ firstName: e.target.value })}
                        readOnly={isReadOnly('firstName')}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                        } ${isReadOnly('firstName') ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="Sarah"
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    {isReadOnly('firstName') && (
                        <p className="text-xs text-gray-500 mt-1">Verified via Aadhaar - cannot be edited</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                        type="text"
                        name="middleName"
                        value={data.middleName || ''}
                        onChange={(e) => updateData({ middleName: e.target.value })}
                        readOnly={isReadOnly('middleName')}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                            isReadOnly('middleName') ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder="Enter middle name"
                    />
                    {isReadOnly('middleName') && (
                        <p className="text-xs text-gray-500 mt-1">Verified via Aadhaar - cannot be edited</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                        type="text"
                        name="lastName"
                        value={data.lastName || ''}
                        onChange={(e) => updateData({ lastName: e.target.value })}
                        readOnly={isReadOnly('lastName')}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                            errors.lastName ? 'border-red-500' : 'border-gray-300'
                        } ${isReadOnly('lastName') ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="Johnson"
                    />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    {isReadOnly('lastName') && (
                        <p className="text-xs text-gray-500 mt-1">Verified via Aadhaar - cannot be edited</p>
                    )}
                </div>
            </div>

            {/* Email Row */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-400" />
                    </div>
                    <input
                        type="email"
                        name="email"
                        value={data.email || ''}
                        readOnly
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                        placeholder="sarah.johnson@email.com"
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">This email is verified and cannot be changed</p>
            </div>

            {/* Date of Birth Row */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                    type="date"
                    name="dateOfBirth"
                    value={data.dateOfBirth || ''}
                    onChange={(e) => updateData({ dateOfBirth: e.target.value })}
                    readOnly={isReadOnly('dateOfBirth')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                        isReadOnly('dateOfBirth') ? 'bg-gray-50 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                />
                {isReadOnly('dateOfBirth') && (
                    <p className="text-xs text-gray-500 mt-1">Verified via Aadhaar - cannot be edited</p>
                )}
            </div>

            {/* Phone Row */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-gray-400" />
                    </div>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={data.phoneNumber || ''}
                        onChange={(e) => updateData({ phoneNumber: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="+1 (555) 123-4567"
                    />
                </div>
                {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
            </div>
        </div>
    );
};

export default PersonalInformation;
