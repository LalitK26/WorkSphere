import apiClient from './apiClient';

const aadhaarKycService = {
    // Generate OTP for Aadhaar verification
    generateOtp: async (aadhaarNumber) => {
        const response = await apiClient.post('/recruitment/aadhaar-kyc/generate-otp', {
            aadhaarNumber: aadhaarNumber
        });
        // console.log('generateOtp service - Raw response:', response);
        // console.log('generateOtp service - Response data:', response.data);

        // Validate response contains clientId
        if (!response.data || !response.data.clientId) {
            console.error('Missing clientId in generateOtp response:', response.data);
            throw new Error('Failed to establish OTP session. Please try again.');
        }

        return response.data;
    },

    // Submit OTP and verify Aadhaar
    submitOtp: async (clientId, otp) => {
        const payload = {
            clientId: clientId,
            otp: otp
        };
        // console.log('submitOtp service - Sending payload:', payload);
        const response = await apiClient.post('/recruitment/aadhaar-kyc/submit-otp', payload);
        return response.data;
    }
};

export default aadhaarKycService;

