import axios from "axios";

const SENDER_ID = process.env.SENDER_ID || "TFCTOR";

// Load multiple API keys from environment
const apiKeys = [
    process.env.TWOFACTOR_API_KEY_1,
    process.env.TWOFACTOR_API_KEY_2,
    process.env.TWOFACTOR_API_KEY_3
].filter(key => key); // Remove undefined keys

export async function sendOTPSms(mobileNumber, otp) {
    // Try each API key in sequence
    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const apiKey = apiKeys[i];
            console.log(`📡 Attempting to send OTP with API Key ${i + 1}/${apiKeys.length}`);
            
            // Construct 2Factor API URL
            const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobileNumber}/${otp}/${SENDER_ID}`;

            // Send GET request
            const { data } = await axios.get(url);

            console.log("📱 2Factor SMS Response:", data);

            if (data.Status !== "Success") {
                throw new Error(`2Factor Error: ${data.Details}`);
            }

            console.log(`✅ OTP sent successfully using API Key ${i + 1}`);
            return data;
        } catch (error) {
            console.error(`❌ API Key ${i + 1} failed:`, error.response?.data || error.message);
            
            // If this was the last key, throw the error
            if (i === apiKeys.length - 1) {
                throw new Error("❌ All SMS API keys failed");
            }
            
            // Otherwise, continue to the next key
            console.log(`🔄 Trying next API key...`);
        }
    }
};