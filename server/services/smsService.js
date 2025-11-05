import axios from "axios";

const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY || "5abdaef2-ba33-11f0-bdde-0200cd936042";
const SENDER_ID = process.env.SENDER_ID || "TFCTOR";

export async function sendOTPSms(mobileNumber, otp) {
    try {
        // Construct 2Factor API URL
        const url = `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/${mobileNumber}/${otp}/${SENDER_ID}`;

        // Send GET request
        const { data } = await axios.get(url);

        console.log("✅ 2Factor SMS Response:", data);

        if (data.Status !== "Success") {
            throw new Error(`2Factor Error: ${data.Details}`);
        }

        return data;
    } catch (error) {
        console.error("❌ Failed to send OTP via 2Factor:", error.response?.data || error.message);
        throw new Error("SMS sending failed");
    }
};