import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiBook } from 'react-icons/fi';

const EducationDetails = ({ data, updateData, errors }) => {
    const [showForm, setShowForm] = useState(false);
    const [currentEntry, setCurrentEntry] = useState({
        collegeName: '',
        university: '',
        degree: '',
        major: '',
        startDate: '',
        endDate: '',
        cgpaOrPercentage: '',
        studyMode: 'Full-time',
        city: '',
        state: '',
        country: '',
        passingYear: '',
        activeBacklogs: ''
    });
    const [entryErrors, setEntryErrors] = useState({});

    const validateEntry = () => {
        const errs = {};
        // collegeName hidden, using university
        if (!currentEntry.university) errs.university = 'University is required';
        if (!currentEntry.degree) errs.degree = 'Degree is required';
        if (!currentEntry.major) errs.major = 'Major is required';
        if (!currentEntry.startDate) errs.startDate = 'Start Date is required';
        if (!currentEntry.endDate) errs.endDate = 'End Date is required';
        if (!currentEntry.cgpaOrPercentage) errs.cgpaOrPercentage = 'CGPA/Percentage is required';
        if (!currentEntry.city) errs.city = 'City is required';
        if (!currentEntry.state) errs.state = 'State is required';
        if (!currentEntry.country) errs.country = 'Country is required';
        if (!currentEntry.passingYear) errs.passingYear = 'Passing Year is required';
        if (currentEntry.activeBacklogs === '' || currentEntry.activeBacklogs === null || currentEntry.activeBacklogs === undefined) {
            errs.activeBacklogs = 'Active Backlogs is required';
        } else if (Number(currentEntry.activeBacklogs) < 0) {
            errs.activeBacklogs = 'Must be non-negative';
        }

        setEntryErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleAdd = () => {
        if (validateEntry()) {
            const entryToAdd = {
                ...currentEntry,
                collegeName: currentEntry.collegeName || currentEntry.university,
                // Ensure passingYear is a number if it's a string
                passingYear: currentEntry.passingYear ? (typeof currentEntry.passingYear === 'string' ? parseInt(currentEntry.passingYear, 10) : currentEntry.passingYear) : null,
                activeBacklogs: currentEntry.activeBacklogs !== '' ? parseInt(currentEntry.activeBacklogs, 10) : 0
            };
            const updatedEducation = [...(data.education || []), entryToAdd];
            updateData({ education: updatedEducation });
            setShowForm(false);
            setCurrentEntry({
                collegeName: '',
                university: '',
                degree: '',
                major: '',
                startDate: '',
                endDate: '',
                cgpaOrPercentage: '',
                studyMode: 'Full-time',
                city: '',
                state: '',
                country: '',
                passingYear: '',
                activeBacklogs: ''
            });
            setEntryErrors({});
        }
    };

    const handleDelete = (index) => {
        const updatedEducation = data.education.filter((_, i) => i !== index);
        updateData({ education: updatedEducation });
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-semibold">Education Details</h2>
                    <p className="text-gray-500 text-sm">Add information about your educational background</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <FiPlus className="mr-1" /> Add Education
                    </button>
                )}
            </div>

            {errors.education && <p className="text-red-500 text-sm mb-4">{errors.education}</p>}

            {/* List of added education */}
            <div className="space-y-4 mb-6">
                {data.education && data.education.map((edu, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                        <button
                            onClick={() => handleDelete(index)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                        >
                            <FiTrash2 />
                        </button>
                        <h3 className="font-semibold text-gray-800">{edu.degree} in {edu.major}</h3>
                        <p className="text-gray-600 text-sm">{edu.collegeName}, {edu.university}</p>
                        <p className="text-gray-500 text-xs mt-1">
                            {edu.startDate} - {edu.endDate} | {edu.passingYear}
                        </p>
                    </div>
                ))}
            </div>

            {/* Add New Entry Form */}
            {showForm && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-medium mb-4 flex items-center"><FiBook className="mr-2" /> Add New Education</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Row 1: Degree & Major */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
                            <select
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.degree ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.degree}
                                onChange={e => setCurrentEntry({ ...currentEntry, degree: e.target.value })}
                            >
                                <option value="">Select degree</option>
                                <option value="B.E/B.Tech">B.E/B.Tech</option>
                                <option value="M.E/M.Tech">M.E/M.Tech</option>
                                <option value="Diploma">Diploma</option>
                                <option value="MCA">MCA</option>
                                <option value="BCA">BCA</option>
                                <option value="SSC">SSC</option>
                                <option value="HSC">HSC</option>
                            </select>
                            {entryErrors.degree && <p className="text-red-500 text-xs mt-1">{entryErrors.degree}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stream / Specialization *</label>
                            <input
                                placeholder="Enter your stream (e.g., Computer Science)"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.major ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.major}
                                onChange={e => setCurrentEntry({ ...currentEntry, major: e.target.value })}
                            />
                            {entryErrors.major && <p className="text-red-500 text-xs mt-1">{entryErrors.major}</p>}
                        </div>

                        {/* Row 2: Institution */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Institute / University Name *</label>
                            <input
                                placeholder="Stanford University"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.university ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.university}
                                onChange={e => setCurrentEntry({ ...currentEntry, university: e.target.value })}
                            />
                            {entryErrors.university && <p className="text-red-500 text-xs mt-1">{entryErrors.university}</p>}
                        </div>

                        {/* Row 3: Dates */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                            <input
                                type="date"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.startDate ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.startDate}
                                onChange={e => setCurrentEntry({ ...currentEntry, startDate: e.target.value })}
                            />
                            {entryErrors.startDate && <p className="text-red-500 text-xs mt-1">{entryErrors.startDate}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                            <input
                                type="date"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.endDate ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.endDate}
                                onChange={e => setCurrentEntry({ ...currentEntry, endDate: e.target.value })}
                            />
                            {entryErrors.endDate && <p className="text-red-500 text-xs mt-1">{entryErrors.endDate}</p>}
                        </div>

                        {/* Row 4: Percentage & Mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Percentage *</label>
                            <input
                                placeholder="Enter percentage (e.g., 85)"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.cgpaOrPercentage ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.cgpaOrPercentage}
                                onChange={e => {
                                    // Validate Percentage: Only numbers and decimal point
                                    const val = e.target.value;
                                    if (val === '' || /^[0-9.]*$/.test(val)) {
                                        setCurrentEntry({ ...currentEntry, cgpaOrPercentage: val });
                                    }
                                }}
                            />
                            {entryErrors.cgpaOrPercentage && <p className="text-red-500 text-xs mt-1">{entryErrors.cgpaOrPercentage}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Active Backlogs *</label>
                            <input
                                type="number"
                                min="0" // HTML5 validation
                                placeholder="0"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 no-spinner ${entryErrors.activeBacklogs ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.activeBacklogs}
                                onChange={e => {
                                    const val = e.target.value;
                                    // Prevent decimals/negatives if typed manually (though type=number helps)
                                    if (val === '' || (/^\d+$/.test(val))) {
                                        setCurrentEntry({ ...currentEntry, activeBacklogs: val });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    // Prevent invalid characters for integer input
                                    if (['e', 'E', '+', '-', '.', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            {entryErrors.activeBacklogs && <p className="text-red-500 text-xs mt-1">{entryErrors.activeBacklogs}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                            <select
                                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                                value={currentEntry.studyMode}
                                onChange={e => setCurrentEntry({ ...currentEntry, studyMode: e.target.value })}
                            >
                                <option>Full-time</option>
                                <option>Part-time</option>
                                <option>Distance</option>
                            </select>
                        </div>

                        {/* Row 5: City, State, Country */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                            <input
                                placeholder="Enter city"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.city}
                                onChange={e => setCurrentEntry({ ...currentEntry, city: e.target.value })}
                            />
                            {entryErrors.city && <p className="text-red-500 text-xs mt-1">{entryErrors.city}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                            <input
                                placeholder="Enter state"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.state}
                                onChange={e => setCurrentEntry({ ...currentEntry, state: e.target.value })}
                            />
                            {entryErrors.state && <p className="text-red-500 text-xs mt-1">{entryErrors.state}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                            <input
                                placeholder="Enter country"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${entryErrors.country ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.country}
                                onChange={e => {
                                    // Validate Country: Only alphabets and spaces
                                    const val = e.target.value;
                                    if (val === '' || /^[A-Za-z\s]*$/.test(val)) {
                                        setCurrentEntry({ ...currentEntry, country: val });
                                    }
                                }}
                            />
                            {entryErrors.country && <p className="text-red-500 text-xs mt-1">{entryErrors.country}</p>}
                        </div>

                        {/* Row 6: Year of Passing */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year of Passing *</label>
                            <input
                                type="number"
                                placeholder="YYYY"
                                className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 no-spinner ${entryErrors.passingYear ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentEntry.passingYear}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val.length <= 4) {
                                        setCurrentEntry({ ...currentEntry, passingYear: val });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (['e', 'E', '+', '-', '.', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            {entryErrors.passingYear && <p className="text-red-500 text-xs mt-1">{entryErrors.passingYear}</p>}
                        </div>

                    </div>
                    <div className="flex justify-end mt-4 space-x-3">
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EducationDetails;
