package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.recruitment.dto.response.AadhaarGenerateOtpResponse;
import com.dashboard.app.recruitment.dto.response.AadhaarSubmitOtpResponse;
import com.dashboard.app.recruitment.dto.response.AadhaarDataResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;

@Service
public class AadhaarKycService {

    private static final Logger logger = LoggerFactory.getLogger(AadhaarKycService.class);

    @Value("${quickekyc.api-key}")
    private String apiKey;

    @Value("${quickekyc.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AadhaarKycService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Generate OTP for Aadhaar verification
     * 
     * @param aadhaarNumber Aadhaar number (12 digits)
     * @return Response containing clientId and message
     */
    public AadhaarGenerateOtpResponse generateOtp(String aadhaarNumber) {
        try {
            // Validate API key is configured
            if (apiKey == null || apiKey.trim().isEmpty() || "xyz".equals(apiKey)) {
                logger.error("QuickeKYC API key is not configured properly");
                throw new BadRequestException(
                        "Aadhaar verification service is not configured. Please contact administrator.");
            }

            // Validate Aadhaar number format (12 digits)
            if (aadhaarNumber == null || !aadhaarNumber.matches("^\\d{12}$")) {
                throw new BadRequestException("Invalid Aadhaar number. Must be exactly 12 digits.");
            }

            String url = baseUrl + "/aadhaar-v2/generate-otp";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // QuickeKYC requires API key in request body as 'key', not in headers
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("key", apiKey);
            requestBody.put("id_number", aadhaarNumber);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            logger.info("Calling QuickeKYC API to generate OTP for Aadhaar number: {}***",
                    aadhaarNumber.substring(0, 4));
            logger.debug("Request URL: {}", url);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();

                logger.debug("QuickeKYC Generate OTP Response: {}", responseBody);

                // Check for explicit failure status in response body
                if (responseBody.containsKey("status")) {
                    String status = String.valueOf(responseBody.get("status"));
                    if ("failed".equalsIgnoreCase(status) || "error".equalsIgnoreCase(status)
                            || "false".equalsIgnoreCase(status)) {
                        String msg = responseBody.containsKey("message") ? String.valueOf(responseBody.get("message"))
                                : "Unknown error from Aadhaar provider";
                        logger.error("QuickeKYC returned explicit failure: {}", msg);
                        throw new BadRequestException(msg);
                    }
                }

                AadhaarGenerateOtpResponse otpResponse = new AadhaarGenerateOtpResponse();

                // QuickeKYC returns data in 'data' object, check both root and data object
                Map<String, Object> dataObject = null;
                if (responseBody.containsKey("data") && responseBody.get("data") instanceof Map) {
                    dataObject = (Map<String, Object>) responseBody.get("data");
                    logger.debug("Data object found: {}", dataObject.keySet());
                }

                // improved ID extraction: precise priority (uuid preferably, then request_id)
                String extractedId = null;

                logger.info("Generate OTP Response Keys: Data={}, Root={}",
                        dataObject != null ? dataObject.keySet() : "null",
                        responseBody.keySet());

                // 1. Try to find ID in 'data' object first
                if (dataObject != null) {
                    if (dataObject.containsKey("request_id"))
                        extractedId = String.valueOf(dataObject.get("request_id"));
                    else if (dataObject.containsKey("requestId"))
                        extractedId = String.valueOf(dataObject.get("requestId"));
                    else if (dataObject.containsKey("uuid"))
                        extractedId = String.valueOf(dataObject.get("uuid"));
                    else if (dataObject.containsKey("client_id"))
                        extractedId = String.valueOf(dataObject.get("client_id"));
                    else if (dataObject.containsKey("clientId"))
                        extractedId = String.valueOf(dataObject.get("clientId"));
                }

                // 2. If not found in data, look in the root responseBody
                if (extractedId == null || extractedId.trim().isEmpty() || "null".equals(extractedId)) {
                    if (responseBody.containsKey("request_id"))
                        extractedId = String.valueOf(responseBody.get("request_id"));
                    else if (responseBody.containsKey("requestId"))
                        extractedId = String.valueOf(responseBody.get("requestId"));
                    else if (responseBody.containsKey("uuid"))
                        extractedId = String.valueOf(responseBody.get("uuid"));
                    else if (responseBody.containsKey("client_id"))
                        extractedId = String.valueOf(responseBody.get("client_id"));
                    else if (responseBody.containsKey("clientId"))
                        extractedId = String.valueOf(responseBody.get("clientId"));
                }

                if (extractedId != null && !extractedId.trim().isEmpty() && !"null".equals(extractedId)) {
                    otpResponse.setClientId(extractedId);
                    logger.info("Extracted clientId (UUID/RequestID): {}", extractedId);
                } else {
                    logger.warn("No ID found in response.");
                }

                // Extract message from root response
                if (responseBody.containsKey("message")) {
                    otpResponse.setMessage(responseBody.get("message").toString());
                } else if (responseBody.containsKey("status")
                        && "success".equalsIgnoreCase(responseBody.get("status").toString())) {
                    otpResponse.setMessage("OTP sent successfully to your registered mobile number");
                }

                logger.info("OTP generated. ClientId found: {}", otpResponse.getClientId() != null);

                // CRITICAL: Ensure clientId is not null before returning
                if (otpResponse.getClientId() == null || otpResponse.getClientId().trim().isEmpty()) {
                    logger.error("ClientId is null or empty after extraction. Response Body: {}", responseBody);
                    // Check if there is a message we missed
                    if (otpResponse.getMessage() != null && !otpResponse.getMessage().isEmpty()) {
                        // Debug info: append keys to message to see what we missed
                        throw new BadRequestException("Provider Error: " + otpResponse.getMessage() + " [Keys: "
                                + responseBody.keySet() + "]");
                    }
                    throw new BadRequestException(
                            "Failed to establish OTP session. Provider response format unrecognized. Keys: "
                                    + responseBody.keySet());
                }

                return otpResponse;
            } else {
                throw new BadRequestException("Failed to generate OTP. Please try again.");
            }

        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            String errorMessage = extractErrorMessage(responseBody);

            // Log error without exposing sensitive data
            logger.error("QuickeKYC API error - Status: {}, Error: {}", e.getStatusCode(),
                    errorMessage != null ? errorMessage : "Unknown error");

            // Handle 401 Unauthorized specifically
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new BadRequestException(
                        "Authentication failed. Please verify the API key is correct and active.");
            }

            throw new BadRequestException(errorMessage != null ? errorMessage
                    : "Invalid Aadhaar number or API error. Please check your Aadhaar number and try again.");
        } catch (HttpServerErrorException e) {
            logger.error("Server error while generating OTP: {}", e.getMessage());
            throw new BadRequestException(
                    "Aadhaar verification service is temporarily unavailable. Please try again later.");
        } catch (ResourceAccessException e) {
            logger.error("Network error while generating OTP: {}", e.getMessage());
            throw new BadRequestException("Network error. Please check your internet connection and try again.");
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error while generating OTP: {}", e.getMessage(), e);
            throw new BadRequestException("An unexpected error occurred. Please try again later.");
        }
    }

    /**
     * Submit OTP and verify Aadhaar
     * 
     * @param clientId Request ID (client_id) from generate OTP response
     * @param otp      OTP entered by user
     * @return Response containing Aadhaar data (name, DOB, address)
     */
    public AadhaarSubmitOtpResponse submitOtp(String clientId, String otp) {
        try {
            // Validate API key is configured
            if (apiKey == null || apiKey.trim().isEmpty() || "xyz".equals(apiKey)) {
                logger.error("QuickeKYC API key is not configured properly");
                throw new BadRequestException(
                        "Aadhaar verification service is not configured. Please contact administrator.");
            }

            // Validate inputs
            if (clientId == null || clientId.trim().isEmpty()) {
                throw new BadRequestException("Request ID is required.");
            }
            if (otp == null || !otp.matches("^\\d{6}$")) {
                throw new BadRequestException("Invalid OTP. Must be exactly 6 digits.");
            }

            String url = baseUrl + "/aadhaar-v2/submit-otp";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // QuickeKYC requires: key, request_id, and otp in request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("key", apiKey);

            // Send request_id as number if it's numeric, otherwise string
            if (clientId.matches("^\\d+$")) {
                try {
                    requestBody.put("request_id", Long.parseLong(clientId));
                } catch (NumberFormatException e) {
                    requestBody.put("request_id", clientId);
                }
            } else {
                requestBody.put("request_id", clientId);
            }

            requestBody.put("otp", otp);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            logger.info("Calling QuickeKYC API to submit OTP for requestId: {}***",
                    clientId.length() > 4 ? clientId.substring(clientId.length() - 4) : "***");

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();

                // QuickeKYC returns status in root response, data in 'data' object
                // Check root status field for success
                boolean success = false;
                String status = null;
                if (responseBody.containsKey("status")) {
                    status = responseBody.get("status").toString();
                    success = "success".equalsIgnoreCase(status) || "verified".equalsIgnoreCase(status)
                            || "true".equalsIgnoreCase(status);
                }

                if (!success) {
                    String errorMessage = extractErrorMessage(responseBody);
                    // Differentiate error types
                    if (errorMessage != null) {
                        String lowerError = errorMessage.toLowerCase();
                        if (lowerError.contains("expired") || lowerError.contains("timeout")) {
                            throw new BadRequestException("OTP has expired. Please request a new OTP.");
                        } else if (lowerError.contains("invalid") || lowerError.contains("incorrect")) {
                            throw new BadRequestException("Invalid OTP. Please check and try again.");
                        } else {
                            throw new BadRequestException(errorMessage);
                        }
                    }
                    throw new BadRequestException("OTP verification failed. Please check your OTP and try again.");
                }

                // Extract Aadhaar data from 'data' object (QuickeKYC format)
                AadhaarSubmitOtpResponse otpResponse = new AadhaarSubmitOtpResponse();
                AadhaarDataResponse aadhaarData = new AadhaarDataResponse();

                // QuickeKYC returns data in 'data' object
                Map<String, Object> dataObject = null;
                if (responseBody.containsKey("data") && responseBody.get("data") instanceof Map) {
                    dataObject = (Map<String, Object>) responseBody.get("data");
                }

                if (dataObject == null) {
                    logger.warn("QuickeKYC response does not contain 'data' object");
                    throw new BadRequestException("Invalid response format from Aadhaar verification service.");
                }

                // Extract full_name from data object (QuickeKYC uses 'full_name', not 'name')
                if (dataObject.containsKey("full_name")) {
                    String fullName = dataObject.get("full_name").toString();
                    aadhaarData.setFullName(fullName);

                    // Try to split name into first, middle, last
                    String[] nameParts = fullName.trim().split("\\s+");
                    if (nameParts.length >= 2) {
                        aadhaarData.setFirstName(nameParts[0]);
                        aadhaarData.setLastName(nameParts[nameParts.length - 1]);
                        if (nameParts.length > 2) {
                            // Middle name is everything between first and last
                            StringBuilder middleName = new StringBuilder();
                            for (int i = 1; i < nameParts.length - 1; i++) {
                                if (middleName.length() > 0)
                                    middleName.append(" ");
                                middleName.append(nameParts[i]);
                            }
                            aadhaarData.setMiddleName(middleName.toString());
                        }
                    } else {
                        // If only one name part, treat as first name
                        aadhaarData.setFirstName(fullName);
                        aadhaarData.setLastName("");
                    }
                } else if (dataObject.containsKey("name")) {
                    // Fallback to 'name' if 'full_name' not available
                    String fullName = dataObject.get("name").toString();
                    aadhaarData.setFullName(fullName);
                    String[] nameParts = fullName.trim().split("\\s+");
                    if (nameParts.length >= 2) {
                        aadhaarData.setFirstName(nameParts[0]);
                        aadhaarData.setLastName(nameParts[nameParts.length - 1]);
                    } else {
                        aadhaarData.setFirstName(fullName);
                        aadhaarData.setLastName("");
                    }
                }

                // Extract date of birth - QuickeKYC uses 'dob' in data object
                if (dataObject.containsKey("dob")) {
                    aadhaarData.setDateOfBirth(dataObject.get("dob").toString());
                } else if (dataObject.containsKey("date_of_birth")) {
                    aadhaarData.setDateOfBirth(dataObject.get("date_of_birth").toString());
                }

                // Extract address from data object
                if (dataObject.containsKey("address")) {
                    Object addressObj = dataObject.get("address");
                    String addressStr;

                    if (addressObj instanceof Map) {
                        try {
                            Map<String, Object> addrMap = (Map<String, Object>) addressObj;
                            // Improved Address Parsing & Pincode Extraction
                            StringBuilder sb = new StringBuilder();
                            String extractedPincode = null;

                            // 1. Try to find pincode in address map (support multiple keys)
                            if (addrMap.containsKey("pincode")) extractedPincode = String.valueOf(addrMap.get("pincode"));
                            else if (addrMap.containsKey("pin")) extractedPincode = String.valueOf(addrMap.get("pin"));
                            else if (addrMap.containsKey("zip")) extractedPincode = String.valueOf(addrMap.get("zip"));
                            else if (addrMap.containsKey("zip_code")) extractedPincode = String.valueOf(addrMap.get("zip_code"));

                            // 2. If not found, look in root data object
                            if ((extractedPincode == null || extractedPincode.trim().isEmpty()) && dataObject != null) {
                                if (dataObject.containsKey("pincode")) extractedPincode = String.valueOf(dataObject.get("pincode"));
                                else if (dataObject.containsKey("pin")) extractedPincode = String.valueOf(dataObject.get("pin"));
                                else if (dataObject.containsKey("zip")) extractedPincode = String.valueOf(dataObject.get("zip"));
                                else if (dataObject.containsKey("zip_code")) extractedPincode = String.valueOf(dataObject.get("zip_code"));
                            }

                            // 3. Normalize Pincode (6 digits, numeric)
                            if (extractedPincode != null) {
                                // Remove all non-numeric characters
                                String rawPin = extractedPincode.replaceAll("[^0-9]", "");
                                if (!rawPin.isEmpty()) {
                                    // Handle leading zeros if relevant, though India pincodes validly start with digits.
                                    // Ensure it is 6 digits if possible. 
                                    if (rawPin.length() >= 6) {
                                        // Take the last 6 digits or first 6? Usually a pincode is just 6 digits. 
                                        // Use the whole thing if it looks reasonable, or trim if it has garbage.
                                        // Safest is to keep up to 6 digits if it looks like a standard pincode.
                                        // Let's keep the string as is after cleaning non-digits, but maybe trim to 6 if >6
                                        if (rawPin.length() > 6) rawPin = rawPin.substring(0, 6);
                                        extractedPincode = rawPin;
                                    } else {
                                        extractedPincode = rawPin; // Keep what we have even if short?
                                    }
                                } else {
                                    extractedPincode = null;
                                }
                            }

                            // Set Pincode in DTO
                            if (extractedPincode != null) {
                                aadhaarData.setPincode(extractedPincode);
                            }

                            // Build Address String
                            // Include specific fields in order
                            String[] validKeys = { "house", "landmark", "loc", "po", "subdist", "dist", "state" };
                            
                            for (String key : validKeys) {
                                if (addrMap.containsKey(key)) {
                                    Object val = addrMap.get(key);
                                    if (val != null) {
                                        String valStr = val.toString().trim();
                                        if (!valStr.isEmpty()) {
                                            if (sb.length() > 0) sb.append(", ");
                                            sb.append(valStr);
                                        }
                                    }
                                }
                            }

                            // ALWAYS append Pincode at the end of the address if found
                            if (extractedPincode != null) {
                                // Check if pincode is already in the string (unlikely given we excluded it from validKeys above)
                                if (sb.length() > 0) sb.append(" - "); // Use separator for pincode
                                sb.append(extractedPincode);
                            }

                            addressStr = sb.length() > 0 ? sb.toString() : addressObj.toString();
                        } catch (Exception e) {
                            logger.warn("Error parsing address map: {}", e.getMessage());
                            addressStr = addressObj.toString();
                        }
                    } else {
                        addressStr = addressObj.toString();
                    }
                    
                    // Final fallback if addressStr somehow doesn't have the pincode but we found it
                    if (aadhaarData.getPincode() != null && !addressStr.contains(aadhaarData.getPincode())) {
                         addressStr = addressStr + " - " + aadhaarData.getPincode();
                    }
                    
                    aadhaarData.setAddress(addressStr);

                    // Try to parse address components if available (for other fields)
                    if (dataObject.containsKey("care_of")) {
                        aadhaarData.setCareOf(dataObject.get("care_of").toString());
                    }
                    if (dataObject.containsKey("district")) {
                        aadhaarData.setDistrict(dataObject.get("district").toString());
                    }
                    if (dataObject.containsKey("state")) {
                        aadhaarData.setState(dataObject.get("state").toString());
                    }
                    // Pincode is already set above
                }

                otpResponse.setAadhaarData(aadhaarData);
                otpResponse.setVerified(true);
                otpResponse.setMessage("Aadhaar verified successfully");

                logger.info("OTP verified successfully");
                return otpResponse;

            } else {
                throw new BadRequestException("OTP verification failed. Please try again.");
            }

        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            String errorMessage = extractErrorMessage(responseBody);

            // Log error without exposing sensitive data
            logger.error("QuickeKYC API error - Status: {}, Error: {}", e.getStatusCode(),
                    errorMessage != null ? errorMessage : "Unknown error");

            // Differentiate error types for better user experience
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new BadRequestException(
                        "Authentication failed. Please verify the API key is correct and active.");
            } else if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                if (errorMessage != null) {
                    String lowerError = errorMessage.toLowerCase();
                    if (lowerError.contains("expired") || lowerError.contains("timeout")) {
                        throw new BadRequestException("OTP has expired. Please request a new OTP.");
                    } else if (lowerError.contains("invalid") || lowerError.contains("incorrect")) {
                        throw new BadRequestException("Invalid OTP. Please check and try again.");
                    } else if (lowerError.contains("request_id") || lowerError.contains("request id")) {
                        throw new BadRequestException("Invalid request ID. Please request a new OTP.");
                    }
                }
                throw new BadRequestException(
                        errorMessage != null ? errorMessage : "Invalid request. Please check your OTP and try again.");
            }

            throw new BadRequestException(
                    errorMessage != null ? errorMessage : "OTP verification failed. Please try again.");
        } catch (HttpServerErrorException e) {
            logger.error("Server error while submitting OTP: {}", e.getMessage());
            throw new BadRequestException(
                    "Aadhaar verification service is temporarily unavailable. Please try again later.");
        } catch (ResourceAccessException e) {
            logger.error("Network error while submitting OTP: {}", e.getMessage());
            throw new BadRequestException("Network error. Please check your internet connection and try again.");
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error while submitting OTP: {}", e.getMessage(), e);
            throw new BadRequestException("An unexpected error occurred. Please try again later.");
        }
    }

    /**
     * Extract error message from API response
     */
    private String extractErrorMessage(String responseBody) {
        try {
            if (responseBody == null || responseBody.trim().isEmpty()) {
                return null;
            }
            Map<String, Object> errorMap = objectMapper.readValue(responseBody, Map.class);
            if (errorMap.containsKey("message")) {
                return errorMap.get("message").toString();
            }
            if (errorMap.containsKey("error")) {
                return errorMap.get("error").toString();
            }
        } catch (Exception e) {
            logger.debug("Could not parse error message from response: {}", responseBody);
        }
        return null;
    }

    /**
     * Extract error message from response map
     */
    private String extractErrorMessage(Map<String, Object> responseBody) {
        if (responseBody.containsKey("message")) {
            return responseBody.get("message").toString();
        }
        if (responseBody.containsKey("error")) {
            return responseBody.get("error").toString();
        }
        return null;
    }
}
