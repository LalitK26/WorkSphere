import React from 'react';
import { FiMapPin, FiHome } from 'react-icons/fi';

const AddressInformation = ({ data, updateData, errors, aadhaarVerified = false, aadhaarData = null, aadhaarVerifiedFields = {} }) => {
    // Determine which fields are read-only based on Aadhaar verification
    const isReadOnly = (fieldName) => {
        // If aadhaarVerifiedFields is provided (from MyProfile), use it
        if (aadhaarVerifiedFields && Object.keys(aadhaarVerifiedFields).length > 0) {
            return aadhaarVerifiedFields[fieldName] || false;
        }
        // Otherwise, if aadhaarData is provided (from CompleteProfile), check if field exists
        if (aadhaarVerified && aadhaarData) {
            const readOnlyFields = ['streetAddress', 'city', 'state', 'zipCode'];
            return readOnlyFields.includes(fieldName);
        }
        return false;
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Address Information</h2>
            <p className="text-gray-500 mb-4 text-sm">Your current residential address for correspondence</p>

            {aadhaarVerified && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                        <span className="font-semibold">✓ Aadhaar Verified:</span> Address fields are auto-filled and locked from Aadhaar verification.
                    </p>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-6">
                <p className="text-blue-800 text-sm">
                    Please enter your residential address exactly as mentioned on your Aadhaar card. This information is mandatory for verification.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiMapPin className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            name="streetAddress"
                            value={data.streetAddress || ''}
                            onChange={(e) => updateData({ streetAddress: e.target.value })}
                            readOnly={isReadOnly('streetAddress')}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.streetAddress ? 'border-red-500' : 'border-gray-300'
                                } ${isReadOnly('streetAddress') ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            placeholder="123 Main Street, Apt 4B"
                        />
                    </div>
                    {errors.streetAddress && <p className="text-red-500 text-xs mt-1">{errors.streetAddress}</p>}
                    {isReadOnly('streetAddress') && (
                        <p className="text-xs text-gray-500 mt-1">Verified via Aadhaar - cannot be edited</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddressInformation;
