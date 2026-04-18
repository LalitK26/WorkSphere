import React from 'react';
import { FiBriefcase } from 'react-icons/fi';

const ExperienceInformation = ({ data, updateData, errors }) => {
    // Generate years options (1-100 years)
    const yearsOptions = [
        { value: '', label: 'Select years of experience' },
        ...Array.from({ length: 100 }, (_, i) => ({
            value: i + 1,
            label: i + 1 === 1 ? '1 year' : `${i + 1} years`
        }))
    ];

    const handleExperienceTypeChange = (e) => {
        const selectedType = e.target.value;
        if (selectedType === 'fresher') {
            updateData({
                experienceType: 'fresher',
                fresherYears: 0, // Set to 0 to indicate fresher (backend uses this to clear experiencedYears)
                experiencedYears: null
            });
        } else if (selectedType === 'experienced') {
            updateData({
                experienceType: 'experienced',
                fresherYears: null,
                experiencedYears: null
            });
        } else {
            // Clear selection
            updateData({
                experienceType: null,
                fresherYears: null,
                experiencedYears: null
            });
        }
    };

    const handleExperiencedYearsChange = (e) => {
        const selectedValue = e.target.value;
        if (selectedValue === '' || selectedValue === null) {
            updateData({
                experiencedYears: null
            });
        } else {
            updateData({
                experiencedYears: parseInt(selectedValue)
            });
        }
    };

    const isFresher = data.experienceType === 'fresher';
    const isExperienced = data.experienceType === 'experienced';

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Experience Information</h2>
            <p className="text-gray-500 mb-6 text-sm">Please select your experience level</p>

            <div className="space-y-4">
                {/* Experience Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Experience Level</label>
                    <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="experienceType"
                                value="fresher"
                                checked={isFresher}
                                onChange={handleExperienceTypeChange}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-gray-700">Fresher</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="experienceType"
                                value="experienced"
                                checked={isExperienced}
                                onChange={handleExperienceTypeChange}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-gray-700">Experienced</span>
                        </label>
                    </div>
                </div>

                {/* Years of Experience Field (only shown for Experienced) */}
                {isExperienced && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Years *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiBriefcase className="text-gray-400" />
                            </div>
                            <select
                                name="experiencedYears"
                                value={data.experiencedYears !== null && data.experiencedYears !== undefined ? data.experiencedYears : ''}
                                onChange={handleExperiencedYearsChange}
                                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.experiencedYears
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                    }`}
                            >
                                {yearsOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.experiencedYears && <p className="text-red-500 text-xs mt-1">{errors.experiencedYears}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExperienceInformation;
