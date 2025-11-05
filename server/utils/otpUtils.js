import bcrypt from "bcryptjs";
import crypto from "crypto";

export const OTP_TTL = parseInt(process.env.OTP_TTL_SECONDS || "300", 10); // 5 minutes
export const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
export const OTP_RESEND_LIMIT = parseInt(process.env.OTP_RESEND_LIMIT || "20", 10);
export const RESEND_WINDOW = 3600; // 1 hour

export function generateOtp(length = 4) {
    const digits = "0123456789";
    let otp = "";
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % 10];
    }
    return otp;
};

export async function hashOtp(otp) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(otp, salt);
};

export async function compareOtp(plain, hashed) {
    return bcrypt.compare(plain, hashed);
};