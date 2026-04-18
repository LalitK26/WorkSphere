import React from 'react';
import { FiCheckCircle, FiEdit2 } from 'react-icons/fi';

const Review = ({ data, setStep }) => {
    const Section = ({ title, step, children, isEditable = true }) => (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6 relative">
            <div className="flex justify-between items-start mb-4 border-b pb-2">
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
                {isEditable && (
                    <button
                        onClick={() => setStep(step)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                    >
                        <FiEdit2 />
                    </button>
                )}
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="text-blue-600 text-3xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Review Your Information</h2>
                <p className="text-gray-500">Please review all details before submitting your profile</p>
            </div>

            <Section title="Personal Information" step={1}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Full Name:</span> <span className="font-medium text-gray-900">{data.firstName} {data.lastName}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{data.email}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{data.phoneNumber}</span></div>
                </div>
            </Section>

            <Section title="Address Information" step={1} isEditable={false}>
                <div className="text-sm">
                    <p className="font-medium text-gray-900">{data.streetAddress}</p>
                    <p className="text-gray-600">{data.city}, {data.state} {data.zipCode}</p>
                    <p className="text-gray-600">{data.country}</p>
                </div>
            </Section>

            <Section title="Education Details" step={2}>
                {data.education && data.education.length > 0 ? (
                    <div className="space-y-3">
                        {data.education.map((edu, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                                <p className="font-semibold text-gray-900">{edu.degree} in {edu.major}</p>
                                <p className="text-gray-600">{edu.collegeName}, {edu.university}</p>
                                <p className="text-gray-500 text-xs">{edu.startDate} - {edu.endDate}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm italic">No education details added</p>
                )}
            </Section>

            <Section title="Documents" step={3}>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">Resume:</span>
                        <span className="font-medium text-blue-600 truncate max-w-xs">{data.resumeUrl || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">Portfolio:</span>
                        <span className="font-medium text-blue-600 truncate max-w-xs">{data.portfolioUrl || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-500 w-24">LinkedIn:</span>
                        <span className="font-medium text-blue-600 truncate max-w-xs">{data.linkedInUrl || 'Not provided'}</span>
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default Review;
